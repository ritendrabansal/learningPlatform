import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

const migrationsPath = path.join(import.meta.dirname, 'migrations')
const migrations = await readD1Migrations(migrationsPath)

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Test-only binding so the setup file can apply migrations before tests run.
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    setupFiles: ['./tests/apply-migrations.ts'],
  },
})
