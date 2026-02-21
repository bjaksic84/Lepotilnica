CREATE TABLE `no_shows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_email` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`last_no_show_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `no_shows_customer_email_unique` ON `no_shows` (`customer_email`);