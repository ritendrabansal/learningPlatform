// Local digest CLI (Node + tsx). Runs P0-P9 against a book PDF.
// Not implemented yet — see IMPLEMENTATION_PLAN.md §4 and Phase 3.
interface DigestArgs {
  book?: string
  chapters?: string
  passes?: string
}

function parseArgs(argv: string[]): DigestArgs {
  const args: DigestArgs = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--book') args.book = argv[++i]
    else if (arg === '--chapters') args.chapters = argv[++i]
    else if (arg === '--passes') args.passes = argv[++i]
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.book) {
    console.error('Usage: npm run digest -- --book <pdf> [--chapters 1,2] [--passes P1,P2]')
    process.exit(1)
  }
  console.log(`Digest pipeline not implemented yet — see IMPLEMENTATION_PLAN.md Phase 3.`)
  console.log(`Requested: book=${args.book} chapters=${args.chapters ?? 'all'} passes=${args.passes ?? 'all'}`)
}

main()
