import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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
    serviceId: integer("service_id").references(() => services.id).notNull(),
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

export const noShows = sqliteTable("no_shows", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerEmail: text("customer_email").notNull().unique(),
    count: integer("count").default(0).notNull(),
    lastNoShowDate: text("last_no_show_date"),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export type BlockedTime = typeof blockedTimes.$inferSelect;
export type NewBlockedTime = typeof blockedTimes.$inferInsert;

export type NoShow = typeof noShows.$inferSelect;
export type NewNoShow = typeof noShows.$inferInsert;
