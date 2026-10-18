import { createClient, type Client } from "@libsql/client";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq, and, not } from "drizzle-orm";
import { db } from "@/db";
import { bookings, services } from "@/db/schema";
import { getScheduleForDateStr, toDateStr } from "@/lib/schedule";

/**
 * A throwaway SQLite file shared by the test process and the application's own
 * `db` module. vitest.config.ts aliases `@libsql/client/web` to the default
 * build so `src/db/index.ts` can open it; tests/setup.ts points
 * TURSO_DATABASE_URL here before anything imports that module.
 */
export const TEST_DB_FILE = join(tmpdir(), "lepotilnica-booking-tests.db");
export const TEST_DB_URL = `file:${TEST_DB_FILE}`;

/** Durations the concurrency tests rely on. */
export const SHORT_SERVICE_ID = 1;
export const SHORT_SERVICE_MINUTES = 30;
export const LONG_SERVICE_ID = 2;
export const LONG_SERVICE_MINUTES = 90;

export function removeDatabaseFile(): void {
    for (const suffix of ["", "-wal", "-shm"]) {
        rmSync(TEST_DB_FILE + suffix, { force: true });
    }
}

export function testClient(): Client {
    return createClient({ url: TEST_DB_URL });
}

/**
 * Applies the real drizzle migrations, so the test schema cannot drift.
 *
 * Run this through a dedicated client and close it before the tests begin.
 * SQLite locks per connection, so leaving a second connection open alongside
 * the application's own means the test's cleanup queries and the code under
 * test deadlock on each other with SQLITE_BUSY. Everything after setup goes
 * through `@/db`, which is the single writer.
 */
export async function migrate(client: Client): Promise<void> {
    // Persisted in the database header, so it applies to every later
    // connection, including the application's.
    await client.execute("PRAGMA journal_mode = WAL");
    const dir = join(process.cwd(), "drizzle");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
        const sql = readFileSync(join(dir, file), "utf8");
        for (const statement of sql.split("--> statement-breakpoint")) {
            const trimmed = statement.trim();
            if (!trimmed) continue;
            try {
                await client.execute(trimmed);
            } catch (err) {
                // Later migrations rebuild tables; re-running a CREATE on an
                // existing object is expected and harmless.
                if (!/already exists|duplicate/i.test((err as Error).message)) throw err;
            }
        }
    }
}

/** Deterministic catalogue — tests must not depend on live salon data. */
export async function seedCatalogue(client: Client): Promise<void> {
    await client.execute("delete from bookings");
    await client.execute("delete from services");
    await client.execute("delete from categories");
    await client.execute({
        sql: "insert into categories (id, name) values (?, ?)",
        args: [1, "Test"],
    });
    await client.execute({
        sql: "insert into services (id, category_id, name, price, duration) values (?, ?, ?, ?, ?)",
        args: [SHORT_SERVICE_ID, 1, "Test Short", 30, SHORT_SERVICE_MINUTES],
    });
    await client.execute({
        sql: "insert into services (id, category_id, name, price, duration) values (?, ?, ?, ?, ?)",
        args: [LONG_SERVICE_ID, 1, "Test Long", 90, LONG_SERVICE_MINUTES],
    });
}

/* ── Post-setup queries all go through the application's own `db` ──
   so there is only ever one connection holding locks on the file. */

export async function clearBookings(): Promise<void> {
    await db.delete(bookings);
}

/**
 * The next date the salon is actually open, resolved through the application's
 * own schedule rules rather than hardcoded — otherwise the suite starts failing
 * whenever a chosen date drifts onto a Sunday or a public holiday.
 */
export function nextOpenDate(from = new Date()): string {
    const cursor = new Date(from);
    cursor.setDate(cursor.getDate() + 1);
    for (let i = 0; i < 60; i++) {
        const candidate = toDateStr(cursor);
        if (getScheduleForDateStr(candidate)) return candidate;
        cursor.setDate(cursor.getDate() + 1);
    }
    throw new Error("No open day found in the next 60 days");
}

const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

async function activeBookings(date: string) {
    return db
        .select({ time: bookings.time, duration: services.duration })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(eq(bookings.date, date), not(eq(bookings.status, "cancelled"))));
}

/** Pairs of active bookings on `date` whose time ranges intersect. */
export async function countOverlappingPairs(date: string): Promise<number> {
    const spans = (await activeBookings(date)).map((r) => ({
        start: toMinutes(r.time),
        end: toMinutes(r.time) + (r.duration ?? 0),
    }));
    let pairs = 0;
    for (let i = 0; i < spans.length; i++) {
        for (let j = i + 1; j < spans.length; j++) {
            if (spans[i].start < spans[j].end && spans[j].start < spans[i].end) pairs++;
        }
    }
    return pairs;
}

export async function countBookings(date: string): Promise<number> {
    return (await activeBookings(date)).length;
}
