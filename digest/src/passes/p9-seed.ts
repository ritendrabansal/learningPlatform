import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { KNOWN_BOOKS, KNOWN_SUBJECTS, newId, type Content, type Questions, type Structure, type VerifyReport } from 'ncert-core'
import { type BookRef, chapterNumberFromFileStem, readJson } from '../lib/outPaths.js'
import type { InventoryOutput } from './p0-inventory.js'

const execFileAsync = promisify(execFile)
const WORKER_DIR = path.resolve(import.meta.dirname, '../../../worker')

// Ids are assigned once and persisted here, then reused on every re-run of P9 for this chapter
// (digest-engineer.md: "P9 emits idempotent SQL"). Without this, re-running P9 against the same
// content/questions JSON would mint fresh ids each time and INSERT OR REPLACE would never find
// the row it's meant to replace.
interface Ids {
  chapterId: string
  exerciseIdByLabel: Record<string, string>
  topicIds: string[]
  questionIds: string[]
  exerciseItemIds: (string | null)[]
  workedExampleIds: string[]
  flagIds: string[]
}

async function loadOrCreateIds(
  ref: BookRef,
  structure: Structure,
  content: Content,
  questions: Questions,
  verify: VerifyReport | null,
): Promise<Ids> {
  const existing = await readJson<Ids>(ref, 'ids.json').catch(() => null)
  const ids: Ids = {
    chapterId: existing?.chapterId ?? newId(),
    exerciseIdByLabel: existing?.exerciseIdByLabel ?? {},
    topicIds: existing?.topicIds ?? [],
    questionIds: existing?.questionIds ?? [],
    exerciseItemIds: existing?.exerciseItemIds ?? [],
    workedExampleIds: existing?.workedExampleIds ?? [],
    flagIds: existing?.flagIds ?? [],
  }
  for (const ex of structure.exercises) ids.exerciseIdByLabel[ex.label] ??= newId()
  while (ids.topicIds.length < content.topics.length) ids.topicIds.push(newId())
  while (ids.questionIds.length < questions.textbookQuestions.length) ids.questionIds.push(newId())
  while (ids.exerciseItemIds.length < questions.textbookQuestions.length) ids.exerciseItemIds.push(null)
  questions.textbookQuestions.forEach((q, i) => {
    if (q.exerciseLabel && !ids.exerciseItemIds[i]) ids.exerciseItemIds[i] = newId()
  })
  while (ids.workedExampleIds.length < questions.workedExamples.length) ids.workedExampleIds.push(newId())
  const flaggedCount = verify?.items.filter((item) => !item.ok).length ?? 0
  while (ids.flagIds.length < flaggedCount) ids.flagIds.push(newId())

  await mkdir(ref.outDir, { recursive: true })
  await writeFile(path.join(ref.outDir, 'ids.json'), JSON.stringify(ids, null, 2), 'utf-8')
  return ids
}

// verify.json's itemRef points back into content.json/questions.json by kind + position
// (e.g. "topic[2]", "textbookQuestion[5]", "workedExample[0]") since those items don't have
// real D1 ids yet at verification time (packages/core/src/schemas/verify.ts). Resolve to the
// real id now that P9 has assigned one.
function resolveFlagItem(itemRef: string, ids: Ids): { itemType: 'topic' | 'textbook_question' | 'worked_example'; itemId: string } {
  const match = /^(topic|textbookQuestion|workedExample)\[(\d+)\]$/.exec(itemRef)
  if (!match) throw new Error(`Cannot parse verify.json itemRef "${itemRef}"`)
  const index = Number.parseInt(match[2]!, 10)
  switch (match[1]) {
    case 'topic':
      return { itemType: 'topic', itemId: ids.topicIds[index]! }
    case 'textbookQuestion':
      return { itemType: 'textbook_question', itemId: ids.questionIds[index]! }
    default:
      return { itemType: 'worked_example', itemId: ids.workedExampleIds[index]! }
  }
}

