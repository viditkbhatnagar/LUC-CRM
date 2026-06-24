// Lead core: capture (normalize + dedupe + assign + score + first task), RBAC-
// scoped listing, read, and non-stage updates. Stage/status changes NEVER
// happen here — they go through transitionService.move() (M4).
import { Lead } from '../models/Lead.js';
import { User } from '../models/User.js';
import { normalizePhone, normalizeEmail } from '../lib/normalize.js';
import { computeScore } from '../workflow/stateMachine.js';
import { generateLeadCode, nextAssignIndex } from './counterService.js';
import { computeDueAt } from './slaService.js';
import { createActionTask } from './taskService.js';
import { logActivity } from './activityService.js';
import { Conflict, NotFound, Forbidden } from '../lib/errors.js';

const MAX_LIMIT = 100;

// Round-robin owner assignment among active counsellors (deterministic).
export async function assignOwner(givenOwnerId) {
  if (givenOwnerId) return givenOwnerId;
  const counsellors = await User.find({ role: 'counsellor', active: true }).sort({ _id: 1 }).lean();
  if (!counsellors.length) throw new Error('No active counsellors to assign');
  const seq = await nextAssignIndex();
  return counsellors[seq % counsellors.length]._id;
}

// Rule 4 — find an existing lead matching normalized phone/whatsapp/email.
export async function findDuplicate(normPhone, normEmail) {
  if (!normPhone && !normEmail) return null;
  const or = [];
  if (normPhone) or.push({ normalizedPhone: normPhone });
  if (normEmail) or.push({ normalizedEmail: normEmail });
  return Lead.findOne({ $or: or }).lean();
}

export async function createLead(input, actor, { force = false } = {}) {
  const normalizedPhone = normalizePhone(input.whatsapp || input.phone);
  const normalizedEmail = normalizeEmail(input.email);

  // Dedupe (Rule 4). Admin may force-create, recording the link to the original.
  const dup = await findDuplicate(normalizedPhone, normalizedEmail);
  if (dup && !force) {
    throw Conflict('A lead with this phone or email already exists', { existingLead: dup });
  }

  const ownerId = await assignOwner(input.owner);
  const leadCode = await generateLeadCode();
  const now = new Date();
  const score = computeScore({ source: input.source, interest: input.interest, stage: 'new_lead' });
  const slaDueAt = computeDueAt('new_lead', now);

  const lead = await Lead.create({
    leadCode,
    name: input.name,
    phone: input.phone,
    whatsapp: input.whatsapp || input.phone,
    email: input.email,
    city: input.city,
    normalizedPhone,
    normalizedEmail,
    program: input.program,
    source: input.source,
    intake: input.intake,
    consent: input.consent || 'none',
    campaignNotes: input.campaignNotes,
    owner: ownerId,
    stage: 'new_lead',
    lifecycleStatus: 'open',
    stageEnteredAt: now,
    maxStageReachedIndex: 0,
    score,
    interest: input.interest,
    objection: input.objection || 'Not known yet',
    slaDueAt,
    lastActivityAt: now,
    duplicateOf: dup && force ? dup._id : null,
  });

  // Rule 1 — first-contact task + next-action cache (persist the cache).
  await createActionTask(lead, 'first_contact', slaDueAt);
  await lead.save();

  // Audit + acknowledgement (M5 routes acknowledge through the messaging adapter).
  await logActivity(lead._id, {
    type: 'system',
    message: `Lead created at New Lead (${leadCode})`,
    actor,
    actorLabel: actor?.name,
    meta: { duplicateOf: lead.duplicateOf || undefined },
  });
  await logActivity(lead._id, {
    type: 'automation',
    message: 'Acknowledgement sent to prospect',
    actorLabel: 'automation',
  });
  await logActivity(lead._id, {
    type: 'task',
    message: `First-contact task created — due ${slaDueAt.toISOString()}`,
    actorLabel: 'system',
  });

  return lead;
}

// Apply the counsellor-self scope for reads/writes.
function scopeFilter(user, base = {}) {
  if (user.role === 'counsellor') return { ...base, owner: user._id };
  return base;
}

export async function listLeads(query, user) {
  const filter = scopeFilter(user);
  if (query.status) filter.lifecycleStatus = query.status;
  if (query.stage) filter.stage = query.stage;
  if (query.source) filter.source = query.source;
  if (query.program) filter.program = query.program;
  // managers may filter by a specific owner; counsellors are already self-scoped
  if (query.owner && user.role !== 'counsellor') filter.owner = query.owner;
  if (query.overdue === 'true' || query.overdue === true) {
    filter.lifecycleStatus = 'open';
    filter.nextActionDate = { $lt: new Date() };
  }
  if (query.q) {
    const rx = new RegExp(String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { leadCode: rx }];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || 50));
  const sort = query.sort || '-createdAt';

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('owner', 'name email role')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return { leads, total, page, limit };
}

export async function getLeadById(id, user) {
  const lead = await Lead.findById(id).populate('owner', 'name email role').lean();
  if (!lead) throw NotFound('Lead not found');
  if (user.role === 'counsellor' && String(lead.owner?._id || lead.owner) !== String(user._id)) {
    throw Forbidden('You can only view your own leads');
  }
  return lead;
}

// Load a lead document with ownership enforced (for mutations).
export async function loadOwnedLead(id, user, { managerOnly = false } = {}) {
  const lead = await Lead.findById(id);
  if (!lead) throw NotFound('Lead not found');
  const isOwner = String(lead.owner) === String(user._id);
  const isManager = user.role === 'team_lead' || user.role === 'admin';
  if (managerOnly && !isManager) throw Forbidden('Requires team lead or admin');
  if (!isManager && !isOwner) throw Forbidden('You can only act on your own leads');
  return lead;
}

// Non-stage field updates (objection, confidence, interest, nextAction, offer/
// doc fields, etc.) + optional note → activity. Never touches stage/lifecycle.
const UPDATABLE = [
  'objection',
  'confidence',
  'interest',
  'nextAction',
  'nextActionDate',
  'offerAmount',
  'discount',
  'paymentPlan',
  'offerExpiry',
  'offerSentAt',
  'meetingDate',
  'docsRequested',
  'missingDocs',
  'campaignNotes',
  'intake',
  'city',
];

export async function updateLead(id, body, user) {
  const lead = await loadOwnedLead(id, user);

  for (const key of UPDATABLE) {
    if (body[key] !== undefined) lead[key] = body[key];
  }
  // Merge stageData rather than overwrite.
  if (body.stageData && typeof body.stageData === 'object') {
    lead.stageData = { ...(lead.stageData || {}), ...body.stageData };
    lead.markModified('stageData');
  }
  lead.lastActivityAt = new Date();
  await lead.save();

  if (body.note) {
    await logActivity(lead._id, {
      type: 'note',
      message: body.note,
      actor: user,
      actorLabel: user.name,
    });
  }
  return lead;
}

export default {
  assignOwner,
  findDuplicate,
  createLead,
  listLeads,
  getLeadById,
  loadOwnedLead,
  updateLead,
};
