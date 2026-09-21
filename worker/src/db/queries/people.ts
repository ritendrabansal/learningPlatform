import { eq } from 'drizzle-orm'
import type { Db } from '../client.js'
import { classes, students, teachers } from '../schema/index.js'

export async function createTeacher(db: Db, input: { name: string; email: string }) {
  // A single-row INSERT...RETURNING always returns exactly one row.
  const [teacher] = await db.insert(teachers).values(input).returning()
  return teacher!
}

export async function createClass(db: Db, input: { teacherId: string; name: string; grade: number }) {
  const [classRow] = await db.insert(classes).values(input).returning()
  return classRow!
}

export async function createStudent(db: Db, input: { classId: string; name: string }) {
  const [student] = await db.insert(students).values(input).returning()
  return student!
}

export async function listStudentsForClass(db: Db, classId: string) {
  return db.select().from(students).where(eq(students.classId, classId))
}
