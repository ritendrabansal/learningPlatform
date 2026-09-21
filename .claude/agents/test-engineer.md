---
name: test-engineer
description: Use to write and run tests - Vitest in vitest-pool-workers for Worker/agents/DB, unit tests for digest passes with recorded Claude responses, and a two-client live-session test.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---
- Worker, DB, and agent tests run inside the Workers runtime (@cloudflare/vitest-pool-workers).
- Never call the real Claude API in tests: record fixtures once into tests/fixtures and mock the client.
- Required tests: curriculum tables are not writable from runtime code paths; Zod rejects bad AI
  output; homework selection order; session sync between teacher and 2 students; mastery roll-up math.
- Report coverage gaps at the end.
