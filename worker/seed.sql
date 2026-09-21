-- Seed data added in Phase 2 (1 teacher, 1 class, 3 students — IMPLEMENTATION_PLAN.md §6 Phase 2).
-- IDs are ULIDs generated once via `node -e "import('ulid').then(m=>console.log(m.ulid()))"`.

INSERT INTO teachers (id, name, email) VALUES
  ('01M32GAA8JWCVXZXXXN7B6Z3EE', 'Anita Sharma', 'anita.sharma@example.com');

INSERT INTO classes (id, teacher_id, name, grade) VALUES
  ('01M32GAA8MD4PZSFRAD24YHAWC', '01M32GAA8JWCVXZXXXN7B6Z3EE', 'Class 9A', 9);

INSERT INTO students (id, class_id, name) VALUES
  ('01M32GAA8MXC4JSC2R2C68V61A', '01M32GAA8MD4PZSFRAD24YHAWC', 'Ravi Kumar'),
  ('01M32GAA8MBYFYPYWXF3DS9EWS', '01M32GAA8MD4PZSFRAD24YHAWC', 'Priya Singh'),
  ('01M32GAA8MAHWASWVQBNT0ZBJM', '01M32GAA8MD4PZSFRAD24YHAWC', 'Arjun Mehta');
