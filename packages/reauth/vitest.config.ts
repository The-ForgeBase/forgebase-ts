import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // so you can use `describe`, `it`, `expect` globally
    environment: 'node', // or 'jsdom' for browser-like tests
    include: ['src/**/*.spec.ts'], // or wherever your test files are
  },
});
