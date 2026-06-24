// Server bootstrap: validate env, connect to MongoDB, then listen.
import { env, assertEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { runSweep } from './jobs/slaSweep.js';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

async function main() {
  assertEnv();
  await connectDb();

  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[luc-crm] api listening on :${env.port} (${env.nodeEnv})`);
  });

  // Single-service mode: run the SLA sweep in-process (no separate Render cron).
  if (env.runSweepInProcess) {
    // eslint-disable-next-line no-console
    console.log('[luc-crm] in-process SLA sweep enabled (every 15 min)');
    setInterval(() => {
      runSweep()
        // eslint-disable-next-line no-console
        .then((s) => console.log('[sla-sweep:in-process]', JSON.stringify(s)))
        // eslint-disable-next-line no-console
        .catch((e) => console.error('[sla-sweep:in-process] failed:', e.message));
    }, SWEEP_INTERVAL_MS).unref();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[luc-crm] fatal startup error:', err);
  process.exit(1);
});
