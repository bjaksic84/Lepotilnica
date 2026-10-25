import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAbsences, customerBlacklist, customerNotes, customerProfiles } from "@/db/schema";
import { createBookings } from "@/lib/booking-service";
import { ANONYMISED_NAME, customerKey, normalizePhone } from "@/lib/customer-identity";
import { flagNoShow, getCustomerHistory, getCustomerSummaries, setAbsenceReason } from "@/lib/customer-insight";
import { anonymiseCustomer, createCustomer, updateCustomer } from "@/lib/customer-admin";
import { blacklistCustomer, getBlacklistStatus, liftBlacklist } from "@/lib/blacklist";
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
 * Creating, editing and deleting customers from Logs.
 *
 * A customer is the e-mail + phone pair shared by bookings, notes, a blacklist
 * entry and a profile, so the properties worth pinning down are that an edit
 * moves all of them together, a merge joins two customers only when asked,
 * and a delete strips the person while keeping the revenue — and the block.
 */
describe("customer admin", () => {
    let upcomingDate: string;
    let slot = 0;

    const ana = { name: "Ana Novak", email: "ana@example.com", phone: "031 222 333" };
    const anaKey = customerKey(ana.email, ana.phone);

    beforeAll(async () => {
        removeDatabaseFile();
        const setupClient = testClient();
        try {
            await migrate(setupClient);
            await seedCatalogue(setupClient);
        } finally {
            setupClient.close();
        }
        upcomingDate = nextOpenDate();
    });

    afterAll(() => {
        removeDatabaseFile();
    });

    beforeEach(async () => {
        await db.delete(customerProfiles);
        await db.delete(customerBlacklist);
        await db.delete(customerNotes);
        await db.delete(bookingAbsences);
        await clearBookings();
        slot = 0;
    });

    /** A booking for `who` on `date`, each in its own slot. */
    const book = async (who: { name: string; email: string; phone: string }, date = "2026-05-04") => {
        const minutes = 8 * 60 + slot++ * 30;
        const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        const result = await createBookings({
            customerName: who.name,
            customerEmail: who.email,
            customerPhone: who.phone,
            serviceIds: [SHORT_SERVICE_ID],
            date,
            time,
            mode: "admin",
        });
        if (!result.ok) throw new Error(result.error);
        return result.created[0].id;
    };

    const customerAt = async (key: string) => (await getCustomerSummaries()).find((c) => c.key === key);

    describe("create", () => {
        it("adds a customer who has not booked, with a note", async () => {
            expect(await createCustomer(ana, "Found us on Instagram")).toEqual({ ok: true, key: anaKey });

            const customer = await customerAt(anaKey);
            expect(customer).toMatchObject({ name: "Ana Novak", visits: 0, upcoming: 0, adminNotesCount: 1, blacklistOnly: false });
        });

        it("refuses a second customer with the same e-mail and phone, however typed", async () => {
            await createCustomer(ana);
            const again = await createCustomer({ ...ana, email: "ANA@example.com", phone: "+386 31 222 333" });
            expect(again.ok).toBe(false);
            if (!again.ok) expect(again.existing.key).toBe(anaKey);
        });

        it("receives the first booking made with those details", async () => {
            await createCustomer(ana);
            await book({ ...ana, phone: "+38631222333" }, upcomingDate);
            const customers = await getCustomerSummaries();
            expect(customers).toHaveLength(1);
            expect(customers[0]).toMatchObject({ key: anaKey, upcoming: 1 });
        });
    });

    describe("edit", () => {
        it("renames until the customer books again under another name", async () => {
            await book({ ...ana, name: "Ana" });
            expect(await updateCustomer(anaKey, ana)).toEqual({ ok: true, key: anaKey, merged: false });
            expect((await customerAt(anaKey))!.name).toBe("Ana Novak");

            // A later booking is a newer entry than her correction.
            await db.update(customerProfiles).set({ updatedAt: "2000-01-01 00:00:00" });
            await book({ ...ana, name: "Ana N." });
            const customer = (await customerAt(anaKey))!;
            expect(customer.name).toBe("Ana N.");
            expect(customer.otherNames).toEqual(expect.arrayContaining(["Ana", "Ana Novak"]));
        });

        it("moves bookings, notes and a blacklist to new contact details", async () => {
            const id = await book(ana);
            await db.insert(customerNotes).values({ customerEmail: ana.email, customerPhone: normalizePhone(ana.phone), note: "Allergic to acetone" });
            await blacklistCustomer(ana.email, ana.phone, "Rude");

            const moved = { ...ana, email: "ana.novak@example.com", phone: "041 555 666" };
            const result = await updateCustomer(anaKey, moved);
            const newKey = customerKey(moved.email, moved.phone);
            expect(result).toEqual({ ok: true, key: newKey, merged: false });

            const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
            expect(row).toMatchObject({ customerEmail: "ana.novak@example.com", customerPhone: "041 555 666" });

            const customers = await getCustomerSummaries();
            expect(customers.map((c) => c.key)).toEqual([newKey]);
            expect(customers[0]).toMatchObject({ visits: 1, adminNotesCount: 1 });
            expect(customers[0].blacklist).toMatchObject({ blacklisted: true, reason: "Rude" });
            expect((await getBlacklistStatus(ana.email, ana.phone)).blacklisted).toBe(false);
        });

        it("rewrites the bookings even when only the formatting changes", async () => {
            const id = await book(ana);
            await updateCustomer(anaKey, { ...ana, phone: "+386 31 222 333" });
            const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
            expect(row.customerPhone).toBe("+386 31 222 333");
        });

        it("merges into an existing customer only when asked", async () => {
            const sameAna = { ...ana, name: "Ana (new number)", phone: "041 555 666" };
            await book(ana);
            await book(sameAna);
            await book(sameAna);
            await db.insert(customerNotes).values({ customerEmail: ana.email, customerPhone: normalizePhone(ana.phone), note: "Old number note" });
            await blacklistCustomer(sameAna.email, sameAna.phone, "Rude");

            const targetKey = customerKey(sameAna.email, sameAna.phone);
            const refused = await updateCustomer(anaKey, sameAna);
            expect(refused).toMatchObject({ ok: false, reason: "conflict" });
            expect(await getCustomerSummaries()).toHaveLength(2);

            expect(await updateCustomer(anaKey, sameAna, { merge: true })).toEqual({ ok: true, key: targetKey, merged: true });
            const customers = await getCustomerSummaries();
            expect(customers).toHaveLength(1);
            expect(customers[0]).toMatchObject({ key: targetKey, visits: 3, adminNotesCount: 1 });
            expect(customers[0].blacklist.blacklisted).toBe(true);
        });

        it("combines two blacklist entries on a merge", async () => {
            const other = { ...ana, phone: "041 555 666" };
            await book(ana);
            await book(other);
            await blacklistCustomer(ana.email, ana.phone, "Late twice");
            await blacklistCustomer(other.email, other.phone, "Rude");
            await updateCustomer(anaKey, other, { merge: true });
            const status = await getBlacklistStatus(other.email, other.phone);
            expect(status).toMatchObject({ blacklisted: true, manual: true });
            expect(status.reason).toContain("Late twice");
            expect(status.reason).toContain("Rude");
        });

        it("reports an unknown customer", async () => {
            expect(await updateCustomer("nobody@example.com|+38640000000", ana)).toEqual({ ok: false, reason: "not_found" });
        });
    });

    describe("customers without an e-mail", () => {
        const mojca = { name: "Mojca Zupan", email: "", phone: "070 111 222" };
        const mojcaKey = customerKey("", mojca.phone);

        it("can be added, and receive Karin's bookings", async () => {
            expect(await createCustomer(mojca, "From Limebooking")).toEqual({ ok: true, key: mojcaKey });
            await book({ ...mojca, phone: "+386 70 111 222" }, upcomingDate);

            const customer = (await customerAt(mojcaKey))!;
            expect(customer).toMatchObject({ name: "Mojca Zupan", email: "", upcoming: 1, adminNotesCount: 1 });
            expect((await getCustomerHistory(mojcaKey))!.upcoming).toHaveLength(1);
        });

        it("are not linked to each other for having no e-mail", async () => {
            await createCustomer(mojca);
            await createCustomer({ name: "Petra Kos", email: "", phone: "041 333 444" });
            const customers = await getCustomerSummaries();
            expect(customers).toHaveLength(2);
            for (const c of customers) expect(c.related).toEqual([]);
        });

        it("are linked by phone to the same number with an e-mail, and merge once it is added", async () => {
            await createCustomer(mojca);
            await book(mojca);
            await book({ ...mojca, email: "mojca@example.com" });
            const linked = (await customerAt(mojcaKey))!;
            expect(linked.related).toEqual([expect.objectContaining({ sharedBy: "phone", email: "mojca@example.com" })]);

            const result = await updateCustomer(mojcaKey, { ...mojca, email: "mojca@example.com" }, { merge: true });
            expect(result).toMatchObject({ ok: true, merged: true });
            const customers = await getCustomerSummaries();
            expect(customers).toHaveLength(1);
            expect(customers[0]).toMatchObject({ email: "mojca@example.com", visits: 2 });
        });

        it("can be deleted like anyone else", async () => {
            const id = await book(mojca);
            expect(await anonymiseCustomer(mojcaKey)).toMatchObject({ ok: true, anonymisedBookings: 1 });
            const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
            expect(row).toMatchObject({ customerName: ANONYMISED_NAME, customerEmail: "", customerPhone: null });
            expect(await getCustomerSummaries()).toEqual([]);
        });
    });

    describe("delete", () => {
        it("is refused while the customer has an appointment to come", async () => {
            await book(ana);
            await book(ana, upcomingDate);
            expect(await anonymiseCustomer(anaKey)).toEqual({ ok: false, reason: "upcoming", upcoming: 1 });
            expect(await customerAt(anaKey)).toBeDefined();
        });

        it("anonymises: the person goes, the bookings stay for revenue", async () => {
            const past = await book(ana);
            const cancelledFuture = await book(ana, upcomingDate);
            await db.update(bookings).set({ status: "cancelled", notes: "Running late" }).where(eq(bookings.id, cancelledFuture));
            await setAbsenceReason(cancelledFuture, "Ill");
            await createCustomer({ ...ana, email: "someone-else@example.com" });
            await updateCustomer(anaKey, ana); // leaves a profile behind for Ana
            await db.insert(customerNotes).values({ customerEmail: ana.email, customerPhone: normalizePhone(ana.phone), note: "Allergic" });

            expect(await anonymiseCustomer(anaKey)).toEqual({ ok: true, anonymisedBookings: 2, keptBlacklist: false });

            const rows = await db.select().from(bookings).where(inArray(bookings.id, [past, cancelledFuture]));
            expect(rows).toHaveLength(2);
            for (const row of rows) {
                expect(row).toMatchObject({ customerName: ANONYMISED_NAME, customerEmail: "", customerPhone: null, notes: null, cancellationToken: null });
            }
            expect(await db.select().from(bookingAbsences)).toEqual([]);
            expect(await db.select().from(customerNotes)).toEqual([]);
            expect(await db.select().from(customerProfiles).where(eq(customerProfiles.customerEmail, ana.email))).toEqual([]);

            // Nobody in Logs is the anonymised bookings' customer.
            const customers = await getCustomerSummaries();
            expect(customers.map((c) => c.email)).toEqual(["someone-else@example.com"]);
            expect(await getCustomerHistory(anaKey)).toEqual({ upcoming: [], past: [], cancelled: [], adminNotes: [] });
        });

        it("keeps an earned blacklist in force, as a bare record that can be lifted", async () => {
            const first = await book(ana);
            const second = await book(ana);
            for (const id of [first, second]) {
                await flagNoShow(id);
                await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, id));
            }
            expect((await getBlacklistStatus(ana.email, ana.phone)).blacklisted).toBe(true);

            expect(await anonymiseCustomer(anaKey)).toMatchObject({ ok: true, keptBlacklist: true });

            // Still refused online, though the no-shows no longer point at anyone.
            const status = await getBlacklistStatus(ana.email, ana.phone);
            expect(status).toMatchObject({ blacklisted: true, manual: true, noShows: 0 });
            expect(status.reason).toMatch(/2 no-shows/);
            const [record] = await getCustomerSummaries();
            expect(record).toMatchObject({ key: anaKey, blacklistOnly: true });

            // Lifting it leaves nothing of them behind.
            await liftBlacklist(ana.email, ana.phone);
            expect(await db.select().from(customerBlacklist)).toEqual([]);
            expect(await getCustomerSummaries()).toEqual([]);
        });

        it("keeps older e-mail-only notes while someone else still has the e-mail", async () => {
            await book(ana);
            await book({ ...ana, name: "Ana's daughter", phone: "041 555 666" });
            await db.insert(customerNotes).values({ customerEmail: ana.email, customerPhone: null, note: "Family account" });

            await anonymiseCustomer(anaKey);
            expect((await db.select().from(customerNotes)).map((n) => n.note)).toEqual(["Family account"]);
        });
    });
});
