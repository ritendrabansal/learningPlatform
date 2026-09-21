// Thin typed fetch wrapper for the Worker's /api/library and /api/review routes
// (worker/src/routes/library.ts, worker/src/routes/review.ts). Shapes mirror those routes'
// JSON output exactly — kept here rather than shared with worker/ since the two packages don't
// otherwise share types and this is a small, stable surface.

export interface LibraryChapter {
  id: string
  number: number
  title: string
  status: 'draft' | 'in_review' | 'approved'
}

export interface LibraryBook {
  id: string
  title: string
  chapters: LibraryChapter[]
}

export interface LibrarySubject {
  id: string
  name: string
  grade: number
  books: LibraryBook[]
}

export interface KeyTerm {
  id: string
  topicId: string
  term: string
  meaning: string
}

export interface WorkedExample {
  id: string
  topicId: string
  promptMd: string
  solutionMd: string
  sourcePages: number[]
}

export interface TextbookQuestion {
  id: string
  topicId: string
  kind: 'mcq' | 'short' | 'long' | 'numeric' | 'fill' | 'match'
  promptMd: string
  answerMd: string | null
  answerSource: 'textbook' | 'ai_worked'
  difficulty: string | null
  sourcePages: number[]
  verified: boolean
  exerciseLabel: string | null
  exerciseOrderIndex: number | null
}

export interface Topic {
  id: string
  chapterId: string
  orderIndex: number
  title: string
  summary: string | null
  contentMd: string
  sourcePages: number[]
  status: 'draft' | 'in_review' | 'approved'
  keyTerms: KeyTerm[]
  workedExamples: WorkedExample[]
  questions: TextbookQuestion[]
}

export interface Chapter {
  id: string
  bookId: string
  number: number
  title: string
  pdfR2Key: string
  pageStart: number
  pageEnd: number
  status: 'draft' | 'in_review' | 'approved'
}

export interface ChapterDetail {
  chapter: Chapter
  topics: Topic[]
}

export interface ReviewFlag {
  id: string
  chapterId: string
  itemType: 'topic' | 'textbook_question' | 'worked_example'
  itemId: string
  pass: 'P2' | 'P3' | 'P4'
  issue: string
  recomputed: { expected: string; computed: string } | null
  resolved: boolean
  createdAt: number
}

export interface ReviewChapterDetail extends ChapterDetail {
  flags: ReviewFlag[]
}

export interface ReviewQueueRow {
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  chapterStatus: 'draft' | 'in_review' | 'approved'
  openFlags: number
}

export interface ClassRow {
  id: string
  teacherId: string
  name: string
  grade: number
  joinCode: string
}

export interface StudentRow {
  id: string
  classId: string
  name: string
}

export interface ClassByCode {
  class: ClassRow
  students: StudentRow[]
  activeSessionId: string | null
}

export interface Session {
  id: string
  classId: string
  chapterId: string
  startedAt: number
  endedAt: number | null
}

export interface HomeworkQuestion {
  id: string
  topicId: string
  kind: 'mcq' | 'short' | 'long' | 'numeric' | 'fill' | 'match'
  promptMd: string
  answerMd: string | null
}

export interface HomeworkSubmission {
  id: string
  itemId: string
  response: string | null
  correct: boolean | null
  score: number | null
  feedback: string | null
  submittedAt: number
}

export interface HomeworkItem {
  item: { id: string; setId: string; questionId: string; questionTable: string; reason: string }
  question: HomeworkQuestion | undefined
  submission: HomeworkSubmission | null
}

export interface HomeworkSetWithItems {
  set: { id: string; studentId: string; sessionId: string; dueAt: number; status: string }
  items: HomeworkItem[]
}

export interface ProgressCell {
  studentId: string
  studentName: string
  topicId: string
  topicTitle: string
  score: number
  attempts: number
}

export interface AiRunsSummaryRow {
  purpose: string
  model: string
  count: number
  totalCostUsd: number
  okCount: number
}

export interface AiRun {
  id: string
  purpose: string
  model: string
  promptVersion: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  createdAt: number
  ok: boolean
  error: string | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  getLibrary: () => request<LibrarySubject[]>('/api/library'),
  getChapter: (chapterId: string) => request<ChapterDetail>(`/api/library/chapters/${chapterId}`),
  chapterPdfUrl: (chapterId: string) => `/api/library/chapters/${chapterId}/pdf`,

  getReviewQueue: () => request<ReviewQueueRow[]>('/api/review/queue'),
  getReviewChapter: (chapterId: string) => request<ReviewChapterDetail>(`/api/review/chapters/${chapterId}`),
  approveChapter: (chapterId: string) => request(`/api/review/chapters/${chapterId}/approve`, { method: 'POST' }),

  approveTopic: (topicId: string, patch: { title?: string; summary?: string | null; contentMd?: string } = {}) =>
    request(`/api/review/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve', ...patch }) }),
  editTopic: (topicId: string, patch: { title?: string; summary?: string | null; contentMd?: string }) =>
    request(`/api/review/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ action: 'edit', ...patch }) }),
  rejectTopic: (topicId: string) => request(`/api/review/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify({ action: 'reject' }) }),

  approveQuestion: (questionId: string, patch: { promptMd?: string; answerMd?: string | null; difficulty?: string | null } = {}) =>
    request(`/api/review/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve', ...patch }) }),
  editQuestion: (questionId: string, patch: { promptMd?: string; answerMd?: string | null; difficulty?: string | null }) =>
    request(`/api/review/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify({ action: 'edit', ...patch }) }),
  rejectQuestion: (questionId: string) =>
    request(`/api/review/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify({ action: 'reject' }) }),

  resolveFlag: (flagId: string) => request(`/api/review/flags/${flagId}`, { method: 'PATCH' }),

  listClasses: () => request<ClassRow[]>('/api/classroom/classes'),
  getClassByCode: (joinCode: string) => request<ClassByCode>(`/api/classroom/classes/${joinCode}`),
  startSession: (input: { classId: string; chapterId: string }) =>
    request<Session>('/api/classroom/sessions', { method: 'POST', body: JSON.stringify(input) }),

  getHomeworkForStudent: (studentId: string) => request<HomeworkSetWithItems[]>(`/api/homework/students/${studentId}`),
  submitHomework: (itemId: string, response: string) =>
    request<HomeworkSubmission>(`/api/homework/items/${itemId}/submit`, { method: 'POST', body: JSON.stringify({ response }) }),

  getProgressGrid: (classId: string) => request<ProgressCell[]>(`/api/progress/classes/${classId}`),
  getProgressSummary: (studentId: string) => request<{ summary: string }>(`/api/progress/students/${studentId}/summary`),

  getAiRunsSummary: () => request<AiRunsSummaryRow[]>('/api/admin/ai-runs/summary'),
  getRecentAiRuns: () => request<AiRun[]>('/api/admin/ai-runs/recent'),
}
