export * from './curriculum.js'
export * from './generated.js'
export * from './people.js'
export * from './teaching.js'
export * from './homework.js'
export * from './audit.js'
export * from './review.js'

import * as curriculum from './curriculum.js'
import * as generated from './generated.js'
import * as people from './people.js'
import * as teaching from './teaching.js'
import * as homework from './homework.js'
import * as audit from './audit.js'
import * as review from './review.js'

// Combined table map passed to drizzle(env.DB, { schema }) for relational query support.
export const schema = {
  ...curriculum,
  ...generated,
  ...people,
  ...teaching,
  ...homework,
  ...audit,
  ...review,
}
