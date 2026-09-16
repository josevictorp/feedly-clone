CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_collapsed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feed_id` integer NOT NULL,
	`guid` text NOT NULL,
	`url` text,
	`title` text NOT NULL,
	`author` text,
	`summary` text,
	`content_html` text,
	`image_url` text,
	`published_at` integer NOT NULL,
	`crawled_at` integer NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` integer,
	`is_saved` integer DEFAULT false NOT NULL,
	`saved_at` integer,
	`engagement` integer,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_feed_id_guid_unique` ON `entries` (`feed_id`,`guid`);--> statement-breakpoint
CREATE INDEX `entries_feed_id_is_read_idx` ON `entries` (`feed_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `entries_published_at_idx` ON `entries` (`published_at`);--> statement-breakpoint
CREATE INDEX `entries_is_saved_saved_at_idx` ON `entries` (`is_saved`,`saved_at`);--> statement-breakpoint
CREATE INDEX `entries_read_at_idx` ON `entries` (`read_at`);--> statement-breakpoint
CREATE TABLE `feed_categories` (
	`feed_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`feed_id`, `category_id`),
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feed_url` text NOT NULL,
	`site_url` text,
	`title` text NOT NULL,
	`original_title` text,
	`description` text,
	`icon_path` text,
	`language` text,
	`etag` text,
	`last_modified` text,
	`last_fetched_at` integer,
	`next_fetch_at` integer,
	`error_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_feed_url_unique` ON `feeds` (`feed_url`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stream_settings` (
	`stream_id` text PRIMARY KEY NOT NULL,
	`view_mode` text,
	`sort` text,
	`hide_read` integer
);
