import { defineConfig } from 'vitest/config';

// Tests run serially against the shared Atlas cluster's dedicated
// luc_crm_test database (set NODE_ENV=test so env.js picks MONGODB_URI_TEST).
// Single-fork + no file parallelism avoids cross-test collisions on the
// shared database; each suite clears collections in setup.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./test/setup.js'],
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js', 'src/seed/**', 'src/jobs/**'],
    },
  },
});
