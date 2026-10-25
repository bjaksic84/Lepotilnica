import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const categories = sqliteTable("categories", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const services = sqliteTable("services", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    duration: integer("duration").notNull(), // In minutes
    isPopular: integer("is_popular", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const bookings = sqliteTable("bookings", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    serviceId: integer("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    time: text("time").notNull(), // HH:mm
    status: text("status", { enum: ["pending", "confirmed", "cancelled"] }).default("pending").notNull(),
    notes: text("notes"),
    cancellationToken: text("cancellation_token").unique(),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const blockedTimes = sqliteTable("blocked_times", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull(), // HH:mm
    endTime: text("end_time").notNull(), // HH:mm
    reason: text("reason"),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type BlockedTime = typeof blockedTimes.$inferSelect;
export type NewBlockedTime = typeof blockedTimes.$inferInsert;

export const customerNotes = sqliteTable("customer_notes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerEmail: text("customer_email").notNull(),
    /**
     * Normalised phone (src/lib/customer-identity.ts). A customer is an e-mail
     * AND a phone number, so a note belongs to that pair. NULL on notes written
     * before the pair rule; those show on every customer with the e-mail.
     */
    customerPhone: text("customer_phone"),
    note: text("note").notNull(),
    author: text("author", { enum: ["customer", "admin"] }).default("admin").notNull(),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export type CustomerNote = typeof customerNotes.$inferSelect;
export type NewCustomerNote = typeof customerNotes.$inferInsert;

/**
 * What Karin knows about a booking that did not happen: whether the customer
 * simply didn't turn up, and her own note on why they were absent. One row per
 * booking, and only for bookings that have something recorded.
 *
 * Kept out of `bookings` on purpose. The public booking and cancellation flows
 * read and return every bookings column, so a new column there would take
 * online booking down if code ever shipped ahead of its migration; a separate
 * table confines that risk to the admin Logs page.
 *
 * ON DELETE CASCADE does the cleanup. Foreign keys are enforced on Turso, and
 * a booking disappears not only when Karin deletes it but also when its
 * service or category is deleted (both cascade into bookings).
 */
export const bookingAbsences = sqliteTable("booking_absences", {
    bookingId: integer("booking_id")
        .primaryKey()
        .references(() => bookings.id, { onDelete: "cascade" }),
    noShow: integer("no_show", { mode: "boolean" }).default(false).notNull(),
    reason: text("reason"),
    updatedAt: text("updated_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export type BookingAbsence = typeof bookingAbsences.$inferSelect;
export type NewBookingAbsence = typeof bookingAbsences.$inferInsert;

/**
 * Karin's own blacklist decisions, per customer (the normalised e-mail +
 * phone pair; see src/lib/customer-identity.ts and src/lib/blacklist.ts).
 *
 * A customer is blacklisted when `blocked` is set or when their no-shows,
 * less `no_shows_forgiven`, reach the limit. Lifting a blacklist clears
 * `blocked` and forgives every no-show recorded so far, so it does not trip
 * again until new ones accumulate. The phone is "" rather than NULL when a
 * customer has none, so the primary key still holds.
 */
export const customerBlacklist = sqliteTable(
    "customer_blacklist",
    {
        customerEmail: text("customer_email").notNull(),
        customerPhone: text("customer_phone").notNull(),
        blocked: integer("blocked", { mode: "boolean" }).default(false).notNull(),
        reason: text("reason"),
        noShowsForgiven: integer("no_shows_forgiven").default(0).notNull(),
        updatedAt: text("updated_at")
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [primaryKey({ columns: [table.customerEmail, table.customerPhone] })]
);

export type CustomerBlacklistEntry = typeof customerBlacklist.$inferSelect;

/**
 * What Karin herself has said about a customer's identity: a customer she
 * added before they ever booked, or a name she corrected. Keyed like every
 * other customer table, by the normalised e-mail + phone pair ("" when there
 * is no phone).
 *
 * The name competes with the names typed on bookings on recency: whichever
 * was entered last is what the Logs page shows, so her correction holds until
 * the customer books again under another spelling.
 */
export const customerProfiles = sqliteTable(
    "customer_profiles",
    {
        customerEmail: text("customer_email").notNull(),
        customerPhone: text("customer_phone").notNull(),
        name: text("name").notNull(),
        createdAt: text("created_at")
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: text("updated_at")
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => [primaryKey({ columns: [table.customerEmail, table.customerPhone] })]
);

export type CustomerProfile = typeof customerProfiles.$inferSelect;

/**
 * Failed admin login attempts, used to lock out brute force.
 *
 * This exists because the Cloudflare Rate Limiting binding does not actually
 * limit — it is approximate and eventually consistent, and 20 requests a
 * second apart walked straight past a configured 8/60s (see the KNOWN
 * LIMITATION block in src/lib/rate-limit.ts). ADMIN_PASSWORD is the only admin
 * factor, so that path needs exact counting, and the database is the one piece
 * of shared, strongly-consistent state the Worker already has.
 *
 * `attempted_at` is epoch milliseconds rather than the CURRENT_TIMESTAMP text
 * the other tables use: the whole point is arithmetic on a sliding window, and
 * comparing integers avoids depending on SQLite's date parsing.
 *
 * Only failures are recorded, and a successful login clears the row set, so
 * the table stays small; old rows are pruned opportunistically on write.
 */
export const loginAttempts = sqliteTable(
    "login_attempts",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        ip: text("ip").notNull(),
        attemptedAt: integer("attempted_at").notNull(),
    },
    (table) => [index("login_attempts_ip_time_idx").on(table.ip, table.attemptedAt)]
);

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
