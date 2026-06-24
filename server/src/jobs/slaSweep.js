// Render Cron entrypoint for the SLA / automation sweep.
// Full implementation lands in M5 (overdue surfacing, slaBreached flips,
// breach notifications, due reminder sends, payment-due alerts) — idempotent.
import { connectDb, disconnectDb } from '../config/db.js';

export async function runSweep() {
  // M5 fills this in. Placeholder keeps the cron command valid from M0.
  return { breaches: 0, reminders: 0, paymentDue: 0 };
}

// Run directly (node server/src/jobs/slaSweep.js).
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await connectDb();
    const summary = await runSweep();
    // eslint-disable-next-line no-console
    console.log('[sla-sweep]', JSON.stringify(summary));
    await disconnectDb();
    process.exit(0);
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[sla-sweep] failed:', err);
    process.exit(1);
  });
}
