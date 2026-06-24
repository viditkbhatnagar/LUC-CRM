// Automation engine (06). Runs onCreate/onEntry/onExit side-effect handlers
// from workflow.config. The Rule-1 ACTION task + SLA are owned by
// transitionService/leadService; this engine owns messaging, scheduled
// reminders (kind:'reminder' tasks), doc checklists and notifications. Every
// automated effect writes an 'automation' activity so the timeline shows it.
import { STAGES, LIFECYCLE_AUTOMATIONS, TIME } from '../workflow/workflow.config.js';
import { stageBySlug } from '../workflow/stateMachine.js';
import { send, channelForConsent } from '../adapters/messaging.js';
import { createReminderTask } from './taskService.js';
import { logActivity } from './activityService.js';
import { notifyOwnerAndManagers } from './notificationService.js';
import { Task } from '../models/Task.js';

const STAGE_BY_SLUG = Object.fromEntries(STAGES.map((s) => [s.slug, s]));

function handlersFor(lead, event) {
  if (event === 'create') return LIFECYCLE_AUTOMATIONS.onCreate;
  if (event === 'entry') return STAGE_BY_SLUG[lead.stage]?.onEntry || [];
  if (event === 'exit') return lead.lifecycleStatus === 'lost' ? LIFECYCLE_AUTOMATIONS.onExitLost : [];
  return [];
}

const auto = (lead, message, meta) =>
  logActivity(lead._id, { type: 'automation', message, actorLabel: 'automation', meta });

async function sendAndLog(lead, template, label) {
  const channel = channelForConsent(lead.consent) || 'whatsapp';
  await send({ channel, to: lead.whatsapp || lead.phone || lead.email, template, leadId: String(lead._id) });
  await auto(lead, `${label} via ${channel}`, { template });
}

// "name:arg" handlers. createTask:* / first_contact are owned elsewhere (skip).
async function runHandler(spec, lead) {
  const [name, arg] = spec.split(':');

  switch (name) {
    case 'createTask':
      return; // Rule-1 action task handled by transition/lead service

    case 'acknowledge':
      return sendAndLog(lead, 'acknowledgement', 'Acknowledgement sent');
    case 'sendConfirmation':
      return sendAndLog(lead, 'meeting_confirmation', 'Meeting confirmation sent');
    case 'sendOffer':
      return sendAndLog(lead, 'offer', 'Offer sent');
    case 'sendPaymentReminder':
      return sendAndLog(lead, 'payment_reminder', 'Payment reminder sent');

    case 'scheduleReminder': {
      // 24h / 2h before the meeting (skip if no meeting date or it's in the past)
      if (!lead.meetingDate) return;
      const offset = arg === '2h' ? 2 * TIME.HOUR : 24 * TIME.HOUR;
      const dueDate = new Date(new Date(lead.meetingDate).getTime() - offset);
      if (dueDate.getTime() <= Date.now()) return;
      await createReminderTask(lead, {
        type: 'meeting_prep',
        channel: channelForConsent(lead.consent) || 'whatsapp',
        dueDate,
        title: `Meeting reminder (${arg} before)`,
      });
      return auto(lead, `Scheduled meeting reminder ${arg} before`);
    }

    case 'scheduleFollowups': {
      // Day 1/3/7 offer follow-ups as future-dated reminder sends.
      const days = (arg || '1,3,7').split(',').map(Number);
      for (const d of days) {
        await createReminderTask(lead, {
          type: 'offer_follow_up',
          channel: channelForConsent(lead.consent) || 'whatsapp',
          dueDate: new Date(Date.now() + d * TIME.DAY),
          title: `Offer follow-up (Day ${d})`,
        });
      }
      return auto(lead, `Scheduled offer follow-ups (Day ${days.join('/')})`);
    }

    case 'generateDocChecklist': {
      if (!lead.docsRequested || lead.docsRequested.length === 0) {
        lead.docsRequested = ['Passport', 'Degree', 'CV', 'ID'];
        lead.missingDocs = [...lead.docsRequested];
      }
      return auto(lead, `Document checklist generated (${lead.docsRequested.join(', ')})`);
    }

    case 'notifyOnboarding':
      await notifyOwnerAndManagers(lead, {
        type: 'system',
        message: `Admission won — ${lead.leadCode} handed to onboarding`,
        dedupeBase: `onboarding:${lead._id}`,
      });
      return auto(lead, 'Admissions / onboarding notified');

    case 'stopFollowups': {
      // Marking lost stops scheduled follow-ups (no further reminder sends).
      const res = await Task.updateMany(
        { lead: lead._id, kind: 'reminder', status: 'open', sentAt: null },
        { $set: { status: 'cancelled' } },
      );
      return auto(lead, `Active follow-ups stopped (${res.modifiedCount} pending)`);
    }

    default:
      return; // unknown handler → ignore
  }
}

export async function runAutomations(lead, event, _ctx = {}) {
  const handlers = handlersFor(lead, event);
  for (const spec of handlers) {
    // eslint-disable-next-line no-await-in-loop
    await runHandler(spec, lead);
  }
  // Persist any field changes a handler made (e.g. doc checklist).
  if (lead.isModified && lead.isModified()) await lead.save();
  return handlers;
}

export default { runAutomations };
