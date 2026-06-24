// Integration-test DB helper. Connects to the dedicated luc_crm_test database
// on the shared Atlas cluster and clears collections between tests. It ONLY
// ever clears the luc_crm_test database — never luc_crm_dev or any other DB.
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';

// Safety guard: refuse to run integration tests against anything that is not
// an explicitly test-named database.
function assertTestDb(uri) {
  const name = (uri.split('/').pop() || '').split('?')[0];
  if (!/test/i.test(name)) {
    throw new Error(
      `Refusing to run integration tests against non-test database "${name}". ` +
        'Set MONGODB_URI_TEST to a luc_crm_test database.',
    );
  }
}

export function setupTestDb() {
  beforeAll(async () => {
    const uri = env.mongoUriTest || env.mongoUri;
    assertTestDb(uri);
    await connectDb(uri);
  });

  beforeEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await disconnectDb();
  });
}
