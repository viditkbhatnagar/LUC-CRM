// API router root. Sub-routers are mounted here as milestones land
// (auth M2 · meta/leads/tasks/activities M3 · transition/docs/payment M4 ·
//  notifications M5 · reports M6 · webhooks M7). Keep this the single mount point.
import { Router } from 'express';

const apiRouter = Router();

// M0 — health check (used by Render healthCheckPath).
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

export default apiRouter;
