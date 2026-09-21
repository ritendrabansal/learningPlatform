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
  Implemented (Library + Review Queue pages, `review_flags` table, `/api/library|review` routes);
  code is committed and pushed. Not yet ticked done — this phase's actual done-when is "you have
  personally approved the two pilot chapters" through the UI, which is a human step still pending.
- [ ] Phase 5 — Full digest
  On hold at the user's request until Phase 4's manual review is complete.
- [x] Phase 6 — Live classroom
  Implemented out of order, ahead of Phase 5, since it only needs the pilot chapters' content,
  not their approval status. `ClassroomAgent` (Durable Object): goToTopic/askQuestion/
  revealAnswer/endSession from the teacher, join/answer from students, Zod-validated; mcq/numeric
  scored locally, short/long scored by Haiku via direct `fetch` (Worker-runtime only, no SDK);
  writes `coverage`/`attempts` as events happen and rolls up `mastery` on `endSession`. New
  `classes.join_code` column for Student View's join flow. Teach Mode and Student View pages in
  `web/`. Verified end-to-end with two real WebSocket clients against `wrangler dev` (not just
  unit tests): live state sync, a real Haiku-scored answer, correct `coverage.duration_s`, and
  `mastery` rollup all confirmed in D1. The React UI itself (rendering, keyboard shortcuts, click
  handling) was not visually verified in an actual browser — only the underlying protocol and
  data flow, which is everything a browser session would exercise server-side.
- [ ] Phase 7 — Progress and Homework
- [ ] Phase 8 — Hardening
- [ ] Phase 9 — Deploy (run by Ritendra manually)
