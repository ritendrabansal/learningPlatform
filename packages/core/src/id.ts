import { ulid } from 'ulid'

// Single source of truth for ID generation (d1-schema-engineer.md: "IDs are text (ULID)").
// Shared by the worker (row inserts) and the digest CLI (P9 seed SQL generation).
export function newId(): string {
  return ulid()
}
