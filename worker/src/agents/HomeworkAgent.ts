import { Agent } from 'agents'

// One instance per student. Real behaviour (picking weak topics, selecting
// textbook/generated questions, scheduling reminders) lands in Phase 7 —
// IMPLEMENTATION_PLAN.md §5. This stub only establishes the state shape and
// wiring so the Durable Object binding exists and the Worker boots.
export interface HomeworkState {
  studentId: string | null
  activeSetId: string | null
}

export class HomeworkAgent extends Agent<Env, HomeworkState> {
  initialState: HomeworkState = {
    studentId: null,
    activeSetId: null,
  }
}
