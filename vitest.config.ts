import { defineConfig } from 'vitest/config';

// Tests target the pure core logic (no @enlite/ui), so we keep the splash plugin
// out of this config. jsdom provides DOMParser for parseArgosXml tests.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    pool: 'vmThreads',
  },
});
