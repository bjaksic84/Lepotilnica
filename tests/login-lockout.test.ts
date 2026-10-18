import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
    LOGIN_MAX_FAILURES,
    LOGIN_WINDOW_MS,
    clearFailedLogins,
    getLockoutState,
    recordFailedLogin,
} from "@/lib/login-attempts";
import { migrate, removeDatabaseFile, testClient } from "./helpers/test-db";

/**
 * Guards the admin login lockout.
 *
 * This is the only brute-force control that actually works. The Cloudflare
 * Rate Limiting binding sits in front of it but is approximate: 20 requests one
 * second apart got past a configured 8-per-60s on the deployed Worker without a
 * single refusal, and `limit()` was observed returning success every time. So
 * the guarantee being asserted here is not duplicated anywhere else, and
 * ADMIN_PASSWORD is the only admin factor.
 *
 * Every case drives the clock explicitly rather than sleeping, so the window
 * behaviour is tested exactly instead of approximately.
 */
describe("admin login lockout", () => {
    const IP = "203.0.113.7";
    const OTHER_IP = "203.0.113.8";
    const NOW = 1_800_000_000_000;

    beforeAll(async () => {
        removeDatabaseFile();
        // Setup runs on its own connection, closed again immediately: a second
        // open connection deadlocks against the code under test.
        const setupClient = testClient();
        try {
            await migrate(setupClient);
        } finally {
            setupClient.close();
        }
    });

    afterAll(() => {
        removeDatabaseFile();
    });

    beforeEach(async () => {
        await db.delete(loginAttempts);
    });

    it("does not lock out an IP with no history", async () => {
        const state = await getLockoutState(IP, NOW);
        expect(state.lockedOut).toBe(false);
        expect(state.failures).toBe(0);
        expect(state.retryAfterSeconds).toBe(0);
    });

    it("counts failures without locking out below the threshold", async () => {
        for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) {
            await recordFailedLogin(IP, NOW - i * 1000);
        }
        const state = await getLockoutState(IP, NOW);
        expect(state.failures).toBe(LOGIN_MAX_FAILURES - 1);
        expect(state.lockedOut).toBe(false);
    });

    it("locks out exactly at the threshold", async () => {
        for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
            await recordFailedLogin(IP, NOW - i * 1000);
        }
        const state = await getLockoutState(IP, NOW);
        expect(state.failures).toBe(LOGIN_MAX_FAILURES);
        expect(state.lockedOut).toBe(true);
        expect(state.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("ignores failures that have aged out of the window", async () => {
        // Recorded long ago; `now` is passed so the prune inside
        // recordFailedLogin uses that same old clock and leaves them in place.
        const longAgo = NOW - LOGIN_WINDOW_MS * 2;
        for (let i = 0; i < LOGIN_MAX_FAILURES + 5; i++) {
            await recordFailedLogin(IP, longAgo - i * 1000);
        }
        const state = await getLockoutState(IP, NOW);
        expect(state.failures).toBe(0);
        expect(state.lockedOut).toBe(false);
    });

    it("lifts the lock as the oldest failure ages out", async () => {
        // All failures land at the very start of the window.
        for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
            await recordFailedLogin(IP, NOW);
        }
        expect((await getLockoutState(IP, NOW)).lockedOut).toBe(true);

        // One millisecond past the window, they no longer count.
        const after = NOW + LOGIN_WINDOW_MS + 1;
        const state = await getLockoutState(IP, after);
        expect(state.failures).toBe(0);
        expect(state.lockedOut).toBe(false);
    });

    it("reports a retry delay bounded by the window", async () => {
        for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
            await recordFailedLogin(IP, NOW);
        }
        const state = await getLockoutState(IP, NOW);
        expect(state.retryAfterSeconds).toBeGreaterThan(0);
        expect(state.retryAfterSeconds).toBeLessThanOrEqual(LOGIN_WINDOW_MS / 1000);
    });

    it("counts per IP, so one attacker cannot lock out the admin", async () => {
        // This is the property that justified per-IP counting over a global
        // cap: a global cap would let anyone lock Karin out of her own
        // dashboard, which is worse than the problem it solves.
        for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
            await recordFailedLogin(OTHER_IP, NOW - i * 1000);
        }
        expect((await getLockoutState(OTHER_IP, NOW)).lockedOut).toBe(true);
        expect((await getLockoutState(IP, NOW)).lockedOut).toBe(false);
    });

    it("clears an IP's failures on a successful login", async () => {
        for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
            await recordFailedLogin(IP, NOW - i * 1000);
        }
        expect((await getLockoutState(IP, NOW)).lockedOut).toBe(true);

        await clearFailedLogins(IP);

        expect((await getLockoutState(IP, NOW)).failures).toBe(0);
        expect((await getLockoutState(IP, NOW)).lockedOut).toBe(false);
    });

    it("clearing one IP leaves another IP's failures alone", async () => {
        await recordFailedLogin(IP, NOW);
        await recordFailedLogin(OTHER_IP, NOW);

        await clearFailedLogins(IP);

        expect((await getLockoutState(IP, NOW)).failures).toBe(0);
        expect((await getLockoutState(OTHER_IP, NOW)).failures).toBe(1);
    });

    it("prunes aged-out rows on write, so the table cannot grow forever", async () => {
        const longAgo = NOW - LOGIN_WINDOW_MS * 2;
        for (let i = 0; i < 20; i++) {
            await recordFailedLogin(IP, longAgo - i * 1000);
        }
        expect(await db.select().from(loginAttempts)).toHaveLength(20);

        // A write at the current time prunes everything outside the window.
        await recordFailedLogin(IP, NOW);

        const remaining = await db.select().from(loginAttempts);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].attemptedAt).toBe(NOW);
    });
});
