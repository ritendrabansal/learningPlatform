import { Hono } from 'hono'
import { getDb } from '../db/client.js'
import { getChapter, getChapterDetail, getLibraryTree } from '../db/queries/curriculum.js'

export const library = new Hono<{ Bindings: Env }>()

library.get('/', async (c) => {
  const rows = await getLibraryTree(getDb(c.env))

  const subjectsById = new Map<string, { id: string; name: string; grade: number; books: Map<string, unknown> }>()
  for (const row of rows) {
    let subject = subjectsById.get(row.subjectId)
    if (!subject) {
      subject = { id: row.subjectId, name: row.subjectName, grade: row.grade, books: new Map() }
      subjectsById.set(row.subjectId, subject)
    }
    let book = subject.books.get(row.bookId) as { id: string; title: string; chapters: unknown[] } | undefined
    if (!book) {
      book = { id: row.bookId, title: row.bookTitle, chapters: [] }
      subject.books.set(row.bookId, book)
    }
    book.chapters.push({ id: row.chapterId, number: row.chapterNumber, title: row.chapterTitle, status: row.chapterStatus })
  }

  const tree = [...subjectsById.values()].map((subject) => ({
    id: subject.id,
    name: subject.name,
    grade: subject.grade,
    books: [...subject.books.values()],
  }))
  return c.json(tree)
})

library.get('/chapters/:id', async (c) => {
  const detail = await getChapterDetail(getDb(c.env), c.req.param('id'))
  if (!detail) return c.json({ error: 'not found' }, 404)
  return c.json(detail)
})

library.get('/chapters/:id/pdf', async (c) => {
  const chapter = await getChapter(getDb(c.env), c.req.param('id'))
  if (!chapter) return c.json({ error: 'not found' }, 404)
  const object = await c.env.PDFS.get(chapter.pdfR2Key)
  if (!object) return c.json({ error: 'pdf not found in R2' }, 404)
  return new Response(object.body, { headers: { 'content-type': 'application/pdf' } })
})
