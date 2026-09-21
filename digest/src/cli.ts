import path from 'node:path'
import dotenv from 'dotenv'
import { resolveBook } from './lib/outPaths.js'
import { runP0 } from './passes/p0-inventory.js'
import { runP1 } from './passes/p1-structure.js'
import { runP2 } from './passes/p2-content.js'
import { runP3 } from './passes/p3-questions.js'
import { runP4 } from './passes/p4-answers.js'
import { runP5 } from './passes/p5-verify.js'
import { runP9 } from './passes/p9-seed.js'

// digest is a plain Node/tsx CLI, not a Worker, so it doesn't get `worker/.dev.vars` for free —
// load the same key file the Worker uses locally, rather than asking for it twice.
dotenv.config({ path: path.resolve(import.meta.dirname, '../../worker/.dev.vars') })

const ALL_PASSES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P9'] as const
type Pass = (typeof ALL_PASSES)[number]

interface Args {
  book?: string
  chapters?: string
  passes?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--book') args.book = argv[++i]
    else if (arg === '--chapters') args.chapters = argv[++i]
    else if (arg === '--passes') args.passes = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.book) {
    console.error('Usage: npm run digest -- --book <pdf> [--chapters 1,2] [--passes P1,P2]')
    process.exit(1)
  }
  if (args.chapters) {
    console.log('Note: --chapters is a no-op for this source material — each PDF is already one chapter.')
  }

  const passes = (args.passes ? args.passes.split(',') : ALL_PASSES) as Pass[]
  const ref = resolveBook(args.book)
  console.log(`Digesting ${ref.subject}/${ref.fileStem} — passes: ${passes.join(', ')}`)

  for (const pass of passes) {
    console.log(`\n--- ${pass} ---`)
    switch (pass) {
      case 'P0': {
        const out = await runP0(ref)
        console.log(`pages=${out.pageCount} possiblyScanned=${out.possiblyScanned} r2Key=${out.r2Key}`)
        break
      }
      case 'P1': {
        const out = await runP1(ref)
        console.log(`title="${out.title}" exercises=${out.exercises.length}`)
        break
      }
      case 'P2': {
        const out = await runP2(ref)
        console.log(`topics=${out.topics.length}`)
        break
      }
      case 'P3': {
        const out = await runP3(ref)
        console.log(`textbookQuestions=${out.textbookQuestions.length} workedExamples=${out.workedExamples.length}`)
        break
      }
      case 'P4': {
        const out = await runP4(ref)
        const answered = out.textbookQuestions.filter((q) => q.answerMd !== null).length
        console.log(`answered=${answered}/${out.textbookQuestions.length}`)
        break
      }
      case 'P5': {
        const out = await runP5(ref)
        const flagged = out.items.filter((item) => !item.ok).length
        console.log(`checked=${out.items.length} flagged=${flagged}`)
        break
      }
      case 'P9': {
        const sqlPath = await runP9(ref)
        console.log(`seeded -> ${sqlPath}`)
        break
      }
      default:
        console.error(`Unknown pass: ${pass}`)
        process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
