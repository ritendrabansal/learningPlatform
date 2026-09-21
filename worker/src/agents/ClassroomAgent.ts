import { Agent } from 'agents'

// One instance per live class session. Real behaviour (goToTopic, askQuestion,
// revealAnswer, answer scoring, coverage/attempts writes) lands in Phase 6 —
// IMPLEMENTATION_PLAN.md §5. This stub only establishes the state shape and
// wiring so the Durable Object binding exists and the Worker boots.
export type ClassroomMode = 'teach' | 'question' | 'review'

export interface ClassroomState {
  currentChapterId: string | null
  currentTopicId: string | null
  mode: ClassroomMode
  activeQuestionId: string | null
  connectedStudents: string[]
}

export class ClassroomAgent extends Agent<Env, ClassroomState> {
  initialState: ClassroomState = {
    currentChapterId: null,
    currentTopicId: null,
    mode: 'teach',
    activeQuestionId: null,
    connectedStudents: [],
  }
}
