import { newId } from 'ncert-core'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
  },
  (table) => [index('classes_teacher_id_idx').on(table.teacherId)],
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
