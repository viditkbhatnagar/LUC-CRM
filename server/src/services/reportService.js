// Reports — all computed with MongoDB aggregation pipelines (server-side,
// never loading leads into JS). RBAC: counsellors are scoped to owner=self;
// managers/admin see everything (05). Stage labels/maxAge come from config.
import { Lead } from '../models/Lead.js';
import { Task } from '../models/Task.js';
import { STAGES, EXIT_REASONS } from '../workflow/workflow.config.js';

const STAGE_INDEX_QUALIFIED = 3; // qualified
const STAGE_INDEX_MEETING = 5; // meeting_scheduled
const OFFER_STAGES = ['offer_sent', 'offer_accepted_docs_pending'];

// Counsellors see only their own slice.
function scope(user) {
  return user.role === 'counsellor' ? { owner: user._id } : {};
}
const n = (arr) => arr?.[0]?.n || 0;

// $switch mapping a lead's stage → its maxAgeMs (for stage-aging "stuck").
const MAX_AGE_SWITCH = {
  $switch: {
    branches: STAGES.filter((s) => s.maxAgeMs != null).map((s) => ({
      case: { $eq: ['$stage', s.slug] },
      then: s.maxAgeMs,
    })),
    default: Number.MAX_SAFE_INTEGER,
  },
};

export async function kpis(user) {
  const match = scope(user);
  const now = new Date();
  const [f] = await Lead.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'n' }],
        active: [{ $match: { lifecycleStatus: 'open' } }, { $count: 'n' }],
        won: [{ $match: { lifecycleStatus: 'won' } }, { $count: 'n' }],
        lost: [{ $match: { lifecycleStatus: 'lost' } }, { $count: 'n' }],
        onHold: [{ $match: { lifecycleStatus: 'on_hold' } }, { $count: 'n' }],
        qualifiedPlus: [{ $match: { maxStageReachedIndex: { $gte: STAGE_INDEX_QUALIFIED } } }, { $count: 'n' }],
        meetings: [{ $match: { maxStageReachedIndex: { $gte: STAGE_INDEX_MEETING } } }, { $count: 'n' }],
        offersOut: [{ $match: { lifecycleStatus: 'open', stage: { $in: OFFER_STAGES } } }, { $count: 'n' }],
        overdue: [{ $match: { lifecycleStatus: 'open', nextActionDate: { $lt: now } } }, { $count: 'n' }],
      },
    },
  ]);
  const total = n(f.total);
  const won = n(f.won);
  return {
    total,
    active: n(f.active),
    qualifiedPlus: n(f.qualifiedPlus),
    meetings: n(f.meetings),
    offersOut: n(f.offersOut),
    won,
    lost: n(f.lost),
    onHold: n(f.onHold),
    overdue: n(f.overdue),
    winRate: total ? Math.round((won / total) * 100) : 0,
  };
}

export async function sourcePerformance(user) {
  const rows = await Lead.aggregate([
    { $match: scope(user) },
    {
      $group: {
        _id: '$source',
        leads: { $sum: 1 },
        admissions: { $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'won'] }, 1, 0] } },
      },
    },
    { $sort: { leads: -1 } },
  ]);
  return rows
    .filter((r) => r._id)
    .map((r) => ({
      source: r._id,
      leads: r.leads,
      admissions: r.admissions,
      conversionPct: r.leads ? Math.round((r.admissions / r.leads) * 100) : 0,
    }));
}

export async function funnel(user) {
  // Live counts across all 13 stages (open + won; exited leads have left).
  const counts = await Lead.aggregate([
    { $match: { ...scope(user), lifecycleStatus: { $in: ['open', 'won'] } } },
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ]);
  const byStage = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  return STAGES.map((s) => ({ stage: s.slug, label: s.label, count: byStage[s.slug] || 0 }));
}

export async function counsellorPerformance() {
  // Manager-only report (route enforces); groups every counsellor.
  const now = new Date();
  const rows = await Lead.aggregate([
    {
      $group: {
        _id: '$owner',
        assigned: { $sum: 1 },
        meetings: { $sum: { $cond: [{ $gte: ['$maxStageReachedIndex', STAGE_INDEX_MEETING] }, 1, 0] } },
        offers: { $sum: { $cond: [{ $gte: ['$maxStageReachedIndex', 8] }, 1, 0] } },
        admissions: { $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'won'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$lifecycleStatus', 'open'] }, { $lt: ['$nextActionDate', now] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $project: { counsellor: '$u.name', role: '$u.role', assigned: 1, meetings: 1, offers: 1, admissions: 1, overdue: 1 } },
    { $sort: { admissions: -1, assigned: -1 } },
  ]);
  return rows;
}

export async function stageAging(user) {
  const rows = await Lead.aggregate([
    { $match: { ...scope(user), lifecycleStatus: 'open' } },
    {
      $project: {
        stage: 1,
        stuck: { $cond: [{ $gt: [{ $subtract: ['$$NOW', '$stageEnteredAt'] }, MAX_AGE_SWITCH] }, 1, 0] },
      },
    },
    { $group: { _id: '$stage', open: { $sum: 1 }, stuckCount: { $sum: '$stuck' } } },
  ]);
  const byStage = Object.fromEntries(rows.map((r) => [r._id, r]));
  return STAGES.filter((s) => s.slug !== 'admission_won').map((s) => {
    const r = byStage[s.slug] || { open: 0, stuckCount: 0 };
    return {
      stage: s.slug,
      label: s.label,
      open: r.open,
      maxAge: s.maxAge,
      stuckCount: r.stuckCount,
      flag: r.stuckCount > 0 ? 'stuck' : 'healthy',
    };
  });
}

// Recommended-fix map (05 — carried from the demo).
const FIX = {
  lost_not_interested: 'Improve qualification & nurturing',
  lost_price_budget: 'Offer plans/scholarships earlier',
  lost_not_eligible: 'Tighten lead-source targeting',
  lost_not_reachable: 'Faster speed-to-lead',
  lost_competitor: 'Sharpen recognition/ROI proof',
  no_show: 'Stronger reminders & confirmation',
  deferred_future_intake: 'Nurture to next intake',
  duplicate_lead: 'Dedupe at capture',
  invalid_lead: 'Validate contact fields',
};

export async function lostReasons(user) {
  const rows = await Lead.aggregate([
    { $match: { ...scope(user), lifecycleStatus: { $in: ['lost', 'on_hold'] }, exitReason: { $ne: null } } },
    { $group: { _id: '$exitReason', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const labels = Object.fromEntries(EXIT_REASONS.map((e) => [e.slug, e.label]));
  return rows.map((r) => ({
    reason: r._id,
    label: labels[r._id] || r._id,
    count: r.count,
    recommendedFix: FIX[r._id] || '',
  }));
}

// Rule 1 health: open leads with no open action task — should be 0.
export async function rule1Check(user) {
  const openLeads = await Lead.find({ ...scope(user), lifecycleStatus: 'open' }).select('_id').lean();
  const ids = openLeads.map((l) => l._id);
  const withTask = await Task.distinct('lead', { lead: { $in: ids }, kind: 'action', status: 'open' });
  const withTaskSet = new Set(withTask.map(String));
  const leadsWithNoTask = ids.filter((id) => !withTaskSet.has(String(id))).length;
  return { leadsWithNoTask };
}

export default {
  kpis,
  sourcePerformance,
  funnel,
  counsellorPerformance,
  stageAging,
  lostReasons,
  rule1Check,
};
