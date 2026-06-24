import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, markRead, markAllRead } from '../services/notificationService.js';

const router = Router();

// GET /api/notifications — current user's notifications + unread count.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await listNotifications(req.user._id));
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await markRead(req.params.id, req.user._id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await markAllRead(req.user._id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
