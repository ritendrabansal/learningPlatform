import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { MiddlewareHandler } from 'hono'

// Cloudflare Access JWT verification (developers.cloudflare.com/cloudflare-one/identity/
// authorization-cookie/validating-json/): the token arrives in the Cf-Access-Jwt-Assertion
// header; the JWKS lives at https://<team-domain>/cdn-cgi/access/certs; aud + iss must match the
// Access application. Cached module-scope since createRemoteJWKSet's own cache is per-instance
// and Workers reuse isolates across requests.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined
let jwksTeamDomain: string | undefined

/**
 * Shared by the Hono middleware below and ClassroomAgent.onConnect — a WebSocket upgrade is
 * still a plain HTTP request at connect time, and Access attaches the same header to it, but
 * `routeAgentRequest` (worker/src/index.ts) handles that path *before* the Hono app ever sees
 * it, so Hono middleware alone can't guard a WebSocket connection claiming `role=teacher`.
 * Returns true (no-op) until CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are both set, because no
 * Cloudflare Access application exists to verify against yet; see worker/.dev.vars.example.
 * Once both are set, behavior is identical locally and in the cloud (CLAUDE.md hard rule 7),
 * driven entirely by env vars, not by which environment you're in.
 */
export async function verifyAccessToken(env: Env, request: Request): Promise<boolean> {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN
  const aud = env.CF_ACCESS_AUD
  if (!teamDomain || !aud) return true

  const token = request.headers.get('cf-access-jwt-assertion')
  if (!token) return false

  if (!jwks || jwksTeamDomain !== teamDomain) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))
    jwksTeamDomain = teamDomain
  }

  try {
    await jwtVerify(token, jwks, { issuer: `https://${teamDomain}`, audience: aud })
    return true
  } catch {
    return false
  }
}

/** Guards the teacher-only HTTP mutation routes (starting a classroom session, every Review
 * Queue write). See verifyAccessToken for the no-op-until-configured behavior. */
export const requireAccess: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const ok = await verifyAccessToken(c.env, c.req.raw)
  if (!ok) return c.json({ error: 'unauthorized' }, 401)
  await next()
}