function str(value: string | null): string {
  return value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`
}
function json(pages: number[]): string {
  return str(JSON.stringify(pages))
}
function bool(value: boolean): string {
  return value ? '1' : '0'
}

export async function runP9(ref: BookRef): Promise<string> {
  const inventory = await readJson<InventoryOutput>(ref, 'inventory.json')
  const structure = await readJson<Structure>(ref, 'structure.json')
  const content = await readJson<Content>(ref, 'content.json')
  const questions = await readJson<Questions>(ref, 'questions.json')
  const verify = await readJson<VerifyReport>(ref, 'verify.json').catch(() => null)
  const ids = await loadOrCreateIds(ref, structure, content, questions, verify)

  const subject = KNOWN_SUBJECTS[ref.subject]
  const book = KNOWN_BOOKS[ref.subject]
  const chapterNumber = chapterNumberFromFileStem(ref.fileStem)

  const lines: string[] = [
    `INSERT OR IGNORE INTO subjects (id, name, grade) VALUES (${str(subject.id)}, ${str(subject.name)}, ${subject.grade});`,
    `INSERT OR IGNORE INTO books (id, subject_id, title, pdf_r2_key, page_count, digest_status) VALUES (${str(book.id)}, ${str(book.subjectId)}, ${str(book.title)}, NULL, NULL, NULL);`,
    `INSERT OR REPLACE INTO chapters (id, book_id, number, title, pdf_r2_key, page_start, page_end, status) VALUES (${str(ids.chapterId)}, ${str(book.id)}, ${chapterNumber}, ${str(structure.title)}, ${str(inventory.r2Key)}, 1, ${inventory.pageCount}, 'draft');`,
  ]

  for (const ex of structure.exercises) {
    lines.push(
      `INSERT OR REPLACE INTO exercises (id, chapter_id, label, order_index) VALUES (${str(ids.exerciseIdByLabel[ex.label]!)}, ${str(ids.chapterId)}, ${str(ex.label)}, ${ex.orderIndex});`,
    )
  }

  content.topics.forEach((topic, i) => {
    lines.push(
      `INSERT OR REPLACE INTO topics (id, chapter_id, order_index, title, summary, content_md, source_pages, status) VALUES (${str(ids.topicIds[i]!)}, ${str(ids.chapterId)}, ${topic.orderIndex}, ${str(topic.title)}, NULL, ${str(topic.contentMd)}, ${json(topic.sourcePages)}, 'draft');`,
    )
  })

  questions.textbookQuestions.forEach((q, i) => {
    const topicId = ids.topicIds[q.topicOrderIndex]
    if (!topicId) throw new Error(`textbookQuestions[${i}] references unknown topicOrderIndex ${q.topicOrderIndex}`)
    lines.push(
      `INSERT OR REPLACE INTO textbook_questions (id, topic_id, chapter_id, kind, prompt_md, answer_md, answer_source, difficulty, source_pages, verified) VALUES (${str(ids.questionIds[i]!)}, ${str(topicId)}, ${str(ids.chapterId)}, ${str(q.kind)}, ${str(q.promptMd)}, ${str(q.answerMd)}, ${str(q.answerSource)}, ${str(q.difficulty)}, ${json(q.sourcePages)}, ${bool(false)});`,
    )
    const exerciseItemId = ids.exerciseItemIds[i]
    const exerciseId = q.exerciseLabel ? ids.exerciseIdByLabel[q.exerciseLabel] : undefined
    if (exerciseItemId && exerciseId) {
      lines.push(
        `INSERT OR REPLACE INTO exercise_items (id, exercise_id, question_id) VALUES (${str(exerciseItemId)}, ${str(exerciseId)}, ${str(ids.questionIds[i]!)});`,
      )
    }
  })

  questions.workedExamples.forEach((ex, i) => {
    const topicId = ids.topicIds[ex.topicOrderIndex]
    if (!topicId) throw new Error(`workedExamples[${i}] references unknown topicOrderIndex ${ex.topicOrderIndex}`)
    lines.push(
      `INSERT OR REPLACE INTO worked_examples (id, topic_id, prompt_md, solution_md, source_pages) VALUES (${str(ids.workedExampleIds[i]!)}, ${str(topicId)}, ${str(ex.promptMd)}, ${str(ex.solutionMd)}, ${json(ex.sourcePages)});`,
    )
  })

  if (verify) {
    const flagged = verify.items.filter((item) => !item.ok)
    flagged.forEach((item, i) => {
      const { itemType, itemId } = resolveFlagItem(item.itemRef, ids)
      const recomputed = item.recomputed ? str(JSON.stringify(item.recomputed)) : 'NULL'
      lines.push(
        `INSERT OR REPLACE INTO review_flags (id, chapter_id, item_type, item_id, pass, issue, recomputed, resolved, created_at) VALUES (${str(ids.flagIds[i]!)}, ${str(ids.chapterId)}, ${str(itemType)}, ${str(itemId)}, ${str(item.pass)}, ${str(item.issue ?? '')}, ${recomputed}, ${bool(false)}, ${Date.now()});`,
      )
    })
  }

  const sqlPath = path.join(ref.outDir, 'seed.sql')
  await writeFile(sqlPath, lines.join('\n') + '\n', 'utf-8')
  await execFileAsync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', `--file=${sqlPath}`], { cwd: WORKER_DIR })

  return sqlPath
}
