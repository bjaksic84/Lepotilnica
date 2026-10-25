ALTER TABLE `customer_notes` ADD `customer_phone` text;--> statement-breakpoint
CREATE TABLE `booking_absences` (
	`booking_id` integer PRIMARY KEY NOT NULL,
	`no_show` integer DEFAULT false NOT NULL,
	`reason` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customer_blacklist` (
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`blocked` integer DEFAULT false NOT NULL,
	`reason` text,
	`no_shows_forgiven` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`customer_email`, `customer_phone`)
);
