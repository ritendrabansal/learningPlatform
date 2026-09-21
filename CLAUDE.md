# CLAUDE.md — NCERT Class 9 AI Learning Platform

Read `IMPLEMENTATION_PLAN.md` before doing anything. Track progress in `docs/PROGRESS.md`.

## Hard rules
1. **Curriculum tables are frozen at runtime.** Worker code must never UPDATE/INSERT into
   `topics`, `textbook_questions`, `worked_examples`, `key_terms`, `chapters`, or `exercises`.
   Only the digest CLI (seed step) and the Review Queue approve/edit route may write to them.
2. **Every AI response is validated with Zod** (schemas in `packages/core/schemas`) before use.
   On failure: retry once with the validation error appended, then log to `ai_runs` and fail loudly.
3. **Every AI call is logged** to `ai_runs` (purpose, model, prompt_version, tokens, ok/error).
4. **Model names come from `packages/core/models.ts`.** Never hardcode model strings elsewhere.
5. **Prompts are versioned files** in `digest/src/prompts/vN/` or `worker/src/prompts/vN/`.
   Changing a prompt means a new version, not an edit in place.
6. **Worker code is Workers-runtime only**: no `fs`, `path`, `child_process`, or native modules.
   The `digest/` CLI is Node and may use them.
7. **Local == cloud.** Use bindings (`env.DB`, `env.PDFS`, agent bindings). Secrets only from
   `env` (`.dev.vars` locally). Never commit `.dev.vars` or anything in `content/`.
8. Keep provenance: every curriculum and generated row has `source_pages` and/or `model` + `prompt_version`.

## Commands
- `npm run dev`: wrangler dev (worker + web assets, local D1/R2/DO)
- `npm run digest -- --book <pdf> [--chapters 1,2] [--passes P1,P2]`
- `npm run db:migrate:local` / `npm run db:seed:local`
- `npm test`: Vitest (worker tests run in `@cloudflare/vitest-pool-workers`)
- `npm run typecheck`

## Working style
- Use plan mode for each phase; get approval before large changes.
- Delegate to the subagents in `.claude/agents/` that match the phase.
- Small commits per step, message prefixed with the phase, e.g. `P3: add structure pass`.
- When unsure about a Cloudflare or Anthropic API detail, check current docs rather than guessing.
