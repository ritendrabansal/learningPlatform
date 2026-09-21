import { inspectPdf } from '../lib/pdf.js'
import { uploadToLocalR2 } from '../lib/r2.js'
import { type BookRef, writeJson } from '../lib/outPaths.js'

export interface InventoryOutput {
  pageCount: number
  possiblyScanned: boolean
  r2Key: string
}

export async function runP0(ref: BookRef): Promise<InventoryOutput> {
  const { pageCount, possiblyScanned } = await inspectPdf(ref.pdfPath)
  const r2Key = `${ref.subject}/${ref.fileStem}.pdf`

  await uploadToLocalR2(r2Key, ref.pdfPath)

  const output: InventoryOutput = { pageCount, possiblyScanned, r2Key }
  await writeJson(ref, 'inventory.json', output)
  return output
}
