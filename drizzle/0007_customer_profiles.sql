CREATE TABLE `customer_profiles` (
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`customer_email`, `customer_phone`)
);
