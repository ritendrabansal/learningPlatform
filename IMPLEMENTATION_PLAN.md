# NCERT Class 9 AI Learning Platform — Implementation Plan

Target: Cloudflare (Workers, D1, R2, Durable Objects via the Agents SDK), developed and tested
fully locally with `wrangler dev`, then deployed unchanged with `wrangler deploy`.

Built by Claude Code using the subagents in `.claude/agents/` and the commands in `.claude/commands/`.

---

## 0. Guiding principles

1. **Digest once, freeze forever.** Textbook content (topics, explanations, the book's own
   exercises) is extracted once, reviewed by a human, then marked `approved` and never rewritten
   by AI at runtime.
2. **AI at runtime only creates *new* rows.** Homework, practice questions, and progress
   summaries are generated into separate tables that *reference* frozen content but never modify it.
3. **Every AI output carries provenance.** Each row stores `source` (`textbook` | `ai_generated`),
   `model`, `prompt_version`, and `source_pages`, so any item can be traced to its PDF pages.
4. **Local == cloud.** Only Cloudflare-native bindings (D1, R2, DO, Queues). No Node-only APIs in
   Worker code. Secrets in `.dev.vars` locally, `wrangler secret put` in cloud.
5. **Digest runs as a local CLI first**, not inside a Worker. It is a one-time batch job, it can
   be slow, and it is easier to debug on your laptop. A Worker + Queue version for teacher uploads
   comes later (Phase 7) and reuses the same library code.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Cloudflare Workers | Target platform |
| API framework | Hono | Workers-native, tiny, typed |
| Database | D1 (SQLite) + Drizzle ORM | Typed queries, SQL migrations work with `wrangler d1 migrations` |
| File storage | R2 | Raw PDFs, per-page images for maths figures |
| Live classroom | Cloudflare **Agents SDK** (`agents` package, Durable Object based) | Built-in WebSocket, synced state, scheduling, one instance per class session |
| Frontend | React + Vite, served as Workers static assets | Single deploy unit with the API |
| Maths rendering | KaTeX | Equations digested as LaTeX |
| AI | Claude API (`@anthropic-ai/sdk`) | Native PDF input, tool-use for strict JSON |
| Validation | Zod | Every AI response is schema-validated before it touches D1 |
| Tests | Vitest + `@cloudflare/vitest-pool-workers` | Tests run inside the real Workers runtime locally |

Model tiering (set in one config file so it is easy to change):

- **Digest extraction and verification:** `claude-opus-5` (quality matters most, runs once)
- **Homework and practice generation:** `claude-sonnet-5`
- **Cheap classification, tagging, short feedback:** `claude-haiku-4-5-20251001`

---

## 2. Repository layout

```
ncert-learning-platform/
├─ CLAUDE.md                     # Rules Claude Code follows in this repo
├─ IMPLEMENTATION_PLAN.md        # This file
├─ .claude/
│  ├─ agents/                    # Subagents (build team)
│  └─ commands/                  # Slash commands (/digest-book, /review-digest, ...)
├─ content/                      # YOUR PDFs (git-ignored)
│  ├─ english/  (Beehive, Moments, Words & Expressions...)
│  └─ maths/
├─ digest/                       # Local CLI digest pipeline (Node + tsx)
│  ├─ src/
│  │  ├─ passes/                 # One file per digest pass (see §4)
│  │  ├─ prompts/                # Versioned prompt templates
│  │  ├─ schemas/                # Zod schemas = contract for AI output
│  │  └─ cli.ts
│  └─ out/                       # JSON per chapter + generated seed SQL
├─ packages/core/                # Shared types, Zod schemas, prompt builders
│                                # (used by digest CLI AND Workers)
├─ worker/
│  ├─ src/
│  │  ├─ index.ts                # Hono app + routeAgentRequest
│  │  ├─ routes/                 # /api/subjects, /api/chapters, /api/homework...
│  │  ├─ agents/
│  │  │  ├─ ClassroomAgent.ts    # Live session (Durable Object)
│  │  │  └─ HomeworkAgent.ts     # Per-student homework generation
│  │  └─ db/                     # Drizzle schema + queries
│  ├─ migrations/                # D1 SQL migrations
│  └─ wrangler.jsonc
├─ web/                          # React + Vite dashboard
│  └─ src/pages/ (Library, ChapterView, TeachMode, StudentView, Progress, Homework, ReviewQueue)
└─ tests/
```

