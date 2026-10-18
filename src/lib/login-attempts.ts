import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { and, eq, gt, lt, sql } from "drizzle-orm";

/**
 * Exact brute-force protection for admin login.
 *
 * The Cloudflare Rate Limiting binding in src/lib/rate-limit.ts stays in front
 * of this as a coarse shield, but it cannot be relied on: it is approximate and
 * eventually consistent, and 20 requests one second apart walked past a
 * configured 8-per-60s without a single refusal. ADMIN_PASSWORD is the only
 * admin factor, so this path needs a count that is actually correct, and the
 * database is the one piece of shared, strongly-consistent state the Worker
 * already has.
 *
 * Counting is per IP. That is the honest limit of this approach — an attacker
 * spread across many addresses is not stopped by it. The alternative, a global
 * cap, would hand any such attacker the ability to lock Karin out of her own
 * dashboard, which is a worse failure than the one it prevents.
 */

/** Sliding window over which failures are counted. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * Failures allowed per IP per window.
 *
 * Deliberately generous for a human: Karin is the only admin, and a handful of
 * typos or a stale saved password should not shut her out before she notices.
 * It is still ruthless against guessing — 10 attempts per quarter hour is under
 * a thousand a day against a long, high-entropy password.
 */
export const LOGIN_MAX_FAILURES = 10;

export type LockoutState = {
    lockedOut: boolean;
    failures: number;
    /** Seconds until the lock lifts; 0 when not locked out. */
    retryAfterSeconds: number;
};

/**
 * How many failures this IP has inside the window, and when it may try again.
 *
 * The lock lifts when the oldest failure in the window ages out, so that row's
 * timestamp is what `retryAfterSeconds` is derived from.
 */
export async function getLockoutState(ip: string, now = Date.now()): Promise<LockoutState> {
    const cutoff = now - LOGIN_WINDOW_MS;

    const row = await db
        .select({
            failures: sql<number>`count(*)`,
            oldest: sql<number | null>`min(${loginAttempts.attemptedAt})`,
        })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.ip, ip), gt(loginAttempts.attemptedAt, cutoff)))
        .get();

    const failures = row?.failures ?? 0;
    const lockedOut = failures >= LOGIN_MAX_FAILURES;
    const oldest = row?.oldest ?? null;

    return {
        lockedOut,
        failures,
        retryAfterSeconds:
            lockedOut && oldest !== null
                ? Math.max(1, Math.ceil((oldest + LOGIN_WINDOW_MS - now) / 1000))
                : 0,
    };
}

/**
 * Record one failed attempt, and prune anything that has aged out.
 *
 * Pruning every IP rather than just this one keeps the table from growing
 * without a scheduled job to tidy it; the row set is small enough that the
 * extra delete costs nothing.
 */
export async function recordFailedLogin(ip: string, now = Date.now()): Promise<void> {
    await db.insert(loginAttempts).values({ ip, attemptedAt: now });
    await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, now - LOGIN_WINDOW_MS));
}

/**
 * Clear this IP's failures after a successful login, so a legitimate admin who
 * fumbled the password a few times starts from a clean slate next time.
 */
export async function clearFailedLogins(ip: string): Promise<void> {
    await db.delete(loginAttempts).where(eq(loginAttempts.ip, ip));
}
