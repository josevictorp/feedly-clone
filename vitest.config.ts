import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Unit and integration tests for the server and shared packages.
 * Browser-level tests live in `e2e/` and run under Playwright.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Test against the shared sources so `pnpm test` needs no prior build.
      '@feedly/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['apps/server/src/**/*.test.ts', 'packages/shared/src/**/*.test.ts'],
    env: { LOG_LEVEL: 'silent' },
  },
})
