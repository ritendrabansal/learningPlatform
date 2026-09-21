import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const WORKER_DIR = path.resolve(import.meta.dirname, '../../../worker')

/** Uploads a file to the local R2 simulation (digest-engineer.md: `wrangler r2 object put --local`). */
export async function uploadToLocalR2(key: string, filePath: string): Promise<void> {
  await execFileAsync(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `ncert-pdfs/${key}`, `--file=${filePath}`, '--local'],
    { cwd: WORKER_DIR },
  )
}
