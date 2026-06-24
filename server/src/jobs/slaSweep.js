// Render Cron entrypoint — runs every 15 min (09 render.yaml). Idempotent:
//  1. surface overdue tasks (derived; no writes)
//  2. flip slaBreached once + notify owner & managers (dedupeKey → no double)
//  3. deliver due reminder sends, mark sentAt (won't resend)
//  4. payment-due alerts at payment_pending
import { connectDb, disconnectDb } from '../config/db.js';
import { Lead } from '../models/Lead.js';
import { Task } from '../models/Task.js';
import { logActivity } from '../services/activityService.js';
import { notifyOwnerAndManagers } from '../services/notificationService.js';
import { send } from '../adapters/messaging.js';
import { stageBySlug } from '../workflow/stateMachine.js';

export async function runSweep(now = new Date()) {
  const summary = { overdue: 0, breaches: 0, reminders: 0, paymentDue: 0 };

  // 1. Overdue open tasks (derived metric for dashboards; no state change).
  summary.overdue = await Task.countDocuments({
    status: 'open',
    kind: 'action',
    dueDate: { $lt: now },
  });

  // 2. SLA breaches — flip once, notify once.
  const breaching = await Lead.find({
    lifecycleStatus: 'open',
    slaBreached: false,
    slaDueAt: { $ne: null, $lt: now },
  });
  for (const lead of breaching) {
    lead.slaBreached = true;
    await lead.save();
    const label = stageBySlug(lead.stage)?.label || lead.stage;
    await logActivity(lead._id, {
      type: 'system',
      message: `SLA breached at ${label}`,
      actorLabel: 'system',
      meta: { stage: lead.stage },
    });
    await notifyOwnerAndManagers(lead, {
      type: 'sla_breach',
      message: `SLA breach — ${lead.leadCode} (${lead.name}) at ${label}`,
      dedupeBase: `sla_breach:${lead._id}:${lead.stage}`,
    });
    summary.breaches += 1;
  }

  // 3. Due reminder sends (Day 1/3/7, meeting reminders) — deliver once.
  const dueReminders = await Task.find({
    kind: 'reminder',
    status: 'open',
    sentAt: null,
    dueDate: { $lte: now },
  }).populate('lead');
  for (const task of dueReminders) {
    const lead = task.lead;
    if (!lead || lead.lifecycleStatus !== 'open') {
      // lead exited (e.g. lost) → cancel the scheduled send (stopFollowups also does this)
      task.status = 'cancelled';
      await task.save();
      continue;
    }
    await send({
      channel: task.channel || 'whatsapp',
      to: lead.whatsapp || lead.phone || lead.email,
      template: task.type,
      leadId: String(lead._id),
    });
    task.sentAt = now;
    task.status = 'done';
    await task.save();
    await logActivity(lead._id, {
      type: 'automation',
      message: `Sent "${task.title}"`,
      actorLabel: 'automation',
      meta: { taskId: String(task._id) },
    });
    summary.reminders += 1;
  }

  // 4. Payment-due alerts.
  const overduePayments = await Lead.find({
    lifecycleStatus: 'open',
    stage: 'payment_pending',
    'payment.status': { $ne: 'paid' },
    'payment.dueDate': { $ne: null, $lt: now },
  });
  for (const lead of overduePayments) {
    const day = new Date(lead.payment.dueDate).toISOString().slice(0, 10);
    const created = await notifyOwnerAndManagers(lead, {
      type: 'payment_due',
      message: `Payment overdue — ${lead.leadCode} (${lead.name})`,
      dedupeBase: `payment_due:${lead._id}:${day}`,
    });
    if (created) {
      await logActivity(lead._id, {
        type: 'system',
        message: 'Payment overdue — escalated',
        actorLabel: 'system',
      });
      summary.paymentDue += 1;
    }
  }

  return summary;
}

// Run directly (node server/src/jobs/slaSweep.js / Render cron).
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await connectDb();
    const summary = await runSweep();
    // eslint-disable-next-line no-console
    console.log('[sla-sweep]', JSON.stringify(summary));
    await disconnectDb();
    process.exit(0);
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[sla-sweep] failed:', err);
    process.exit(1);
  });
}
