// Task lifecycle — the SINGLE place tasks are created/closed, so the Rule 1
// invariant ("exactly one open action task per active lead") holds everywhere.
// kind:'action' tasks drive nextAction/nextActionDate; kind:'reminder' tasks
// are future-dated sends the sweep delivers (M5) and do NOT count for Rule 1.
import { Task } from '../models/Task.js';
import { TASK_DEFS } from '../workflow/workflow.config.js';

export async function closeOpenActionTasks(leadId, status = 'done') {
  await Task.updateMany(
    { lead: leadId, kind: 'action', status: 'open' },
    { $set: { status, completedAt: new Date() } },
  );
}

// Create the open action task for a lead and mirror it into the lead's
// nextAction cache. Mutates `lead` (caller persists) and returns the task.
export async function createActionTask(lead, type, dueDate, { title } = {}) {
  const taskTitle = title || TASK_DEFS[type] || 'Next action';
  const task = await Task.create({
    lead: lead._id,
    owner: lead.owner,
    title: taskTitle,
    type,
    kind: 'action',
    dueDate,
    stageAtCreation: lead.stage,
  });
  lead.nextAction = taskTitle;
  lead.nextActionDate = dueDate;
  return task;
}

// Close any open action task, then open the new one (Rule 1).
export async function syncOpenTask(lead, type, dueDate, opts = {}) {
  await closeOpenActionTasks(lead._id);
  return createActionTask(lead, type, dueDate, opts);
}

// Terminal moves: cancel the open action task and clear the next-action cache.
export async function clearNextAction(lead) {
  await closeOpenActionTasks(lead._id, 'cancelled');
  lead.nextAction = '';
  lead.nextActionDate = null;
}

// Future-dated reminder send (M5 sweep delivers it). Not an action task.
export async function createReminderTask(lead, { type, channel, dueDate, title }) {
  return Task.create({
    lead: lead._id,
    owner: lead.owner,
    title: title || TASK_DEFS[type] || 'Reminder',
    type,
    kind: 'reminder',
    channel,
    dueDate,
    stageAtCreation: lead.stage,
  });
}

export async function getOpenActionTask(leadId) {
  return Task.findOne({ lead: leadId, kind: 'action', status: 'open' }).lean();
}

export default {
  closeOpenActionTasks,
  createActionTask,
  syncOpenTask,
  clearNextAction,
  createReminderTask,
  getOpenActionTask,
};
