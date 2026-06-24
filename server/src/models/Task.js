import mongoose from 'mongoose';
import { ENUMS, STAGES } from '../workflow/workflow.config.js';

const STAGE_SLUGS = STAGES.map((s) => s.slug);

// A lead has at most ONE open task of kind:'action' at a time (Rule 1).
// kind:'reminder' tasks are future-dated sends the sweep delivers when due
// (they do NOT count toward the one-open-action-task invariant).
const taskSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ENUMS.taskTypes, required: true },
    kind: { type: String, enum: ENUMS.taskKinds, default: 'action' },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['open', 'done', 'cancelled'], default: 'open' },
    stageAtCreation: { type: String, enum: STAGE_SLUGS },
    // reminder bookkeeping (idempotent sweep): null until "sent"
    channel: { type: String }, // email | whatsapp | sms (reminders)
    sentAt: { type: Date, default: null },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes (03 §3)
taskSchema.index({ owner: 1, status: 1, dueDate: 1 });
taskSchema.index({ lead: 1, status: 1 });
taskSchema.index({ status: 1, dueDate: 1 }); // overdue / reminder sweep
taskSchema.index({ kind: 1, status: 1, sentAt: 1 }); // reminder dispatch

taskSchema.set('toJSON', { virtuals: true });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
