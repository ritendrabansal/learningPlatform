import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { getDb } from '../../src/db/client.js'
import { books, chapters, reviewFlags, subjects, textbookQuestions, topics } from '../../src/db/schema/index.js'
import { approveChapter, approveQuestion, approveTopic, rejectQuestion, rejectTopic, resolveFlag } from '../../src/db/queries/review.js'

async function seedChapter(db: ReturnType<typeof getDb>) {
  const [subject] = await db.insert(subjects).values({ name: 'English', grade: 9 }).returning()
  const [book] = await db
    .insert(books)
    .values({ subjectId: subject!.id, title: 'Kaveri', pdfR2Key: 'english/iebe101.pdf' })
    .returning()
  const [chapter] = await db
    .insert(chapters)
    .values({ bookId: book!.id, number: 1, title: 'The Lost Child', pdfR2Key: 'english/iebe101.pdf', pageStart: 1, pageEnd: 10 })
    .returning()
  const [topic] = await db
    .insert(topics)
    .values({ chapterId: chapter!.id, orderIndex: 0, title: 'Opening', contentMd: 'Once upon a time.', sourcePages: [1] })
    .returning()
  const [question] = await db
    .insert(textbookQuestions)
    .values({
      topicId: topic!.id,
      chapterId: chapter!.id,
      kind: 'short',
      promptMd: 'Why did the child cry?',
      answerMd: 'Because he was lost.',
      answerSource: 'ai_worked',
      sourcePages: [2],
    })
    .returning()
  return { chapter: chapter!, topic: topic!, question: question! }
}

describe('review queries (the sanctioned write path onto curriculum tables)', () => {
  it('approving a topic sets it approved, applies the edit patch, and resolves its open flag', async () => {
    const db = getDb(env)
    const { topic } = await seedChapter(db)
    const [flag] = await db
      .insert(reviewFlags)
      .values({ chapterId: topic.chapterId, itemType: 'topic', itemId: topic.id, pass: 'P2', issue: 'missing a sentence' })
      .returning()

    const updated = await approveTopic(db, topic.id, { contentMd: 'Once upon a time, fixed.' })

    expect(updated.status).toBe('approved')
    expect(updated.contentMd).toBe('Once upon a time, fixed.')
    const [refetchedFlag] = await db.select().from(reviewFlags).where(eq(reviewFlags.id, flag!.id))
    expect(refetchedFlag!.resolved).toBe(true)
  })

  it('rejecting a topic sends it back to draft and re-opens its flag', async () => {
    const db = getDb(env)
    const { topic } = await seedChapter(db)
    await db.insert(reviewFlags).values({ chapterId: topic.chapterId, itemType: 'topic', itemId: topic.id, pass: 'P2', issue: 'wrong' })
    await approveTopic(db, topic.id)

    const rejected = await rejectTopic(db, topic.id)

    expect(rejected.status).toBe('draft')
    const [flagRow] = await db.select().from(reviewFlags).where(eq(reviewFlags.itemId, topic.id))
    expect(flagRow!.resolved).toBe(false)
  })

  it('approving a question marks it verified', async () => {
    const db = getDb(env)
    const { question } = await seedChapter(db)

    const updated = await approveQuestion(db, question.id)

    expect(updated.verified).toBe(true)
  })

  it('rejecting a question marks it unverified', async () => {
    const db = getDb(env)
    const { question } = await seedChapter(db)
    await approveQuestion(db, question.id)

    const updated = await rejectQuestion(db, question.id)

    expect(updated.verified).toBe(false)
  })

  it('approving a chapter cascades approved status to its topics', async () => {
    const db = getDb(env)
    const { chapter, topic } = await seedChapter(db)

    const updated = await approveChapter(db, chapter.id)

    expect(updated.status).toBe('approved')
    const [refetchedTopic] = await db.select().from(topics).where(eq(topics.id, topic.id))
    expect(refetchedTopic!.status).toBe('approved')
  })

  it('resolveFlag marks a flag resolved directly (e.g. worked_example items)', async () => {
    const db = getDb(env)
    const { chapter, topic } = await seedChapter(db)
    const [flag] = await db
      .insert(reviewFlags)
      .values({ chapterId: chapter.id, itemType: 'worked_example', itemId: topic.id, pass: 'P3', issue: 'check this' })
      .returning()

    const resolved = await resolveFlag(db, flag!.id)

    expect(resolved.resolved).toBe(true)
  })
})
