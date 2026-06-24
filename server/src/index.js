// Server bootstrap: validate env, connect to MongoDB, then listen.
import { env, assertEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  assertEnv();
  await connectDb();

  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[luc-crm] api listening on :${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[luc-crm] fatal startup error:', err);
  process.exit(1);
});
