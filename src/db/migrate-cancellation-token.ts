/**
 * One-time migration script to add cancellation_token column to bookings table.
 * Run with: npx tsx src/db/migrate-cancellation-token.ts
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

async function migrate() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log("Adding cancellation_token column to bookings...");

    try {
        await client.execute(
            `ALTER TABLE bookings ADD COLUMN cancellation_token TEXT;`
        );
        console.log("✓ Column added.");
    } catch (e: unknown) {
        const msg = (e as Error).message || "";
        if (msg.includes("duplicate column")) {
            console.log("Column already exists, skipping.");
        } else {
            throw e;
        }
    }

    try {
        await client.execute(
            `CREATE UNIQUE INDEX IF NOT EXISTS bookings_cancellation_token_unique ON bookings (cancellation_token);`
        );
        console.log("✓ Unique index created.");
    } catch (e: unknown) {
        const msg = (e as Error).message || "";
        if (msg.includes("already exists")) {
            console.log("Index already exists, skipping.");
        } else {
            throw e;
        }
    }

    console.log("Migration complete!");
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
