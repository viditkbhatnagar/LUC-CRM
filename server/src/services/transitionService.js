/**
 * transitionService.move() — THE single guarded path for every stage/status
 * change (04 §4). No other code edits lead.stage. Fixed step order:
 *   resolve action → RBAC/ownership → apply payload → required-field gate (Rule 2)
 *   → hard gate (docs/closure) → terminal+reason (Rule 3) → apply state
 *   → close/open task (Rule 1) → recompute SLA → audit (Activity + StageTransition).
 * On-entry automations (messaging/reminders/notifications) are layered in M5;
 * the action-task + SLA bookkeeping here is what keeps Rule 1 & Rule 5 true.
 */
import { Lead } from '../models/Lead.js';
import { StageTransition } from '../models/StageTransition.js';
import { TIME, STAGE_ACTION_TASK } from '../workflow/workflow.config.js';
import {
  resolveAction,
  resolveTerminalAction,
  checkRequiredFields,
  GATE_PREDICATES,
  stageBySlug,
  stageIndex,
  exitReasonBySlug,
  computeScore,
  WON_SLUG,
} from '../workflow/stateMachine.js';
import { applyPayload } from '../workflow/payload.js';
import { computeDueAt } from './slaService.js';
import { syncOpenTask, createActionTask, closeOpenActionTasks, clearNextAction } from './taskService.js';
import { logActivity } from './activityService.js';
import { generateAdmissionId, generateReceiptNo } from './counterService.js';
import { runAutomations } from './automationEngine.js';
import { NotFound, Forbidden, Unprocessable, IllegalTransition } from '../lib/errors.js';

const label = (slug) => stageBySlug(slug)?.label || slug;

async function writeTransition(lead, ctx, { toStage, toStatus, exitReason = null }) {
  await StageTransition.create({
    lead: lead._id,
    fromStage: ctx.prevStage,
    toStage,
    fromStatus: ctx.prevStatus,
    toStatus,
    exitReason,
    actor: ctx.actor?._id || null,
    reason: ctx.reason || null,
    msInPreviousStage: Math.max(0, ctx.now.getTime() - new Date(ctx.prevEnteredAt).getTime()),
  });
}

export async function move(leadId, { action, payload = {}, exitReason = null, reason = null }, actor) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw NotFound('Lead not found');

  // Ownership (counsellors act only on their own leads; managers/admin on any).
  const isManager = actor.role === 'team_lead' || actor.role === 'admin';
  if (!isManager && String(lead.owner) !== String(actor._id)) {
    throw Forbidden('You can only act on your own leads');
  }

  const ctx = {
    prevStage: lead.stage,
    prevStatus: lead.lifecycleStatus,
    prevEnteredAt: lead.stageEnteredAt || lead.createdAt || new Date(),
    now: new Date(),
    actor,
    reason,
  };

  // Terminal lead → only reopen/reactivate.
  if (lead.lifecycleStatus !== 'open') {
    const term = resolveTerminalAction(lead.lifecycleStatus, lead.exitReason, action);
    if (!term) {
      throw IllegalTransition(`Action "${action}" is not allowed on a ${lead.lifecycleStatus} lead`);
    }
    return reopenLead(lead, ctx);
  }

  const resolved = resolveAction(lead.stage, action);
  if (!resolved) throw IllegalTransition(`Action "${action}" is not allowed from ${lead.stage}`);

  switch (resolved.kind) {
    case 'forward':
    case 'branch':
      return advanceLead(lead, resolved, payload, ctx);
    case 'back':
      return backLead(lead, resolved, ctx);
    case 'exit':
      return exitLead(lead, exitReason, ctx);
    case 'no_show':
    case 'defer':
      return onHoldLead(lead, resolved, ctx);
    default:
      throw IllegalTransition(`Unsupported transition kind "${resolved.kind}"`);
  }
}

