import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const bookings = sqliteTable("bookings", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    serviceId: text("service_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    time: text("time").notNull(), // HH:mm
    status: text("status", { enum: ["pending", "confirmed", "cancelled"] }).default("pending").notNull(),
    notes: text("notes"),
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const categories = sqliteTable("categories", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    // image: text("image"), // Optional: URL to category image
    createdAt: text("created_at")
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const services = sqliteTable("services", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(), // Stored as number (e.g., 85.00)
    duration: integer("duration").notNull(), // In minutes
    isPopular: integer("is_popular", { mode: "boolean" }).default(false).notNull(),
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
