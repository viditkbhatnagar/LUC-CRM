import mongoose from 'mongoose';
import { ENUMS } from '../workflow/workflow.config.js';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ENUMS.notificationTypes, required: true },
    message: { type: String, required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    read: { type: Boolean, default: false },
    // dedupe key for idempotent sweep (e.g. `sla_breach:<leadId>:<stage>`)
    dedupeKey: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
// Unique-when-present guard so the sweep never double-notifies the same breach.
notificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

notificationSchema.set('toJSON', { virtuals: true });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
