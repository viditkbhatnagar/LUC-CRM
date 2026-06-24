// Global Vitest setup. Vitest sets NODE_ENV=test, so env.js selects
// MONGODB_URI_TEST (the dedicated luc_crm_test database). We do NOT connect
// globally here — pure unit/route tests (e.g. health) need no DB. Integration
// tests opt in via test/db.js (setupTestDb()).
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
// Point mongodb-memory-server at the system binary if used as an offline fallback.
process.env.MONGOMS_SYSTEM_BINARY =
  process.env.MONGOMS_SYSTEM_BINARY || '/opt/homebrew/bin/mongod';
