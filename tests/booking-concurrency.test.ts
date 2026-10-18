import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { createBookings } from "@/lib/booking-service";
import {
    LONG_SERVICE_ID,
    SHORT_SERVICE_ID,
    clearBookings,
    countBookings,
    countOverlappingPairs,
    migrate,
    nextOpenDate,
    removeDatabaseFile,
    seedCatalogue,
    testClient,
} from "./helpers/test-db";

/**
 * Guards the booking flow against double-booking.
 *
 * A load test put seven different customers into a single 11:00 appointment,
 * each with a confirmation e-mail. The cause was that the overlap check and
 * the insert were two independent statements: every request that arrived
 * between them read "slot free" and then wrote. The fix runs both inside one
 * immediate-mode write transaction.
 *
 * This is a silent, expensive failure — nothing surfaces until two customers
 * turn up for the same slot — so the invariant is asserted directly against
 * the database rather than inferred from status codes alone.
 */
describe("booking concurrency", () => {
    let date: string;

    const customer = (n: number) => ({
        customerName: "Test Stranka",
        customerEmail: `test${n}@example.invalid`,
        customerPhone: "+386 40 000 000",
    });

    beforeAll(async () => {
        removeDatabaseFile();
        // Setup runs on its own connection, which is closed again immediately:
        // a second open connection deadlocks against the code under test.
        const setupClient = testClient();
        try {
            await migrate(setupClient);
            await seedCatalogue(setupClient);
        } finally {
            setupClient.close();
        }
        date = nextOpenDate();
    });

    afterAll(() => {
        removeDatabaseFile();
    });

    beforeEach(async () => {
        await clearBookings();
    });

    describe("simultaneous attempts on the same slot", () => {
        for (const attempts of [2, 5, 10, 25]) {
            it(`lets exactly one of ${attempts} succeed`, async () => {
                const results = await Promise.all(
                    Array.from({ length: attempts }, (_, i) =>
                        createBookings({
                            ...customer(i),
                            serviceIds: [SHORT_SERVICE_ID],
                            date,
                            time: "10:00",
                        })
                    )
                );

                const accepted = results.filter((r) => r.ok);
                const rejected = results.filter((r) => !r.ok);

                expect(accepted).toHaveLength(1);
                expect(rejected).toHaveLength(attempts - 1);
                // Every rejection must be a conflict, not a crash or a timeout.
                for (const r of rejected) {
                    if (r.ok) continue;
                    expect(r.status).toBe(409);
                }
                // The database itself must agree — this is the assertion that
                // would have caught the original bug.
                expect(await countBookings(date)).toBe(1);
            });
        }
    });

    it("rejects a concurrent booking that only partially overlaps", async () => {
        // 90 minutes from 10:00 against 30 minutes from 10:30: different start
        // times, same chair. A UNIQUE(date, time) index would not catch this,
        // which is why the check is serialised instead.
        const [long, short] = await Promise.all([
            createBookings({
                ...customer(1),
                serviceIds: [LONG_SERVICE_ID],
                date,
                time: "10:00",
            }),
            createBookings({
                ...customer(2),
                serviceIds: [SHORT_SERVICE_ID],
                date,
                time: "10:30",
            }),
        ]);

        const accepted = [long, short].filter((r) => r.ok);
        expect(accepted).toHaveLength(1);
        expect(await countOverlappingPairs(date)).toBe(0);
    });

    it("leaves no overlapping rows after a burst across many slots", async () => {
        const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
        // Four contenders per slot, all released together.
        const attempts = times.flatMap((time, slotIndex) =>
            Array.from({ length: 4 }, (_, i) =>
                createBookings({
                    ...customer(slotIndex * 10 + i),
                    serviceIds: [SHORT_SERVICE_ID],
                    date,
                    time,
                })
            )
        );
        const results = await Promise.all(attempts);

        expect(results.filter((r) => r.ok)).toHaveLength(times.length);
        expect(await countBookings(date)).toBe(times.length);
        expect(await countOverlappingPairs(date)).toBe(0);
    });

    it("still rejects a conflict booked sequentially", async () => {
        // Guards the ordinary, non-concurrent path: serialising the write must
        // not have cost us the plain overlap rejection.
        const first = await createBookings({
            ...customer(1),
            serviceIds: [SHORT_SERVICE_ID],
            date,
            time: "14:00",
        });
        const second = await createBookings({
            ...customer(2),
            serviceIds: [SHORT_SERVICE_ID],
            date,
            time: "14:00",
        });

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(false);
        if (!second.ok) expect(second.status).toBe(409);
    });

    it("still lets the admin flow overlap deliberately", async () => {
        // Karin can be doing two things at once; manual entry is allowed to
        // double-book. This is why the fix is a transaction and not a unique
        // index — an index could not be told to make this exception.
        const first = await createBookings({
            ...customer(1),
            serviceIds: [SHORT_SERVICE_ID],
            date,
            time: "16:00",
            mode: "admin",
        });
        const second = await createBookings({
            ...customer(2),
            serviceIds: [SHORT_SERVICE_ID],
            date,
            time: "16:00",
            mode: "admin",
        });

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(await countBookings(date)).toBe(2);
        expect(await countOverlappingPairs(date)).toBe(1);
    });
});
