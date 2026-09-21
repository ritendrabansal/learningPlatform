import { ulid } from 'ulid'

// Single source of truth for ID generation (d1-schema-engineer.md: "IDs are text (ULID)").
// Shared by the worker (row inserts) and the digest CLI (P9 seed SQL generation).
export function newId(): string {
  return ulid()
}

// A short, human-typeable code students enter in Student View to join a live class
// (IMPLEMENTATION_PLAN.md §4: "Student View works on phones; join by class code"). Excludes
// visually ambiguous characters (0/O, 1/I) since students type this by hand.
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newJoinCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)]
  }
  return code
}
