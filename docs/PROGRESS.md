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
- [x] Phase 7 — Progress and Homework
  `HomeworkAgent.generateHomework` is now called by `ClassroomAgent.endSession` for every student
  in the class roster (standard Durable Object server-to-server RPC via `getAgentByName`, not the
  client-facing `unstable_callable` decorator). Picks weak topics (mastery < 0.7, or covered this
  session with zero attempts and no prior mastery signal), selects unused textbook questions,
  then approved `generated_questions`, then generates new ones with Sonnet as a last resort
  (`worker/src/ai/generatePracticeQuestion.ts`); writes `homework_sets`/`homework_items` with a
  human-readable `reason` on each; schedules a reminder placeholder and an overdue check via
  `this.schedule()`. Added `/api/homework` (list + submit, reusing Phase 6's answer-scoring code)
  and `/api/progress` (mastery heat-map grid + an on-demand Haiku-written plain-English summary,
  `worker/src/ai/summarizeProgress.ts`) routes, plus `Progress` and `Homework` pages in `web/`.
  Verified end-to-end against `wrangler dev`: ending a real session created homework for all 3
  students in the roster, each item with a correct reason; a submitted answer was scored for
  real by Haiku; the progress summary was fixed after catching a real bug in testing (it called
  the AI even with zero mastery data, producing a confused non-answer — now short-circuits to a
  plain "no attempts yet" message). A real bug in weak-topic detection was also caught and fixed
  by the unit tests: a topic with solid prior mastery but no attempt *this session* was wrongly
  flagged as weak.
- [x] Phase 8 — Hardening
  Cloudflare Access JWT verification (`worker/src/middleware/requireAccess.ts`, `jose`) guards
  the teacher-only mutation routes (start session, all Review Queue writes, `/api/admin`); it's a
  no-op until `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` are set, since no Access application exists
  yet — that's a live Cloudflare account action only Ritendra can do (same as Phase 9's deploy).
  Workers Rate Limiting binding (`AI_RATE_LIMITER`, 5/60s) guards every point that turns
  student/teacher input into an AI call. New `ai_runs` cost view (`/api/admin/ai-runs/*`,
  `AdminCosts` page). Added `digest/`'s first Vitest setup (mocking `@anthropic-ai/sdk`, never
  the real API) plus a curriculum-write-boundary guard test.

  Self-review against `code-reviewer.md`'s checklist (no such subagent is dispatchable in this
  environment, so done directly) caught three real gaps, all fixed rather than just reported:
  1. **Security:** the WebSocket path into `ClassroomAgent` bypasses the Hono app entirely
     (`routeAgentRequest` handles it first), so `requireAccess` never covered a connection
     claiming `role=teacher` — anyone who learned a session id could hijack a live class
     regardless of Access being configured. Fixed by verifying the same Access token directly in
     `ClassroomAgent.onConnect`.
  2. **Hard rule 2:** `scoreAnswerWithAi` and `generatePracticeQuestion` cast the AI's tool output
     directly instead of Zod-validating it (a `practiceQuestionSchema` already existed and simply
     wasn't being used). Both now validate and log failures to `ai_runs`.
  3. **Hard rule 5:** the three new runtime AI prompts were inline strings, not versioned files.
     Extracted to `worker/src/prompts/v1/*.txt` (`.txt`, not `.md`, since Wrangler's bundler only
     text-imports `.txt`/`.html`/`.sql` by default).
  4. Also hardened `ClassroomAgent`'s student side: a connection could previously claim any
     `studentId` via the query string with no check that it's enrolled in the class.

  `/verify-cf` run manually (no slash-command tool here): typecheck, full test suite (27 tests),
  migrations all applied, no Node-only imports in `worker/`/`packages/core/`, and
  `wrangler deploy --dry-run` all pass.
- [ ] Phase 9 — Deploy (run by Ritendra manually)
