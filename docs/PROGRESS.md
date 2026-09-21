# Progress

- [x] Phase 1 — Scaffold
  npm workspaces (core/worker/web/digest), wrangler.jsonc with D1/R2/DO bindings + assets,
  Hono + routeAgentRequest, `/api/health`, Vite hello page. `npm run dev`, `npm test`,
  `npm run typecheck`, and `wrangler deploy --dry-run` all pass.
- [x] Phase 2 — Schema
  Drizzle schema for all 21 tables in IMPLEMENTATION_PLAN.md §3 (ULID ids, unix-ms timestamps,
  FK indexes, CHECK constraints on every explicitly-enumerated status/kind column); curriculum
  tables get read-only query helpers only (CLAUDE.md rule 1 enforced in code, not just docs).
  Migration applied locally, seed.sql adds 1 teacher/1 class/3 students, Vitest DB tests pass.
- [x] Phase 3 — Digest pipeline, pilot chapters
  P0-P5+P9 implemented in `digest/` (Anthropic SDK, strict-tool-use Zod validation, prompt
  caching, two-call code_execution verify for maths). Ran end-to-end on both pilot chapters:
  English `iebe101` (5 topics/69 questions, 2 P5 flags) and Maths `iemh101` (5 topics/24
  questions, 4 P5 flags including a real caught numeric error), both seeded into local D1 with
  full provenance. Schema fix: `chapters.pdf_r2_key` added, `books.pdf_r2_key` made nullable.
- [ ] Phase 4 — Review Queue and Library UI (quality gate)
- [ ] Phase 5 — Full digest
- [ ] Phase 6 — Live classroom
- [ ] Phase 7 — Progress and Homework
- [ ] Phase 8 — Hardening
- [ ] Phase 9 — Deploy (run by Ritendra manually)
