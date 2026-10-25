import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAbsences, customerBlacklist, customerNotes } from "@/db/schema";
import { createBookings } from "@/lib/booking-service";
import { flagNoShow, getCustomerSummaries } from "@/lib/customer-insight";
import { NO_SHOW_LIMIT, blacklistCustomer, getBlacklistStatus, liftBlacklist } from "@/lib/blacklist";
import { POST as publicBookingPost } from "@/app/api/bookings/route";
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
 * The blacklist: who may not book online.
 *
 * Kept per customer (the e-mail + phone pair) and enforced on that exact
 * pair. A customer gets on it after NO_SHOW_LIMIT no-shows, counted from the
 * bookings Karin marked, or because she put them there; she can lift either,
 * which forgives the no-shows so far.
 */
describe("blacklist", () => {
    let date: string;
    let slot = 0;
    let ip = 0;
    const originalResendKey = process.env.RESEND_API_KEY;

    const ana = { customerName: "Ana Novak", customerEmail: "ana@example.com", customerPhone: "031 222 333" };

    beforeAll(async () => {
        // The public route sends e-mail after booking; with no key the Resend
        // client refuses before any request leaves the process.
        process.env.RESEND_API_KEY = "";
        removeDatabaseFile();
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
        if (originalResendKey === undefined) delete process.env.RESEND_API_KEY;
        else process.env.RESEND_API_KEY = originalResendKey;
        removeDatabaseFile();
    });

    beforeEach(async () => {
        await db.delete(customerBlacklist);
        await db.delete(customerNotes);
        await db.delete(bookingAbsences);
        await clearBookings();
        slot = 0;
    });

    /** A booking in its own half-hour slot, so none of them conflict. */
    const book = async (customer: typeof ana, serviceIds = [SHORT_SERVICE_ID]) => {
        const minutes = 8 * 60 + slot++ * 30 * serviceIds.length;
        const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        const result = await createBookings({ ...customer, serviceIds, date, time, mode: "admin" });
        if (!result.ok) throw new Error(result.error);
        return result.created.map((b) => b.id);
    };

    const noShow = async (bookingId: number) => {
        await flagNoShow(bookingId);
        await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, bookingId));
    };

    /** The public booking endpoint, as a customer's browser would call it. */
    const bookOnline = (customer: typeof ana) =>
        publicBookingPost(
            new Request("http://localhost/api/bookings", {
                method: "POST",
                headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++ip}` },
                body: JSON.stringify({ ...customer, serviceIds: [SHORT_SERVICE_ID], date, time: "18:00" }),
            })
        );

    it("blacklists automatically at the no-show limit", async () => {
        expect(NO_SHOW_LIMIT).toBe(2);
        const [first] = await book(ana);
        const [second] = await book(ana);

        await noShow(first);
        expect(await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).toMatchObject({
            noShows: 1,
            activeNoShows: 1,
            blacklisted: false,
        });

        await noShow(second);
        expect(await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).toMatchObject({
            noShows: 2,
            blacklisted: true,
            manual: false,
        });
    });

    it("cannot count the same booking twice", async () => {
        const [id] = await book(ana);
        await noShow(id);
        await noShow(id);
        expect((await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).noShows).toBe(1);
    });

    it("counts every service of a missed multi-service booking", async () => {
        // Three treatments' worth of lost time: intended.
        const ids = await book(ana, [SHORT_SERVICE_ID, SHORT_SERVICE_ID, SHORT_SERVICE_ID]);
        for (const id of ids) await noShow(id);
        expect(await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).toMatchObject({
            noShows: 3,
            blacklisted: true,
        });
    });

    it("applies to the exact e-mail + phone pair, however it is typed", async () => {
        await blacklistCustomer(ana.customerEmail, ana.customerPhone, "Rude to staff");

        expect((await getBlacklistStatus("ANA@example.com", "+386 31 222 333")).blacklisted).toBe(true);
        // A different number or a different e-mail is a different customer.
        expect((await getBlacklistStatus(ana.customerEmail, "041 999 888")).blacklisted).toBe(false);
        expect((await getBlacklistStatus("ana.novak@example.com", ana.customerPhone)).blacklisted).toBe(false);
    });

    it("lets Karin blacklist by hand, with a reason, and lift it again", async () => {
        await book(ana);
        expect(await blacklistCustomer(ana.customerEmail, ana.customerPhone, "  Rude to staff ")).toMatchObject({
            blacklisted: true,
            manual: true,
            reason: "Rude to staff",
        });

        expect(await liftBlacklist(ana.customerEmail, ana.customerPhone)).toMatchObject({
            blacklisted: false,
            manual: false,
            reason: null,
        });
    });

    it("forgives the no-shows so far when a blacklist is lifted", async () => {
        const ids = [...(await book(ana)), ...(await book(ana)), ...(await book(ana)), ...(await book(ana))];
        await noShow(ids[0]);
        await noShow(ids[1]);
        expect((await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).blacklisted).toBe(true);

        expect(await liftBlacklist(ana.customerEmail, ana.customerPhone)).toMatchObject({
            noShows: 2,
            activeNoShows: 0,
            blacklisted: false,
        });

        // Later no-shows count from zero again.
        await noShow(ids[2]);
        expect((await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).blacklisted).toBe(false);
        await noShow(ids[3]);
        expect((await getBlacklistStatus(ana.customerEmail, ana.customerPhone)).blacklisted).toBe(true);
    });

    it("shows on the customer's own Logs record only, and flags it on linked ones", async () => {
        const [id1] = await book(ana);
        const [id2] = await book(ana);
        await book({ ...ana, customerName: "Ana (other phone)", customerPhone: "041 999 888" });
        await noShow(id1);
        await noShow(id2);

        const customers = await getCustomerSummaries();
        const blacklisted = customers.find((c) => c.phone === ana.customerPhone)!;
        const sibling = customers.find((c) => c.phone === "041 999 888")!;
        expect(blacklisted.blacklist.blacklisted).toBe(true);
        expect(sibling.blacklist.blacklisted).toBe(false);
        expect(sibling.blacklist.noShows).toBe(0);
        expect(sibling.related).toEqual([expect.objectContaining({ key: blacklisted.key, blacklisted: true })]);
    });

    it("keeps a blacklisted customer on the Logs page after their bookings are deleted", async () => {
        const [id] = await book(ana);
        await blacklistCustomer(ana.customerEmail, ana.customerPhone, null);
        await db.delete(bookings).where(eq(bookings.id, id));

        const customers = await getCustomerSummaries();
        expect(customers).toHaveLength(1);
        expect(customers[0].blacklist.blacklisted).toBe(true);
    });

    describe("the public booking endpoint", () => {
        it("refuses a blacklisted customer, without naming no-shows", async () => {
            await blacklistCustomer(ana.customerEmail, ana.customerPhone, "Rude to staff");
            const res = await bookOnline({ ...ana, customerPhone: "+386 31 222 333" });
            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toMatch(/pokličite/);
            expect(body.error).not.toMatch(/no-show|Rude/i);
        });

        it("still requires an e-mail, which Karin's own entries do not", async () => {
            const res = await bookOnline({ ...ana, customerEmail: "" });
            expect(res.status).toBe(400);
            expect((await res.json()).details.customerEmail).toBeDefined();
        });

        it("accepts the same e-mail with a different phone number", async () => {
            await blacklistCustomer(ana.customerEmail, ana.customerPhone, null);
            const res = await bookOnline({ ...ana, customerPhone: "041 999 888" });
            expect(res.status).toBe(201);
        });

        it("still takes bookings if the blacklist tables are missing (code deployed before the migration)", async () => {
            const client = testClient();
            try {
                await client.execute("ALTER TABLE customer_blacklist RENAME TO customer_blacklist_hidden");
            } finally {
                client.close();
            }
            try {
                const res = await bookOnline(ana);
                expect(res.status).toBe(201);
            } finally {
                const restore = testClient();
                try {
                    await restore.execute("ALTER TABLE customer_blacklist_hidden RENAME TO customer_blacklist");
                } finally {
                    restore.close();
                }
            }
        });
    });
});
