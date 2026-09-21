declare namespace Cloudflare {
  interface Env {
    // Optional (not required) so this augmentation doesn't break the plain, wrangler-generated
    // `Env` interface's structural match against `Cloudflare.Env` when both end up in the same
    // program (worker-configuration.d.ts's self-referential DO typing pulls src/index.ts, and
    // therefore ClassroomAgent/HomeworkAgent's `Agent<Env, ...>`, into this test program too).
    TEST_MIGRATIONS?: import('cloudflare:test').D1Migration[] // Defined in vitest.config.ts
  }
}
