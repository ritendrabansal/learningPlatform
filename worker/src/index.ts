import { Hono } from 'hono'
import { routeAgentRequest } from 'agents'
import { health } from './routes/health.js'
import { library } from './routes/library.js'
import { review } from './routes/review.js'
import { classroom } from './routes/classroom.js'
import { homework } from './routes/homework.js'
import { progress } from './routes/progress.js'
import { admin } from './routes/admin.js'

export { ClassroomAgent } from './agents/ClassroomAgent.js'
export { HomeworkAgent } from './agents/HomeworkAgent.js'

const app = new Hono<{ Bindings: Env }>()

app.route('/api/health', health)
app.route('/api/library', library)
app.route('/api/review', review)
app.route('/api/classroom', classroom)
app.route('/api/homework', homework)
app.route('/api/progress', progress)
app.route('/api/admin', admin)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const agentResponse = await routeAgentRequest(request, env)
    if (agentResponse) return agentResponse
    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
