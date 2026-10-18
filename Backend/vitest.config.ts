import { defineConfig } from 'vitest/config';

// Unit tests: no database, no network. Gemini is always mocked.
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
  },
});