---

## 3. Data model (D1)

```sql
-- Curriculum (frozen after approval)
subjects(id, name, grade)
books(id, subject_id, title, pdf_r2_key, page_count, digest_status)
chapters(id, book_id, number, title, page_start, page_end, status)      -- status: draft|in_review|approved
topics(id, chapter_id, order_index, title, summary, content_md, source_pages, status)
key_terms(id, topic_id, term, meaning)
textbook_questions(id, topic_id, chapter_id, kind, prompt_md, answer_md,
                   answer_source,  -- 'textbook' | 'ai_worked'
                   difficulty, source_pages, verified)                   -- kind: mcq|short|long|numeric|fill|match
worked_examples(id, topic_id, prompt_md, solution_md, source_pages)     -- maths
exercises(id, chapter_id, label, order_index)                            -- e.g. "Exercise 2.1"
exercise_items(id, exercise_id, question_id)

-- AI-generated practice (never overwrites the above)
generated_questions(id, topic_id, kind, prompt_md, answer_md, difficulty,
                    model, prompt_version, verified, status)

-- People
teachers(id, name, email)
classes(id, teacher_id, name, grade)
students(id, class_id, name)

-- Teaching + progress
sessions(id, class_id, chapter_id, started_at, ended_at)
coverage(session_id, topic_id, shown_at, duration_s)                    -- what the teacher covered
attempts(id, session_id, student_id, question_id, question_table,
         response, correct, score, feedback, answered_at)
mastery(student_id, topic_id, score, attempts, last_seen)               -- rolled up after each session

-- Homework
homework_sets(id, student_id, session_id, due_at, status, model, prompt_version)
homework_items(id, set_id, question_id, question_table, reason)         -- reason: "weak on topic X"
homework_submissions(id, item_id, response, correct, score, feedback, submitted_at)

-- Audit
ai_runs(id, purpose, model, prompt_version, input_tokens, output_tokens, cost_usd, created_at, ok, error)
```

---

## 4. The digest pipeline — every pass

