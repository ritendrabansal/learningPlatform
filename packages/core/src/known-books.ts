// Fixed ids for the only two subjects/books this project digests. Generated once via
// `node -e "import('ulid').then(m=>console.log(m.ulid()))"`, same as the Phase 2 seed data.
// P9 references these directly instead of look-up-or-create logic, so subject/book identity
// stays stable across every chapter's digest run.
export const KNOWN_SUBJECTS = {
  english: { id: '01M32K2CHB3KJXGD4NNE6DKRRH', name: 'English', grade: 9 },
  maths: { id: '01M32K2CHFVJVKJFT31RP0SN12', name: 'Mathematics', grade: 9 },
} as const

export const KNOWN_BOOKS = {
  english: { id: '01M32K2CHFC0MSDZM62YT24TDC', subjectId: KNOWN_SUBJECTS.english.id, title: 'Kaveri' },
  maths: { id: '01M32K2CHFC66EY2A5YMTTACET', subjectId: KNOWN_SUBJECTS.maths.id, title: 'Ganita Manjari' },
} as const

export type SubjectKey = keyof typeof KNOWN_SUBJECTS
