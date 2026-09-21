CREATE TABLE `review_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`pass` text NOT NULL,
	`issue` text NOT NULL,
	`recomputed` text,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "review_flags_item_type_check" CHECK("review_flags"."item_type" in ('topic','textbook_question','worked_example')),
	CONSTRAINT "review_flags_pass_check" CHECK("review_flags"."pass" in ('P2','P3','P4'))
);
--> statement-breakpoint
CREATE INDEX `review_flags_chapter_id_idx` ON `review_flags` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `review_flags_chapter_id_resolved_idx` ON `review_flags` (`chapter_id`,`resolved`);