Runs locally via `npm run digest -- --book content/maths/<file>.pdf`. Each pass reads the
previous pass's JSON from `digest/out/` and writes its own, so any pass can be re-run alone.
All passes send the PDF (or the chapter's page range) to Claude as a **native PDF document
block**, so the model sees layout, tables, equations, and figures, not just flattened text.
Where a pass needs strict JSON, it uses **tool use with a JSON schema**, then Zod validation.

| # | Pass | What it does | Model | Output |
|---|---|---|---|---|
| P0 | **Inventory** | Detects file type, page count, whether text is extractable or scanned; splits the book into per-chapter PDFs with `pdf-lib`; uploads originals to local R2 | none | `inventory.json` |
| P1 | **Structure** | Reads the contents pages; returns chapters with page ranges, and sections/exercise labels | Opus | `structure.json` |
| P2 | **Content extraction** | Per chapter: splits into topics in reading order; keeps the book's wording (lightly cleaned); maths → LaTeX; notes figures and their pages. **Instruction: do not add, reinterpret, or summarise away content.** | Opus | `ch-N.content.json` |
| P3 | **Textbook Q&A extraction** | Pulls every exercise question exactly as printed, with its label (e.g. 2.1 Q3); captures answers where the book gives them (maths answer keys) | Opus | `ch-N.questions.json` |
| P4 | **Answer completion** | For textbook questions with no printed answer (most English comprehension, most maths proofs), writes a model answer and marks `answer_source='ai_worked'` | Opus | merged into questions |
| P5 | **Verification (independent agent)** | A second, separate call checks each P2–P4 item against the source pages: faithful? complete? maths correct? Maths numeric answers are re-computed using the **code execution tool**. Mismatches are flagged, not auto-fixed | Opus | `ch-N.verify.json` |
| P6 | **Enrichment** | Key terms, one-line summary per topic, difficulty tags, learning objectives, prerequisite links between topics | Sonnet | `ch-N.enrich.json` |
| P7 | **Practice bank (optional, flagged AI)** | Generates extra practice per topic at 3 difficulty levels into `generated_questions`, grounded only in P2 content | Sonnet | `ch-N.practice.json` |
| P8 | **Embeddings (optional, later)** | Topic chunks → Vectorize index, used by the doubt-answering tutor (Phase 8) | Workers AI embeddings | Vectorize |
| P9 | **Seed** | Converts approved JSON into SQL → `wrangler d1 execute DB --local --file=...` (and `--remote` later) | none | `seed/*.sql` |

**Cost controls:** use the **Message Batches API** for P4, P6, and P7 across all chapters
(half price, fine for an offline job); use **prompt caching** on the chapter PDF block, since
P2–P5 all send the same pages; log every call into `ai_runs`.

**Human review gate:** nothing moves from `draft` to `approved` without passing through the
Review Queue page (Phase 3), which shows the PDF page beside the digested item with
Approve / Edit / Reject. P5's flags are shown first.

**English vs Maths differences** (handled by per-subject prompt templates):
- English: prose and poems kept verbatim; questions are mostly comprehension, vocabulary,
  and grammar; answers mostly `ai_worked` and therefore need review.
- Maths: LaTeX for all expressions; worked examples captured separately; numeric answers
  re-computed in P5; figures stored as page-image references in R2.

---

## 5. Runtime AI agents (inside the app)

Built with the Cloudflare Agents SDK, so each agent is a Durable Object with its own state and
WebSocket connections, runs identically under `wrangler dev`, and deploys as-is.

### ClassroomAgent (one per live session)
- State: `currentChapterId`, `currentTopicId`, `mode` (`teach` | `question` | `review`),
  `activeQuestionId`, `connectedStudents`, live tallies.
- Teacher client sends: `goToTopic`, `askQuestion`, `revealAnswer`, `endSession`.
- Student client sends: `answer`.
- The agent broadcasts state to all clients, which is the "shared screen" behaviour. The teacher
  can also literally screen-share the Teach Mode page, and it still works.
- Writes `coverage` and `attempts` to D1 as events happen, so nothing is lost if the tab closes.
- Short and long answers are scored by Haiku against the stored model answer, returning
  `correct`, `score`, and a one-line `feedback`. MCQ and numeric answers are scored without AI.
- On `endSession`: rolls up `mastery`, then calls HomeworkAgent for each student.

### HomeworkAgent (one per student)
- Input: that student's `mastery`, the session's `coverage`, and `attempts`.
- Picks weak topics, meaning low score or covered but never attempted.
- Selection order: (1) unused **textbook** questions on those topics, (2) approved
  `generated_questions`, (3) only if still short, generates new ones with Sonnet (grounded in
  the frozen `content_md`), saves them to `generated_questions` as `draft`, and uses them.
- Writes `homework_sets` and `homework_items`, each item with a human-readable `reason`.
- Uses `this.schedule()` to send a reminder and to mark the set `overdue` at the due date.

### ProgressAnalyst (on-demand, stateless Worker route)
- Produces a short plain-English summary per student or class for the teacher's Progress page.
  Numbers come from SQL; Claude only writes the words around them.

### Tutor (Phase 8, optional)
- Student asks a doubt; answer is grounded in retrieved topic chunks (P8 embeddings), citing
  the topic, and refuses to go outside the chapter.

---

## 6. Build phases (run in order in Claude Code)

Each phase lists the subagent(s) to use and a done-when check. Start each phase with
`/next-phase` and end it with `/verify-cf`.

### Phase 1 — Scaffold (agents: `cf-architect`)
- Monorepo with `packages/core`, `worker`, `web`, `digest`; TypeScript strict.
- `wrangler.jsonc` with D1 `DB`, R2 `PDFS`, Durable Object bindings for both agents, static assets for `web/dist`.
- `.dev.vars.example` with `ANTHROPIC_API_KEY=`.
- **Done when:** `npm run dev` serves a hello page and `/api/health` returns the D1 and R2 bindings as OK.

### Phase 2 — Schema (agents: `d1-schema-engineer`)
- Drizzle schema plus SQL migrations for §3; seed script for 1 teacher, 1 class, and 3 students.
- **Done when:** `wrangler d1 migrations apply DB --local` succeeds and Vitest query tests pass.

### Phase 3 — Digest pipeline, one chapter (agents: `digest-engineer`, `prompt-engineer`)
- Implement P0–P5 and P9 for **one English chapter and one Maths chapter only**.
- Zod schemas in `packages/core/schemas`; prompts versioned in `digest/src/prompts/v1/`.
- **Done when:** both chapters are in local D1 with source pages on every row, and the P5 report exists.

### Phase 4 — Review Queue and Library UI (agents: `frontend-engineer`)
- Library (subject → book → chapter → topic), with KaTeX rendering.
- Review Queue: PDF page image beside the digested item, with Approve / Edit / Reject.
- **Done when:** you have personally approved the two pilot chapters.

**Quality gate:** do not digest the remaining chapters until the pilot chapters look right.
Iterate on prompts here with `/review-digest`. This is the cheapest point to fix quality.

### Phase 5 — Full digest (agents: `digest-engineer`, `content-verifier`)
- Run P0–P7 for every book using the Batches API; review flagged items.
- **Done when:** every chapter is `approved` or has a known list of open flags.

### Phase 6 — Live classroom (agents: `realtime-agent-engineer`, `frontend-engineer`)
- ClassroomAgent, Teach Mode (teacher), and Student View (join by class code) pages.
- **Done when:** two browser windows stay in sync locally, answers show up in `attempts`, and `coverage` is recorded.

### Phase 7 — Progress and Homework (agents: `ai-features-engineer`, `frontend-engineer`)
- Mastery roll-up, HomeworkAgent, Progress dashboard (per student, per topic heat-map), and Homework page for students.
- Optional: Worker + Queue version of the digest for teacher uploads, reusing `packages/core`.
- **Done when:** ending a session creates homework per student, with a reason on each item.

### Phase 8 — Hardening (agents: `test-engineer`, `code-reviewer`)
- Auth (Cloudflare Access for teachers first; simple class code for students), rate limits on AI routes, `ai_runs` cost view.
- Optional: embeddings plus the Tutor.
- **Done when:** `/verify-cf` passes, tests are green, and a `wrangler deploy --dry-run` succeeds.

### Phase 9 — Deploy
```
wrangler d1 create ncert-db            # put the id into wrangler.jsonc
wrangler r2 bucket create ncert-pdfs
wrangler d1 migrations apply DB --remote
wrangler d1 execute DB --remote --file=digest/out/seed/all.sql
wrangler secret put ANTHROPIC_API_KEY
npm run build && wrangler deploy
```

---

## 7. How to drive Claude Code

1. Put the PDFs in `content/english/` and `content/maths/`.
2. Open the repo in Claude Code. It reads `CLAUDE.md` automatically.
3. Run `/next-phase`. Claude Code reads this plan, finds the first unfinished phase, and
   delegates to the matching subagent(s).
4. For digest work: `/digest-book content/maths/<file>.pdf --chapters 1`, then `/review-digest 1`.
5. After each phase: `/verify-cf` (Cloudflare-compatibility plus test run).
6. Tick the phase in `docs/PROGRESS.md` (Claude Code maintains it).

Tip: in Claude Code, press **Shift+Tab** into plan mode before each phase, so you approve
the plan before any files change.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| AI alters or invents curriculum content | P2 is instructed to copy, not rewrite; P5 independently checks against source pages; human approval gate; runtime never writes to curriculum tables |
| Wrong maths answers | Printed answer keys preferred; P5 re-computes with code execution; `verified` flag shown in UI |
| Scanned or image-only PDF pages | Native PDF input lets Claude read the page images; P0 flags them for extra review |
| Worker CPU or time limits | Heavy digest runs in the local CLI; runtime AI calls are single, short requests |
| AI cost creep | Model tiering, Batches API, prompt caching, `ai_runs` log, and textbook questions reused before generating new ones |
| Local vs cloud drift | Only Cloudflare bindings, tests in `vitest-pool-workers`, and `wrangler deploy --dry-run` in `/verify-cf` |
| Copyright of NCERT texts | Keep the deployment private to your own classes; don't expose book content publicly |
