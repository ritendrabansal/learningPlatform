import { newId, newJoinCode } from 'ncert-core'
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const teachers = sqliteTable('teachers', {
  id: text('id').primaryKey().$defaultFn(() => newId()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
})

export const classes = sqliteTable(
  'classes',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    teacherId: text('teacher_id').notNull().references(() => teachers.id),
    name: text('name').notNull(),
    grade: integer('grade').notNull(),
    // Short code students type into Student View to find a live class (join-by-code, not
    // authentication — the roster itself is the access control, per Phase 8's later hardening).
    joinCode: text('join_code').notNull().$defaultFn(() => newJoinCode()),
  },
  (table) => [index('classes_teacher_id_idx').on(table.teacherId), unique('classes_join_code_unique').on(table.joinCode)],
)

export const students = sqliteTable(
  'students',
  {
    id: text('id').primaryKey().$defaultFn(() => newId()),
    classId: text('class_id').notNull().references(() => classes.id),
    name: text('name').notNull(),
  },
  (table) => [index('students_class_id_idx').on(table.classId)],
)
