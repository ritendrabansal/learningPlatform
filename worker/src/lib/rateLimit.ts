// Workers Rate Limiting binding (developers.cloudflare.com/workers/runtime-apis/bindings/
// rate-limit/): env.AI_RATE_LIMITER.limit({ key }) -> { success: boolean }. One shared binding
// (wrangler.jsonc), keyed per call site (studentId, itemId, ...) so one noisy key can't starve
// another. Guards every point that turns student/teacher input into an AI call.
export async function checkRateLimit(env: Env, key: string): Promise<boolean> {
  const { success } = await env.AI_RATE_LIMITER.limit({ key })
  return success
}
