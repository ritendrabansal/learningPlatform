---
description: Run the digest pipeline on a PDF. Usage - /digest-book <pdf path> [--chapters 1,2] [--passes P0,P1,...]
---
Use the digest-engineer subagent to run `npm run digest -- --book $ARGUMENTS`.
- If structure.json does not exist yet, run P0 and P1 first and show me the detected chapter list and page ranges for confirmation before running any further pass.
- After the run, show: chapters processed, item counts per chapter (topics, textbook questions, worked examples), P5 flag count, tokens and estimated cost from ai_runs.jsonl.
- Then suggest /review-digest for any chapter with flags.
