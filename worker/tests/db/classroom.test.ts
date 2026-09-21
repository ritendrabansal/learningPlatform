import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { getDb } from '../../src/db/client.js'
import { books, chapters, classes, students, subjects, teachers } from '../../src/db/schema/index.js'
import { createSession, getClassByJoinCode } from '../../src/db/queries/classroom.js'

async function seedClassAndChapter(db: ReturnType<typeof getDb>) {
  const [teacher] = await db.insert(teachers).values({ name: 'Ms. Rao', email: `rao-${Date.now()}@example.com` }).returning()
  const [classRow] = await db.insert(classes).values({ teacherId: teacher!.id, name: '9A', grade: 9, joinCode: `T${Date.now()}` }).returning()
  const [student] = await db.insert(students).values({ classId: classRow!.id, name: 'Aisha' }).returning()
  const [subject] = await db.insert(subjects).values({ name: 'English', grade: 9 }).returning()
  const [book] = await db.insert(books).values({ subjectId: subject!.id, title: 'Kaveri', pdfR2Key: 'english/iebe101.pdf' }).returning()
  const [chapter] = await db
    .insert(chapters)
    .values({ bookId: book!.id, number: 1, title: 'The Lost Child', pdfR2Key: 'english/iebe101.pdf', pageStart: 1, pageEnd: 10 })
    .returning()
  return { classRow: classRow!, student: student!, chapter: chapter! }
}

describe('classroom queries', () => {
  it('resolves a class by join code with its roster and no active session', async () => {
    const db = getDb(env)
    const { classRow, student } = await seedClassAndChapter(db)

    const result = await getClassByJoinCode(db, classRow.joinCode)

    expect(result?.class.id).toBe(classRow.id)
    expect(result?.students).toContainEqual(student)
    expect(result?.activeSessionId).toBeNull()
  })

  it('returns null for an unknown join code', async () => {
    const db = getDb(env)
    const result = await getClassByJoinCode(db, 'NOPE99')
    expect(result).toBeNull()
  })

  it('creating a session makes it the class\'s active session', async () => {
    const db = getDb(env)
    const { classRow, chapter } = await seedClassAndChapter(db)

    const session = await createSession(db, { classId: classRow.id, chapterId: chapter.id })
    const result = await getClassByJoinCode(db, classRow.joinCode)

    expect(result?.activeSessionId).toBe(session.id)
  })
})
