// API router root. Sub-routers are mounted here as milestones land
// (auth M2 · meta/leads/tasks/activities M3 · transition/docs/payment M4 ·
//  notifications M5 · reports M6 · webhooks M7). Keep this the single mount point.
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import metaRoutes from './meta.routes.js';
import leadsRoutes from './leads.routes.js';

const apiRouter = Router();

// M0 — health check (used by Render healthCheckPath).
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

// M2 — authentication & user management.
apiRouter.use('/auth', authRoutes);

// M3 — workflow meta (single source of truth for the client) + lead core.
apiRouter.use('/meta', metaRoutes);
apiRouter.use('/leads', leadsRoutes);

export default apiRouter;
