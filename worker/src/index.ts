import { Hono } from 'hono'
import { routeAgentRequest } from 'agents'
import { health } from './routes/health.js'

export { ClassroomAgent } from './agents/ClassroomAgent.js'
export { HomeworkAgent } from './agents/HomeworkAgent.js'

const app = new Hono<{ Bindings: Env }>()

app.route('/api/health', health)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const agentResponse = await routeAgentRequest(request, env)
    if (agentResponse) return agentResponse
    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
