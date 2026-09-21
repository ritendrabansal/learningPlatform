import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { getDb } from '../../src/db/client.js'
import { books, chapters, subjects } from '../../src/db/schema/index.js'
import { listChaptersForBook, listSubjects } from '../../src/db/queries/curriculum.js'

describe('curriculum queries (read-only)', () => {
  it('lists subjects inserted directly — no write helper exists for curriculum tables', async () => {
    const db = getDb(env)
    const [subject] = await db.insert(subjects).values({ name: 'Mathematics', grade: 9 }).returning()

    const result = await listSubjects(db)

    expect(result).toContainEqual(subject)
  })

  it('joins chapter and book title', async () => {
    const db = getDb(env)
    // Single-row INSERT...RETURNING always returns exactly one row.
    const [subject] = await db.insert(subjects).values({ name: 'English', grade: 9 }).returning()
    const [book] = await db
      .insert(books)
      .values({ subjectId: subject!.id, title: 'Kaveri', pdfR2Key: 'english/iebe101.pdf' })
      .returning()
    const [chapter] = await db
      .insert(chapters)
      .values({ bookId: book!.id, number: 1, title: 'The Lost Child', pageStart: 1, pageEnd: 10 })
      .returning()

    const result = await listChaptersForBook(db, book!.id)

    expect(result).toEqual([
      { id: chapter!.id, number: 1, title: 'The Lost Child', status: 'draft', bookTitle: 'Kaveri' },
    ])
  })
})
