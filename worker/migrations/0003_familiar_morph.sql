-- drizzle-kit's default plain `ADD ... NOT NULL` would fail against the existing seeded class
-- row (SQLite can't add a NOT NULL column without a default when the table already has rows) —
-- add nullable, backfill the one Phase 2 seed row with a fixed demo code, then index.
ALTER TABLE `classes` ADD `join_code` text;--> statement-breakpoint
UPDATE `classes` SET `join_code` = 'DEMO01' WHERE `join_code` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `classes_join_code_unique` ON `classes` (`join_code`);