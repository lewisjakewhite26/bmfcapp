import { defineConfig } from 'vitest/config'

/**
 * Canonical Vitest config — run via `npm run test:vitest` in CI (Linux container)
 * or `npm run test:docker` / `npm run test:ci` on Windows OneDrive paths.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
