import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { getDb } from '../../src/db/client.js'
import { createClass, createStudent, createTeacher, listStudentsForClass } from '../../src/db/queries/people.js'

describe('people queries', () => {
  it('creates a teacher, class, and students, and lists the roster back', async () => {
    const db = getDb(env)
    const teacher = await createTeacher(db, { name: 'Anita Sharma', email: 'anita.sharma@example.com' })
    const classRow = await createClass(db, { teacherId: teacher.id, name: 'Class 9A', grade: 9 })
    await createStudent(db, { classId: classRow.id, name: 'Ravi Kumar' })
    await createStudent(db, { classId: classRow.id, name: 'Priya Singh' })

    const roster = await listStudentsForClass(db, classRow.id)

    expect(roster.map((s) => s.name).sort()).toEqual(['Priya Singh', 'Ravi Kumar'])
  })
})
