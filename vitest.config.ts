import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['web/src/**/*.test.{ts,tsx}', 'server/src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
  },
});
