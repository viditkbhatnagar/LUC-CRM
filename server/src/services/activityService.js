// Append-only activity log (03 §4 · audit trail). The ONLY writer of
// activities. Never updates or deletes them.
import { Activity } from '../models/Activity.js';

// actor may be a User doc, an id, or null (system/automation).
export async function logActivity(leadId, { type, message, meta, actor = null, actorLabel }) {
  const actorId = actor && actor._id ? actor._id : actor || null;
  const label = actorLabel || (actor?.name ? actor.name : actorId ? undefined : 'system');
  return Activity.create({ lead: leadId, type, message, meta, actor: actorId, actorLabel: label });
}

export async function getActivities(leadId, { limit = 50, page = 1 } = {}) {
  const skip = (page - 1) * limit;
  return Activity.find({ lead: leadId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
}

export default { logActivity, getActivities };