// ── Forward / branch advance ──────────────────────────────────────────────
async function advanceLead(lead, resolved, payload, ctx) {
  // Apply gate-field payload (strict; unknown/forbidden → 422).
  applyPayload(lead, lead.stage, payload);

  // Rule 2 — required fields for the SOURCE stage.
  const { ok, missing } = checkRequiredFields(lead, lead.stage);
  if (!ok) throw Unprocessable('Required fields are missing for this stage', { missing });

  // Hard gate (docsVerified / closure) — value-equality, payload-proof.
  if (resolved.gate) {
    const pred = GATE_PREDICATES[resolved.gate];
    if (pred && !pred.test(lead)) throw Unprocessable(pred.message, { gate: resolved.gate });
  }

  const toStage = resolved.to;
  lead.stage = toStage;
  lead.stageEnteredAt = ctx.now;
  lead.maxStageReachedIndex = Math.max(lead.maxStageReachedIndex || 0, stageIndex(toStage));
  lead.score = computeScore({
    source: lead.source,
    interest: lead.interest,
    stage: toStage,
    confidence: lead.confidence,
  });

  if (toStage === WON_SLUG) {
    await closeWon(lead, ctx);
  } else {
    // Seed payment tracking when entering Payment Pending (06: due-date alert).
    if (toStage === 'payment_pending') {
      lead.payment = lead.payment || {};
      if (!lead.payment.dueDate) lead.payment.dueDate = new Date(ctx.now.getTime() + 7 * TIME.DAY);
      if (!lead.payment.status || lead.payment.status === 'none') lead.payment.status = 'pending';
    }
    lead.slaDueAt = computeDueAt(toStage, ctx.now, lead);
    const taskType = STAGE_ACTION_TASK[toStage];
    if (taskType) await syncOpenTask(lead, taskType, lead.slaDueAt);
  }

  lead.lastActivityAt = ctx.now;
  await lead.save();

  await writeTransition(lead, ctx, { toStage, toStatus: lead.lifecycleStatus });
  await logActivity(lead._id, {
    type: 'stage_change',
    message: `Stage moved to ${label(toStage)}`,
    actor: ctx.actor,
    actorLabel: ctx.actor?.name,
    meta: { from: ctx.prevStage, to: toStage },
  });

  // On-entry automations (M5: messaging, reminders, notifications).
  await runAutomations(lead, 'entry', { actor: ctx.actor, fromStage: ctx.prevStage });
  return lead;
}

async function closeWon(lead, ctx) {
  // Closure gate (defensive double-check; resolved.gate already enforced it).
  if (!(lead.docsVerified === true && lead.payment?.status === 'paid')) {
    throw Unprocessable('Blocked — verify documents and confirm payment first.', { gate: 'closure' });
  }
  lead.lifecycleStatus = 'won';
  lead.stage = WON_SLUG;
  lead.admissionId = await generateAdmissionId();
  lead.receiptNo = await generateReceiptNo();
  lead.onboardingStatus = lead.onboardingStatus || 'Welcome email sent';
  lead.slaDueAt = null;
  lead.slaBreached = false;
  await clearNextAction(lead); // stop SLA / no further action task

  await logActivity(lead._id, {
    type: 'onboarding_handoff',
    message: `Admission won — ${lead.admissionId} / ${lead.receiptNo}; handed to onboarding`,
    actor: ctx.actor,
    actorLabel: ctx.actor?.name,
    meta: { admissionId: lead.admissionId, receiptNo: lead.receiptNo },
  });
}

// ── Backward navigation (one step; no gate; no onEntry automations) ────────
async function backLead(lead, resolved, ctx) {
  const toStage = resolved.to;
  lead.stage = toStage;
  lead.stageEnteredAt = ctx.now;
  lead.slaDueAt = computeDueAt(toStage, ctx.now, lead);
  const taskType = STAGE_ACTION_TASK[toStage];
  if (taskType) await syncOpenTask(lead, taskType, lead.slaDueAt);
  lead.lastActivityAt = ctx.now;
  await lead.save();

  await writeTransition(lead, ctx, { toStage, toStatus: 'open' });
  await logActivity(lead._id, {
    type: 'stage_change',
    message: `Moved back to ${label(toStage)}`,
    actor: ctx.actor,
    actorLabel: ctx.actor?.name,
    meta: { from: ctx.prevStage, to: toStage, backward: true },
  });
  return lead;
}

