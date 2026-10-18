import { defineConfig } from 'vitest/config';

// Integration tests: real HTTP requests against a real, isolated PostgreSQL
// database named by TEST_DATABASE_URL. Files run one at a time because they
// share that database.
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
