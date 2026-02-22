CREATE TABLE `customer_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_email` text NOT NULL,
	`note` text NOT NULL,
	`author` text DEFAULT 'admin' NOT NULL,
	`booking_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null
);
