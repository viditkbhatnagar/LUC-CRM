// API router root. Sub-routers are mounted here as milestones land
// (auth M2 · meta/leads/tasks/activities M3 · transition/docs/payment M4 ·
//  notifications M5 · reports M6 · webhooks M7). Keep this the single mount point.
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import metaRoutes from './meta.routes.js';
import leadsRoutes from './leads.routes.js';
import notificationsRoutes from './notifications.routes.js';
import reportsRoutes from './reports.routes.js';
import webhooksRoutes from './webhooks.routes.js';

const apiRouter = Router();

// M0 — health check (used by Render healthCheckPath).
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

// M2 — authentication & user management.
apiRouter.use('/auth', authRoutes);

// M3 — workflow meta (single source of truth for the client) + lead core.
apiRouter.use('/meta', metaRoutes);
apiRouter.use('/leads', leadsRoutes);

// M5 — notifications (escalations, assignments, breaches).
apiRouter.use('/notifications', notificationsRoutes);

// M6 — dashboards & reports.
apiRouter.use('/reports', reportsRoutes);

// Lead ingestion webhook (key-protected; not a user session).
apiRouter.use('/webhooks', webhooksRoutes);

export default apiRouter;
