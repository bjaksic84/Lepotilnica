import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAbsences, customerBlacklist, customerNotes } from "@/db/schema";
import { createBookings } from "@/lib/booking-service";
import { normalizePhone } from "@/lib/customer-identity";
import {
    flagNoShow,
    getCustomerHistory,
    getCustomerSummaries,
    setAbsenceReason,
} from "@/lib/customer-insight";
import {
    SHORT_SERVICE_ID,
    clearBookings,
    migrate,
    nextOpenDate,
    removeDatabaseFile,
    seedCatalogue,
    testClient,
} from "./helpers/test-db";

/**
 * The admin Logs page: one record per customer, built from bookings.
 *
 * There is no customers table to keep in sync, so the property worth pinning
 * down is that bookings land on the right record — whether they come from the
 * public flow or from Karin's manual entry — and that a record's history is
 * split correctly into what happened, what is coming and what was cancelled.
 */
describe("customer insight", () => {
    let soon: string;
    let twoWeeksLater: string;

    beforeAll(async () => {
        removeDatabaseFile();
        // Setup runs on its own connection, closed again immediately: a second
        // open connection deadlocks against the code under test.
        const setupClient = testClient();
        try {
            await migrate(setupClient);
            await seedCatalogue(setupClient);
        } finally {
            setupClient.close();
        }
        soon = nextOpenDate();
        const later = new Date();
        later.setDate(later.getDate() + 14);
        twoWeeksLater = nextOpenDate(later);
    });

    afterAll(() => {
        removeDatabaseFile();
    });

    beforeEach(async () => {
        await db.delete(customerNotes);
        await db.delete(customerBlacklist);
        await db.delete(bookingAbsences);
        await clearBookings();
    });

    const book = async (
        customer: { customerName: string; customerEmail: string; customerPhone: string },
        date: string,
        time: string,
        mode: "public" | "admin" = "public"
    ) => {
        const result = await createBookings({ ...customer, serviceIds: [SHORT_SERVICE_ID], date, time, mode });
        expect(result.ok).toBe(true);
        return result.ok ? result.created[0] : null;
    };

    /** A row written straight to the table, for dates the public flow won't take. */
    const insertBooking = async (date: string, time: string, status: "confirmed" | "cancelled" = "confirmed") => {
        const row = await db
            .insert(bookings)
            .values({
                customerName: "Eva Kranjc",
                customerEmail: "eva@example.com",
                customerPhone: "041 555 666",
                serviceId: SHORT_SERVICE_ID,
                date,
                time,
                status,
            })
            .returning()
            .get();
        return row.id;
    };

    it("keeps a booking under a different name on the same customer (the John Doe case)", async () => {
        await book({ customerName: "John Doe", customerEmail: "john.doe@example.com", customerPhone: "+386 40 123 456" }, soon, "10:00");
        // Two weeks later: same e-mail and number, typed differently, name "John Joe".
        await book({ customerName: "John Joe", customerEmail: "John.Doe@example.com", customerPhone: "040 123 456" }, twoWeeksLater, "10:00");

        const customers = await getCustomerSummaries();
        expect(customers).toHaveLength(1);
        expect(customers[0].name).toBe("John Joe");
        expect(customers[0].otherNames).toEqual(["John Doe"]);
        expect(customers[0].upcoming).toBe(2);
        expect(customers[0].related).toEqual([]);
    });

    it("starts a new customer for a different phone number, linked by the e-mail", async () => {
        await book({ customerName: "John Doe", customerEmail: "john.doe@example.com", customerPhone: "040 123 456" }, soon, "10:00");
        await book({ customerName: "John Doe", customerEmail: "john.doe@example.com", customerPhone: "041 999 888" }, soon, "11:00");

        const customers = await getCustomerSummaries();
        expect(customers).toHaveLength(2);
        for (const c of customers) {
            expect(c.related).toHaveLength(1);
            expect(c.related[0].sharedBy).toBe("email");
        }
    });

    it("starts a new customer for a different e-mail, linked by the phone number", async () => {
        await book({ customerName: "John Doe", customerEmail: "john.doe@example.com", customerPhone: "040 123 456" }, soon, "10:00");
        await book({ customerName: "John Doe", customerEmail: "jd@example.com", customerPhone: "040 123 456" }, soon, "11:00");

        const customers = await getCustomerSummaries();
        expect(customers).toHaveLength(2);
        for (const c of customers) {
            expect(c.related.map((r) => r.sharedBy)).toEqual(["phone"]);
        }
    });

    it("files manual bookings exactly like online ones", async () => {
        await book({ customerName: "Ana", customerEmail: "ana@example.com", customerPhone: "031 222 333" }, soon, "09:00");

        // Karin enters a booking for Ana by hand, with the number in another
        // format and her full name: it joins Ana's record and updates the name.
        await book({ customerName: "Ana Novak", customerEmail: "ana@example.com", customerPhone: "+38631222333" }, twoWeeksLater, "18:00", "admin");
        let customers = await getCustomerSummaries();
        expect(customers).toHaveLength(1);
        expect(customers[0].name).toBe("Ana Novak");
        expect(customers[0].upcoming).toBe(2);

        // A manual booking for someone new starts a new record.
        await book({ customerName: "Maja Zupan", customerEmail: "maja@example.com", customerPhone: "070 111 222" }, soon, "21:00", "admin");
        customers = await getCustomerSummaries();
        expect(customers).toHaveLength(2);
        expect(customers.map((c) => c.name).sort()).toEqual(["Ana Novak", "Maja Zupan"]);
    });

    it("splits a customer's bookings into past, upcoming and cancelled by the salon's clock", async () => {
        const now = { date: "2026-06-15", time: "12:00" };
        await insertBooking("2026-05-04", "10:00");
        await insertBooking("2026-06-01", "10:00");
        await insertBooking("2026-06-15", "09:00"); // earlier today: a visit
        await insertBooking("2026-06-15", "12:00"); // starting right now: a visit
        await insertBooking("2026-06-15", "14:00"); // later today: upcoming
        await insertBooking("2026-07-01", "10:00");
        await insertBooking("2026-05-20", "10:00", "cancelled");
        await insertBooking("2026-06-20", "10:00", "cancelled"); // future but cancelled

        const [summary] = await getCustomerSummaries(now);
        expect(summary.visits).toBe(4);
        expect(summary.upcoming).toBe(2);
        expect(summary.cancelled).toBe(2);
        expect(summary.firstVisit).toBe("2026-05-04");
        // Last visit is the latest appointment that happened — not a future
        // booking, and not a cancelled one.
        expect(summary.lastVisit).toBe("2026-06-15");
        expect(summary.nextVisit).toBe("2026-06-15");
        expect(summary.totalSpent).toBe(4 * 30);
        // Visit days 05-04, 06-01, 06-15: 42 days over two gaps.
        expect(summary.averageGapDays).toBe(21);
        expect(summary.favouriteService).toBe("Test Short");

        const history = await getCustomerHistory(summary.key, now);
        expect(history).not.toBeNull();
        expect(history!.past.map((b) => `${b.date} ${b.time}`)).toEqual([
            "2026-06-15 12:00",
            "2026-06-15 09:00",
            "2026-06-01 10:00",
            "2026-05-04 10:00",
        ]);
        expect(history!.upcoming.map((b) => `${b.date} ${b.time}`)).toEqual(["2026-06-15 14:00", "2026-07-01 10:00"]);
        expect(history!.cancelled.map((b) => b.date)).toEqual(["2026-06-20", "2026-05-20"]);

        const visit = history!.past[2];
        expect(visit).toMatchObject({
            serviceName: "Test Short",
            categoryName: "Test",
            duration: 30,
            price: 30,
            endTime: "10:30",
            bookedAs: "Eva Kranjc",
        });
    });

    it("labels a no-show and keeps Karin's reason for the absence", async () => {
        const noShowId = await insertBooking("2026-05-04", "10:00");
        // What the no-show endpoint does to the booking.
        await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, noShowId));
        await flagNoShow(noShowId);

        expect(await setAbsenceReason(noShowId, "  Ill, called the next day  ")).toEqual({
            noShow: true,
            reason: "Ill, called the next day",
        });

        const cancelledId = await insertBooking("2026-05-10", "10:00", "cancelled");
        await setAbsenceReason(cancelledId, "Moved abroad");

        const [summary] = await getCustomerSummaries({ date: "2026-06-01", time: "12:00" });
        const history = await getCustomerHistory(summary.key, { date: "2026-06-01", time: "12:00" });
        const byId = new Map(history!.cancelled.map((b) => [b.id, b]));
        expect(byId.get(noShowId)).toMatchObject({ noShow: true, absenceReason: "Ill, called the next day" });
        expect(byId.get(cancelledId)).toMatchObject({ noShow: false, absenceReason: "Moved abroad" });

        // Clearing a reason keeps the no-show label, and a row left with
        // nothing in it goes away.
        expect(await setAbsenceReason(noShowId, "")).toEqual({ noShow: true, reason: null });
        await setAbsenceReason(cancelledId, "   ");
        const rows = await db.select().from(bookingAbsences);
        expect(rows).toEqual([expect.objectContaining({ bookingId: noShowId, noShow: true, reason: null })]);

        // Flagging again must not wipe a reason written in the meantime.
        await setAbsenceReason(noShowId, "Forgot");
        await flagNoShow(noShowId);
        const [row] = await db.select().from(bookingAbsences).where(eq(bookingAbsences.bookingId, noShowId));
        expect(row.reason).toBe("Forgot");
    });

    it("drops the absence record with its booking", async () => {
        const id = await insertBooking("2026-05-04", "10:00", "cancelled");
        await setAbsenceReason(id, "Ill");
        await db.delete(bookings).where(eq(bookings.id, id));
        expect(await db.select().from(bookingAbsences)).toEqual([]);
    });

    it("files notes under the e-mail + phone pair", async () => {
        await book({ customerName: "Mother", customerEmail: "family@example.com", customerPhone: "040 111 111" }, soon, "10:00");
        await book({ customerName: "Daughter", customerEmail: "family@example.com", customerPhone: "040 222 222" }, soon, "11:00");

        await db.insert(customerNotes).values({
            customerEmail: "family@example.com",
            customerPhone: normalizePhone("040 111 111"),
            note: "Allergic to acetone",
        });
        // Written before notes carried a phone: belongs to every record with the e-mail.
        await db.insert(customerNotes).values({ customerEmail: "family@example.com", note: "Prefers mornings" });

        const customers = await getCustomerSummaries();
        const mother = customers.find((c) => c.name === "Mother")!;
        const daughter = customers.find((c) => c.name === "Daughter")!;
        expect(mother.adminNotesCount).toBe(2);
        expect(daughter.adminNotesCount).toBe(1);

        const history = await getCustomerHistory(daughter.key);
        expect(history!.adminNotes.map((n) => n.note)).toEqual(["Prefers mornings"]);
    });
});
