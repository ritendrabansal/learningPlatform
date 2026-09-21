import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

// Setup files run outside per-test-file storage isolation and may run more than once;
// applyD1Migrations() only applies migrations that haven't already been applied, so this
// is safe to call unconditionally.
// Always provided by vitest.config.ts's `miniflare.bindings`; optional in the ambient type only
// to keep this test-only augmentation from affecting the plain `Env` interface (see env.d.ts).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!)
