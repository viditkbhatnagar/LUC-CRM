// Notifications + escalations. Idempotency comes from the unique dedupeKey
// index: the same breach/event can't notify the same user twice (so the sweep
// is safe to run repeatedly).
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

// Create one notification; if a dedupeKey collides it's a no-op (idempotent).
export async function notify({ user, type, message, lead = null, dedupeKey = null }) {
  try {
    return await Notification.create({ user, type, message, lead, dedupeKey });
  } catch (err) {
    if (err?.code === 11000) return null; // duplicate dedupeKey → already notified
    throw err;
  }
}

// Notify the lead owner and every active manager (team_lead/admin), once each.
export async function notifyOwnerAndManagers(lead, { type, message, dedupeBase }) {
  const managers = await User.find({ role: { $in: ['team_lead', 'admin'] }, active: true })
    .select('_id')
    .lean();
  const recipients = new Map();
  if (lead.owner) recipients.set(String(lead.owner), lead.owner);
  managers.forEach((m) => recipients.set(String(m._id), m._id));

  let created = 0;
  for (const [uid, userId] of recipients) {
    const n = await notify({
      user: userId,
      type,
      message,
      lead: lead._id,
      dedupeKey: dedupeBase ? `${dedupeBase}:${uid}` : null,
    });
    if (n) created += 1;
  }
  return created;
}

export async function listNotifications(userId, { unreadOnly = false } = {}) {
  const filter = { user: userId };
  if (unreadOnly) filter.read = false;
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  return { notifications, unread };
}

export async function markRead(id, userId) {
  await Notification.updateOne({ _id: id, user: userId }, { $set: { read: true } });
}

export async function markAllRead(userId) {
  await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
}

export default { notify, notifyOwnerAndManagers, listNotifications, markRead, markAllRead };
