import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { getDb } from '../../src/db/client.js'
import {
  attempts,
  books,
  chapters,
  classes,
  coverage,
  generatedQuestions,
  homeworkItems,
  homeworkSets,
  homeworkSubmissions,
  mastery,
  sessions,
  students,
  subjects,
  teachers,
  textbookQuestions,
  topics,
} from '../../src/db/schema/index.js'
import {
  addHomeworkItem,
  createHomeworkSet,
  findApprovedGeneratedQuestions,
  findUnusedTextbookQuestions,
  findWeakTopics,
  markSetOverdueIfIncomplete,
} from '../../src/db/queries/homework.js'

async function seedClassroom(db: ReturnType<typeof getDb>) {
  const [teacher] = await db.insert(teachers).values({ name: 'Ms. Rao', email: `rao-${Date.now()}@example.com` }).returning()
  const [classRow] = await db.insert(classes).values({ teacherId: teacher!.id, name: '9A', grade: 9, joinCode: `H${Date.now()}` }).returning()
  const [student] = await db.insert(students).values({ classId: classRow!.id, name: 'Aisha' }).returning()
  const [subject] = await db.insert(subjects).values({ name: 'English', grade: 9 }).returning()
  const [book] = await db.insert(books).values({ subjectId: subject!.id, title: 'Kaveri', pdfR2Key: 'english/iebe101.pdf' }).returning()
  const [chapter] = await db
    .insert(chapters)
    .values({ bookId: book!.id, number: 1, title: 'The Lost Child', pdfR2Key: 'english/iebe101.pdf', pageStart: 1, pageEnd: 10 })
    .returning()
  const [topic] = await db
    .insert(topics)
    .values({ chapterId: chapter!.id, orderIndex: 0, title: 'Opening', contentMd: 'Once upon a time.', sourcePages: [1] })
    .returning()
  const [session] = await db
    .insert(sessions)
    .values({ classId: classRow!.id, chapterId: chapter!.id, startedAt: new Date() })
    .returning()
  const [question] = await db
    .insert(textbookQuestions)
    .values({ topicId: topic!.id, chapterId: chapter!.id, kind: 'short', promptMd: 'Why?', answerMd: 'Because.', answerSource: 'ai_worked', sourcePages: [2] })
    .returning()
  return { student: student!, topic: topic!, session: session!, question: question! }
}

describe('findWeakTopics', () => {
  it('treats a topic covered this session with zero attempts as weak (score 0)', async () => {
    const db = getDb(env)
    const { student, topic, session } = await seedClassroom(db)
    await db.insert(coverage).values({ sessionId: session.id, topicId: topic.id, shownAt: new Date() })

    const weak = await findWeakTopics(db, student.id, session.id)

    expect(weak).toEqual([{ topic, score: 0 }])
  })

  it('excludes a topic the student already has mastery >= the threshold on', async () => {
    const db = getDb(env)
    const { student, topic, session } = await seedClassroom(db)
    await db.insert(coverage).values({ sessionId: session.id, topicId: topic.id, shownAt: new Date() })
    await db.insert(mastery).values({ studentId: student.id, topicId: topic.id, score: 0.9, attempts: 3, lastSeen: new Date() })

    const weak = await findWeakTopics(db, student.id, session.id)

    expect(weak).toEqual([])
  })

  it('excludes a covered topic the student did attempt this session', async () => {
    const db = getDb(env)
    const { student, topic, session, question } = await seedClassroom(db)
    await db.insert(coverage).values({ sessionId: session.id, topicId: topic.id, shownAt: new Date() })
    await db.insert(attempts).values({
      sessionId: session.id,
      studentId: student.id,
      questionId: question.id,
      questionTable: 'textbook_questions',
      response: 'x',
      correct: true,
      score: 1,
      answeredAt: new Date(),
    })

    const weak = await findWeakTopics(db, student.id, session.id)

    expect(weak).toEqual([])
  })
})

describe('findUnusedTextbookQuestions / findApprovedGeneratedQuestions', () => {
  it('excludes a question the student already attempted', async () => {
    const db = getDb(env)
    const { student, topic, session, question } = await seedClassroom(db)
    await db.insert(attempts).values({
      sessionId: session.id,
      studentId: student.id,
      questionId: question.id,
      questionTable: 'textbook_questions',
      response: 'x',
      correct: true,
      score: 1,
      answeredAt: new Date(),
    })

    const unused = await findUnusedTextbookQuestions(db, student.id, topic.id, 5)

    expect(unused).toEqual([])
  })

  it('only returns approved generated_questions, not draft ones', async () => {
    const db = getDb(env)
    const { topic } = await seedClassroom(db)
    await db.insert(generatedQuestions).values({
      topicId: topic.id,
      kind: 'short',
      promptMd: 'Draft Q',
      answerMd: 'A',
      model: 'claude-sonnet-5',
      promptVersion: 'v1',
      status: 'draft',
    })
    const [approved] = await db
      .insert(generatedQuestions)
      .values({ topicId: topic.id, kind: 'short', promptMd: 'Approved Q', answerMd: 'A', model: 'claude-sonnet-5', promptVersion: 'v1', status: 'approved' })
      .returning()

    const result = await findApprovedGeneratedQuestions(db, topic.id, 5)

    expect(result).toEqual([approved])
  })
})

describe('markSetOverdueIfIncomplete', () => {
  it('marks a past-due set overdue when an item has no submission', async () => {
    const db = getDb(env)
    const { student, session, question } = await seedClassroom(db)
    const set = await createHomeworkSet(db, { studentId: student.id, sessionId: session.id, dueAt: new Date(Date.now() - 1000), model: 'claude-sonnet-5', promptVersion: 'v1' })
    await addHomeworkItem(db, { setId: set.id, questionId: question.id, questionTable: 'textbook_questions', reason: 'weak' })

    await markSetOverdueIfIncomplete(db, set.id)

    const [updated] = await db.select().from(homeworkSets).where(eq(homeworkSets.id, set.id))
    expect(updated!.status).toBe('overdue')
  })

  it('leaves a set alone if not yet due', async () => {
    const db = getDb(env)
    const { student, session, question } = await seedClassroom(db)
    const set = await createHomeworkSet(db, { studentId: student.id, sessionId: session.id, dueAt: new Date(Date.now() + 100000), model: 'claude-sonnet-5', promptVersion: 'v1' })
    await addHomeworkItem(db, { setId: set.id, questionId: question.id, questionTable: 'textbook_questions', reason: 'weak' })

    await markSetOverdueIfIncomplete(db, set.id)

    const [updated] = await db.select().from(homeworkSets).where(eq(homeworkSets.id, set.id))
    expect(updated!.status).toBe('pending')
  })

  it('leaves a past-due set alone once every item has a submission', async () => {
    const db = getDb(env)
    const { student, session, question } = await seedClassroom(db)
    const set = await createHomeworkSet(db, { studentId: student.id, sessionId: session.id, dueAt: new Date(Date.now() - 1000), model: 'claude-sonnet-5', promptVersion: 'v1' })
    const item = await addHomeworkItem(db, { setId: set.id, questionId: question.id, questionTable: 'textbook_questions', reason: 'weak' })
    await db.insert(homeworkSubmissions).values({ itemId: item.id, response: 'x', correct: true, score: 1, submittedAt: new Date() })

    await markSetOverdueIfIncomplete(db, set.id)

    const [updated] = await db.select().from(homeworkSets).where(eq(homeworkSets.id, set.id))
    expect(updated!.status).toBe('pending')
  })
})
