import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { captureSchema, updateLeadSchema, manualActivitySchema } from '../schemas/lead.schema.js';
import {
  createLead,
  listLeads,
  getLeadById,
  updateLead,
} from '../services/leadService.js';
import { logActivity, getActivities } from '../services/activityService.js';
import { Lead } from '../models/Lead.js';

const router = Router();

// POST /api/leads — capture (Rule 4 dedupe; admin ?force=true to bypass).
router.post('/', requireAuth, validate(captureSchema), async (req, res, next) => {
  try {
    const force = req.query.force === 'true' && req.user.role === 'admin';
    const lead = await createLead(req.body, req.user, { force });
    res.status(201).json({ lead });
  } catch (err) {
    // Surface the existing lead reference on a dedupe conflict (409).
    if (err.code === 'CONFLICT' && err.details?.existingLead) {
      return res
        .status(409)
        .json({ error: { code: 'CONFLICT', message: err.message }, existingLead: err.details.existingLead });
    }
    next(err);
  }
});

// GET /api/leads — list (RBAC scoped, filtered, paginated).
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await listLeads(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/leads/:id — full lead.
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const lead = await getLeadById(req.params.id, req.user);
    res.json({ lead });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leads/:id — non-stage fields (+ optional note).
router.patch('/:id', requireAuth, validate(updateLeadSchema), async (req, res, next) => {
  try {
    const lead = await updateLead(req.params.id, req.body, req.user);
    res.json({ lead });
  } catch (err) {
    next(err);
  }
});

// GET /api/leads/:id/activities — timeline (newest first).
router.get('/:id/activities', requireAuth, async (req, res, next) => {
  try {
    await getLeadById(req.params.id, req.user); // enforces view access
    const activities = await getActivities(req.params.id, {
      limit: Math.min(100, Number(req.query.limit) || 50),
      page: Number(req.query.page) || 1,
    });
    res.json({ activities });
  } catch (err) {
    next(err);
  }
});

// POST /api/leads/:id/activities — manual note/call/whatsapp/email.
router.post('/:id/activities', requireAuth, validate(manualActivitySchema), async (req, res, next) => {
  try {
    await getLeadById(req.params.id, req.user); // enforces access
    const activity = await logActivity(req.params.id, {
      type: req.body.type,
      message: req.body.message,
      actor: req.user,
      actorLabel: req.user.name,
    });
    await Lead.updateOne({ _id: req.params.id }, { $set: { lastActivityAt: new Date() } });
    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
});

export default router;
