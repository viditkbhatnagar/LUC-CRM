import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireManager } from '../middleware/rbac.js';
import * as reports from '../services/reportService.js';

const router = Router();

// All RBAC: counsellor → own slice; manager/admin → all (enforced in service).
router.get('/kpis', requireAuth, async (req, res, next) => {
  try {
    res.json(await reports.kpis(req.user));
  } catch (err) {
    next(err);
  }
});

router.get('/source-performance', requireAuth, async (req, res, next) => {
  try {
    res.json(await reports.sourcePerformance(req.user));
  } catch (err) {
    next(err);
  }
});

router.get('/funnel', requireAuth, async (req, res, next) => {
  try {
    res.json(await reports.funnel(req.user));
  } catch (err) {
    next(err);
  }
});

// Counsellor-performance compares the team → manager/admin only.
router.get('/counsellor-performance', requireAuth, requireManager, async (_req, res, next) => {
  try {
    res.json(await reports.counsellorPerformance());
  } catch (err) {
    next(err);
  }
});

router.get('/stage-aging', requireAuth, async (req, res, next) => {
  try {
    res.json(await reports.stageAging(req.user));
  } catch (err) {
    next(err);
  }
});

router.get('/lost-reasons', requireAuth, async (req, res, next) => {
  try {
    res.json(await reports.lostReasons(req.user));
  } catch (err) {
    next(err);
  }
});

router.get('/rule1-check', requireAuth, async (req, res, next) => {
  try {
    res.json(await reports.rule1Check(req.user));
  } catch (err) {
    next(err);
  }
});

export default router;
