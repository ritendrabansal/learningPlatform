import { drizzle } from 'drizzle-orm/d1'
import { schema } from './schema/index.js'

export function getDb(env: Env) {
  return drizzle(env.DB, { schema })
}

export type Db = ReturnType<typeof getDb>
