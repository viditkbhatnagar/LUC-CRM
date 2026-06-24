// Builds the Express app (no network listen here, so tests can import it).
// Mount order is deliberate (04 §4 / 09 §4):
//   1. /api JSON router
//   2. /api 404 (JSON, never the SPA)
//   3. static client/dist + SPA fallback (production only)
//   4. central error handler (last)
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { apiNotFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // (1) API first.
  app.use('/api', apiRouter);

  // (2) Unmatched /api routes → JSON 404 (must precede the SPA fallback).
  app.use(apiNotFound);

  // (3) Serve the built SPA in production; SPA fallback for client routes.
  if (env.isProd) {
    const dist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // (4) Error handler last.
  app.use(errorHandler);

  return app;
}

export default createApp;