// ── Exit to a lost terminal (Rule 3 mandatory reason) ──────────────────────
async function exitLead(lead, exitReason, ctx) {
  if (!exitReason) throw Unprocessable('An exit reason is required', { field: 'exitReason' });
  const er = exitReasonBySlug(exitReason);
  if (!er || er.bucket !== 'lost') {
    throw Unprocessable('Invalid exit reason', { exitReason });
  }
  lead.lifecycleStatus = 'lost';
  lead.exitReason = exitReason; // stage retained (last active)
  lead.slaDueAt = null;
  lead.slaBreached = false;
  await clearNextAction(lead);
  lead.lastActivityAt = ctx.now;
  await lead.save();

  await writeTransition(lead, ctx, { toStage: lead.stage, toStatus: 'lost', exitReason });
  await logActivity(lead._id, {
    type: 'stage_change',
    message: `Lead marked lost — ${er.label}${ctx.reason ? `: ${ctx.reason}` : ''}`,
    actor: ctx.actor,
    actorLabel: ctx.actor?.name,
    meta: { exitReason, from: ctx.prevStage },
  });

  await runAutomations(lead, 'exit', { actor: ctx.actor, exitReason });
  return lead;
}

// ── On-hold (no_show / defer) — keeps a forward path via a recovery task ───
async function onHoldLead(lead, resolved, ctx) {
  const exitReason = resolved.exitReason;
  const er = exitReasonBySlug(exitReason);
  lead.lifecycleStatus = 'on_hold';
  lead.exitReason = exitReason;
  lead.slaDueAt = null;
  lead.slaBreached = false;

  await closeOpenActionTasks(lead._id);
  const due = new Date(ctx.now.getTime() + resolved.task.dueInDays * TIME.DAY);
  await createActionTask(lead, resolved.task.type, due, { title: resolved.task.title });

  lead.lastActivityAt = ctx.now;
  await lead.save();

  await writeTransition(lead, ctx, { toStage: lead.stage, toStatus: 'on_hold', exitReason });
  await logActivity(lead._id, {
    type: 'stage_change',
    message: `Lead set on hold — ${er?.label || exitReason}; "${resolved.task.title}" due in ${resolved.task.dueInDays}d`,
    actor: ctx.actor,
    actorLabel: ctx.actor?.name,
    meta: { exitReason, from: ctx.prevStage },
  });
  return lead;
}

// ── Reopen / reactivate from a terminal → New Lead (preserves furthest progress)
async function reopenLead(lead, ctx) {
  lead.stage = 'new_lead';
  lead.lifecycleStatus = 'open';
  lead.exitReason = null;
  lead.stageEnteredAt = ctx.now;
  lead.slaDueAt = computeDueAt('new_lead', ctx.now);
  lead.slaBreached = false;
  lead.score = computeScore({
    source: lead.source,
    interest: lead.interest,
    stage: 'new_lead',
    confidence: lead.confidence,
  });
  await syncOpenTask(lead, 'first_contact', lead.slaDueAt);
  lead.lastActivityAt = ctx.now;
  await lead.save();

  await writeTransition(lead, ctx, { toStage: 'new_lead', toStatus: 'open' });
  await logActivity(lead._id, {
    type: 'stage_change',
    message: 'Lead reopened as New Lead',
    actor: ctx.actor,
    actorLabel: ctx.actor?.name,
    meta: { from: ctx.prevStage, reopenedFrom: ctx.prevStatus },
  });
  return lead;
}

export default { move };
