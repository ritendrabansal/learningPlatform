import { eq } from 'drizzle-orm'
import type { Db } from '../client.js'
import { books, chapters, subjects } from '../schema/index.js'

// Read-only by design (CLAUDE.md hard rule 1): this module exposes no insert/update/delete on
// curriculum tables. Those only ever happen via SQL migrations/seed or the Phase 4 Review
// Queue approve/edit route.

export async function listSubjects(db: Db) {
  return db.select().from(subjects)
}

export async function listChaptersForBook(db: Db, bookId: string) {
  return db
    .select({
      id: chapters.id,
      number: chapters.number,
      title: chapters.title,
      status: chapters.status,
      bookTitle: books.title,
    })
    .from(chapters)
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(eq(chapters.bookId, bookId))
    .orderBy(chapters.number)
}
