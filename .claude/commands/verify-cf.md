---
description: Check the repo still runs locally and will deploy to Cloudflare unchanged
---
Run, in order, and report pass/fail for each:
1. `npm run typecheck`
2. `npm test`
3. `wrangler d1 migrations list DB --local` (all applied)
4. grep worker/ and packages/core/ for Node-only imports (fs, path, child_process, os, node: modules not supported by Workers)
5. `npx wrangler deploy --dry-run --outdir .wrangler/dry-run`
6. Use the code-reviewer subagent on the current diff.
Summarise blockers first.
