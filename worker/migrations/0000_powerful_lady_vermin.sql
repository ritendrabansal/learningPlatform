CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`pdf_r2_key` text NOT NULL,
	`page_count` integer,
	`digest_status` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `books_subject_id_idx` ON `books` (`subject_id`);--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`page_start` integer NOT NULL,
	`page_end` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chapters_status_check" CHECK("chapters"."status" in ('draft','in_review','approved'))
);
--> statement-breakpoint
CREATE INDEX `chapters_book_id_idx` ON `chapters` (`book_id`);--> statement-breakpoint
CREATE INDEX `chapters_book_id_status_idx` ON `chapters` (`book_id`,`status`);--> statement-breakpoint
CREATE TABLE `exercise_items` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`question_id` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `textbook_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercise_items_exercise_id_idx` ON `exercise_items` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`label` text NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercises_chapter_id_idx` ON `exercises` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `key_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`term` text NOT NULL,
	`meaning` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `key_terms_topic_id_idx` ON `key_terms` (`topic_id`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `textbook_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`kind` text NOT NULL,
	`prompt_md` text NOT NULL,
	`answer_md` text,
	`answer_source` text NOT NULL,
	`difficulty` text,
	`source_pages` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "textbook_questions_kind_check" CHECK("textbook_questions"."kind" in ('mcq','short','long','numeric','fill','match')),
	CONSTRAINT "textbook_questions_answer_source_check" CHECK("textbook_questions"."answer_source" in ('textbook','ai_worked'))
);
--> statement-breakpoint
CREATE INDEX `textbook_questions_topic_id_idx` ON `textbook_questions` (`topic_id`);--> statement-breakpoint
CREATE INDEX `textbook_questions_chapter_id_idx` ON `textbook_questions` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content_md` text NOT NULL,
	`source_pages` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "topics_status_check" CHECK("topics"."status" in ('draft','in_review','approved'))
);
--> statement-breakpoint
CREATE INDEX `topics_chapter_id_idx` ON `topics` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `worked_examples` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`prompt_md` text NOT NULL,
	`solution_md` text NOT NULL,
	`source_pages` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `worked_examples_topic_id_idx` ON `worked_examples` (`topic_id`);--> statement-breakpoint
CREATE TABLE `generated_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`kind` text NOT NULL,
	`prompt_md` text NOT NULL,
	`answer_md` text NOT NULL,
	`difficulty` text,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "generated_questions_kind_check" CHECK("generated_questions"."kind" in ('mcq','short','long','numeric','fill','match')),
	CONSTRAINT "generated_questions_status_check" CHECK("generated_questions"."status" in ('draft','approved'))
);
--> statement-breakpoint
CREATE INDEX `generated_questions_topic_id_idx` ON `generated_questions` (`topic_id`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classes_teacher_id_idx` ON `classes` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `students_class_id_idx` ON `students` (`class_id`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_email_unique` ON `teachers` (`email`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`question_id` text NOT NULL,
	`question_table` text NOT NULL,
	`response` text,
	`correct` integer,
	`score` real,
	`feedback` text,
	`answered_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attempts_question_table_check" CHECK("attempts"."question_table" in ('textbook_questions','generated_questions'))
);
--> statement-breakpoint
CREATE INDEX `attempts_session_id_idx` ON `attempts` (`session_id`);--> statement-breakpoint
CREATE INDEX `attempts_student_id_idx` ON `attempts` (`student_id`);--> statement-breakpoint
CREATE TABLE `coverage` (
	`session_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`shown_at` integer NOT NULL,
	`duration_s` integer,
	PRIMARY KEY(`session_id`, `topic_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mastery` (
	`student_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`score` real NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_seen` integer NOT NULL,
	PRIMARY KEY(`student_id`, `topic_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_class_id_idx` ON `sessions` (`class_id`);--> statement-breakpoint
CREATE INDEX `sessions_chapter_id_idx` ON `sessions` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `homework_items` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`question_id` text NOT NULL,
	`question_table` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `homework_sets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "homework_items_question_table_check" CHECK("homework_items"."question_table" in ('textbook_questions','generated_questions'))
);
--> statement-breakpoint
CREATE INDEX `homework_items_set_id_idx` ON `homework_items` (`set_id`);--> statement-breakpoint
CREATE TABLE `homework_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_id` text NOT NULL,
	`due_at` integer NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `homework_sets_student_id_idx` ON `homework_sets` (`student_id`);--> statement-breakpoint
CREATE INDEX `homework_sets_session_id_idx` ON `homework_sets` (`session_id`);--> statement-breakpoint
CREATE TABLE `homework_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`response` text,
	`correct` integer,
	`score` real,
	`feedback` text,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `homework_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `homework_submissions_item_id_idx` ON `homework_submissions` (`item_id`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cost_usd` real NOT NULL,
	`created_at` integer NOT NULL,
	`ok` integer NOT NULL,
	`error` text
);
