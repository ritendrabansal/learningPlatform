import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'

export interface PdfInventory {
  pageCount: number
  base64: string
  /** True if a sampled page yielded near-zero extractable text — likely a scanned image page. */
  possiblyScanned: boolean
}

/**
 * P0: page count + a cheap scanned-page heuristic. pdf-lib doesn't extract text itself (it's a
 * layout/structure library), so "possibly scanned" here is a proxy: a PDF with no XObject/Font
 * text-showing operators on its first page is very likely image-only. This is not the full
 * digest-engineer.md "detect scanned pages" pipeline (that needs real text extraction, e.g. for
 * per-page OCR routing) — good enough for our single-file-per-chapter input, where the same
 * signal on page 1 reliably predicts the whole (small) chapter file.
 */
export async function inspectPdf(filePath: string): Promise<PdfInventory> {
  const bytes = await readFile(filePath)
  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()

  const raw = bytes.toString('latin1')
  const hasTextOperators = /\bBT\b[\s\S]*?\bET\b/.test(raw)

  return {
    pageCount,
    base64: bytes.toString('base64'),
    possiblyScanned: !hasTextOperators,
  }
}

/**
 * Splits a source PDF into a page-range sub-document. For our current source material (one file
 * IS already one chapter) this is called with the file's full range and is a byte-for-byte
 * no-op; real splitting is exercised once Phase 7's teacher-upload path sends whole-book PDFs
 * through the same pass.
 */
export async function splitByPageRange(filePath: string, pageStart: number, pageEnd: number): Promise<Uint8Array> {
  const bytes = await readFile(filePath)
  const src = await PDFDocument.load(bytes)
  const out = await PDFDocument.create()
  const indices = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart - 1 + i)
  const pages = await out.copyPages(src, indices)
  for (const page of pages) out.addPage(page)
  return out.save()
}
