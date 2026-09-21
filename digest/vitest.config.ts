import { defineConfig } from 'vitest/config'

// Plain Node environment — digest is a Node/tsx CLI, not a Worker, so it needs none of the
// @cloudflare/vitest-plugin machinery worker/'s tests use.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
