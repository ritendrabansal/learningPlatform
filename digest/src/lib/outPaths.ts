import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SubjectKey } from 'ncert-core'

const DIGEST_ROOT = path.resolve(import.meta.dirname, '../..')
export const OUT_ROOT = path.join(DIGEST_ROOT, 'out')
export const PROMPTS_DIR = path.join(DIGEST_ROOT, 'src/prompts/v1')

export interface BookRef {
  subject: SubjectKey
  fileStem: string
  pdfPath: string
  outDir: string
}

/** Resolves a --book path like "content/Class 9/english/iebe101.pdf" into subject + output dir. */
export function resolveBook(bookPath: string): BookRef {
  const abs = path.resolve(bookPath)
  const subjectDir = path.basename(path.dirname(abs)).toLowerCase()
  if (subjectDir !== 'english' && subjectDir !== 'maths') {
    throw new Error(`Cannot infer subject from path "${bookPath}" (expected .../english/... or .../maths/...)`)
  }
  const fileStem = path.basename(abs, path.extname(abs))
  return {
    subject: subjectDir,
    fileStem,
    pdfPath: abs,
    outDir: path.join(OUT_ROOT, subjectDir, fileStem),
  }
}

/** Chapter number from NCERT's own filename convention (iebe101 -> 1, iebe108 -> 8). */
export function chapterNumberFromFileStem(fileStem: string): number {
  const match = /(\d{2})$/.exec(fileStem)
  if (!match) throw new Error(`Cannot infer chapter number from filename "${fileStem}"`)
  return Number.parseInt(match[1]!, 10)
}

export async function readJson<T>(ref: BookRef, name: string): Promise<T> {
  const raw = await readFile(path.join(ref.outDir, name), 'utf-8')
  return JSON.parse(raw) as T
}

export async function writeJson(ref: BookRef, name: string, data: unknown): Promise<void> {
  await mkdir(ref.outDir, { recursive: true })
  await writeFile(path.join(ref.outDir, name), JSON.stringify(data, null, 2), 'utf-8')
}

export async function readPrompt(name: string): Promise<string> {
  return readFile(path.join(PROMPTS_DIR, name), 'utf-8')
}
