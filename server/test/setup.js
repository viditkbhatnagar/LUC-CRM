// Global Vitest setup. Vitest sets NODE_ENV=test, so env.js selects
// MONGODB_URI_TEST (the dedicated luc_crm_test database). We do NOT connect
// globally here — pure unit/route tests (e.g. health) need no DB. Integration
// tests opt in via test/db.js (setupTestDb()).
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
// Tests are hermetic: never hit real AWS/messaging providers regardless of
// what's in .env (the app may set STORAGE_DRIVER=s3 for production).
process.env.STORAGE_DRIVER = 'stub';
process.env.MESSAGING_DRIVER = 'console';
// Point mongodb-memory-server at the system binary if used as an offline fallback.
process.env.MONGOMS_SYSTEM_BINARY =
  process.env.MONGOMS_SYSTEM_BINARY || '/opt/homebrew/bin/mongod';
