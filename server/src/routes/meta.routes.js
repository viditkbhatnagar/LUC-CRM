import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { buildWorkflowMeta } from '../services/metaService.js';

const router = Router();

// GET /api/meta/workflow — the workflow definition the client renders from.
router.get('/workflow', requireAuth, (_req, res) => {
  res.json(buildWorkflowMeta());
});

export default router;
