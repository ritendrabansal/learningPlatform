PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_books` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`pdf_r2_key` text,
	`page_count` integer,
	`digest_status` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_books`("id", "subject_id", "title", "pdf_r2_key", "page_count", "digest_status") SELECT "id", "subject_id", "title", "pdf_r2_key", "page_count", "digest_status" FROM `books`;--> statement-breakpoint
DROP TABLE `books`;--> statement-breakpoint
ALTER TABLE `__new_books` RENAME TO `books`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `books_subject_id_idx` ON `books` (`subject_id`);--> statement-breakpoint
ALTER TABLE `chapters` ADD `pdf_r2_key` text NOT NULL;