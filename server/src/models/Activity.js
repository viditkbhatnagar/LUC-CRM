import mongoose from 'mongoose';
import { ENUMS } from '../workflow/workflow.config.js';

// Append-only timeline + audit log (03 §4). NEVER update or delete these.
const activitySchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    type: { type: String, enum: ENUMS.activityTypes, required: true },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed }, // { from, to, ruleKey, ... }
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorLabel: { type: String }, // 'system' | 'automation' | user name snapshot
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ lead: 1, createdAt: -1 });

activitySchema.set('toJSON', { virtuals: true });

export const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
