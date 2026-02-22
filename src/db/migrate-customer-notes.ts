/**
 * One-time migration script to add customer_notes table.
 * Run with: npx tsx src/db/migrate-customer-notes.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Manual .env loading (avoids dotenv dependency)
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
}

import { createClient } from "@libsql/client";

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
    await client.execute(`CREATE TABLE IF NOT EXISTS customer_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        customer_email TEXT NOT NULL,
        note TEXT NOT NULL,
        author TEXT DEFAULT 'admin' NOT NULL,
        booking_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    )`);
    console.log("customer_notes table created successfully");
}

main().catch(console.error);
