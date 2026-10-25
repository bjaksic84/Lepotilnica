import { db } from "@/db";
import { bookings, bookingAbsences, customerBlacklist, customerNotes, customerProfiles } from "@/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { ANONYMISED_NAME, customerKey, normalizePhone, parseCustomerKey } from "@/lib/customer-identity";
import { getCustomerSummaries, type CustomerSummary, type SalonClock } from "@/lib/customer-insight";
import { getBlacklistStatus } from "@/lib/blacklist";
import { salonNow } from "@/lib/schedule";

/**
 * Creating, editing and deleting customers from the Logs page.
 *
 * A customer is not a row but an e-mail + phone pair that bookings, notes, a
 * blacklist entry and a profile share (see customer-identity.ts). So:
 *
 *   create  writes a profile, so the pair exists before any booking does; the
 *           first booking with those details lands on it.
 *   edit    moves everything filed under the old pair to the new one, and
 *           writes the name as a profile. If the new pair is already somebody,
 *           the two become one customer — but only once Karin confirms.
 *   delete  anonymises: name, e-mail, phone, notes and absence records go, and
 *           the bookings stay as "Izbrisana stranka" so Analytics' revenue is
 *           unchanged. Refused while anything is still to come, so nobody loses
 *           an appointment without being told. A blacklist stays in force.
 */

type Pair = { email: string; phone: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CustomerDetails = { name: string; email: string; phone: string };

const pairOf = (email: string, phone: string | null | undefined): Pair => parseCustomerKey(customerKey(email, phone))!;

const emailMatches = (column: typeof bookings.customerEmail | typeof customerNotes.customerEmail, email: string) =>
    sql`lower(trim(${column})) = ${email}`;

/** Ids of the bookings filed under a pair. The phone is compared normalised, which SQL can't do. */
async function bookingIdsOf(tx: Tx, pair: Pair): Promise<number[]> {
    const rows = await tx
        .select({ id: bookings.id, phone: bookings.customerPhone })
        .from(bookings)
        .where(emailMatches(bookings.customerEmail, pair.email));
    return rows.filter((r) => normalizePhone(r.phone) === pair.phone).map((r) => r.id);
}

const blacklistAt = (pair: Pair) =>
    and(eq(customerBlacklist.customerEmail, pair.email), eq(customerBlacklist.customerPhone, pair.phone));
const profileAt = (pair: Pair) =>
    and(eq(customerProfiles.customerEmail, pair.email), eq(customerProfiles.customerPhone, pair.phone));

/* ── Create ───────────────────────────────────────────── */

export type CreateResult = { ok: true; key: string } | { ok: false; existing: CustomerSummary };

export async function createCustomer(details: CustomerDetails, note?: string): Promise<CreateResult> {
    const key = customerKey(details.email, details.phone);
    const existing = (await getCustomerSummaries()).find((c) => c.key === key);
    if (existing) return { ok: false, existing };

    const pair = pairOf(details.email, details.phone);
    await db.transaction(async (tx) => {
        await tx.insert(customerProfiles).values({ customerEmail: pair.email, customerPhone: pair.phone, name: details.name.trim() });
        if (note?.trim()) {
            await tx.insert(customerNotes).values({
                customerEmail: pair.email,
                customerPhone: pair.phone || null,
                note: note.trim(),
                author: "admin",
            });
        }
    });
    return { ok: true, key };
}

/* ── Edit ─────────────────────────────────────────────── */

export type UpdateResult =
    | { ok: true; key: string; merged: boolean }
    | { ok: false; reason: "not_found" }
    | { ok: false; reason: "conflict"; existing: CustomerSummary };

/**
 * Give a customer new details. `merge` must be set to join a customer that
 * already has the new e-mail + phone; without it the clash is reported back.
 */
export async function updateCustomer(
    key: string,
    details: CustomerDetails,
    { merge = false }: { merge?: boolean } = {}
): Promise<UpdateResult> {
    const from = parseCustomerKey(key);
    if (!from) return { ok: false, reason: "not_found" };
    const newKey = customerKey(details.email, details.phone);
    const to = pairOf(details.email, details.phone);
    const moving = newKey !== key;

    const summaries = await getCustomerSummaries();
    if (!summaries.some((c) => c.key === key)) return { ok: false, reason: "not_found" };
    const target = moving ? summaries.find((c) => c.key === newKey) : undefined;
    if (target && !merge) return { ok: false, reason: "conflict", existing: target };

    await db.transaction(async (tx) => {
        // Every booking takes the details as Karin typed them — even when only
        // the formatting changed — so the history stays on one record and
        // later e-mails reach the address she entered.
        const ids = await bookingIdsOf(tx, from);
        if (ids.length > 0) {
            await tx
                .update(bookings)
                .set({ customerEmail: details.email.trim(), customerPhone: details.phone.trim() })
                .where(inArray(bookings.id, ids));
        }

        if (moving) {
            // Notes filed under the pair move with it. Older notes with no
            // phone belong to the e-mail rather than this customer, and stay.
            await tx
                .update(customerNotes)
                .set({ customerEmail: to.email, customerPhone: to.phone || null })
                .where(and(emailMatches(customerNotes.customerEmail, from.email), eq(customerNotes.customerPhone, from.phone)));

            await moveBlacklistEntry(tx, from, to);
            await tx.delete(customerProfiles).where(profileAt(from));
        }

        // The edited name is the newest thing anyone has entered, so it is what
        // the record shows — until the customer books under another spelling.
        await tx
            .insert(customerProfiles)
            .values({ customerEmail: to.email, customerPhone: to.phone, name: details.name.trim() })
            .onConflictDoUpdate({
                target: [customerProfiles.customerEmail, customerProfiles.customerPhone],
                set: { name: details.name.trim(), updatedAt: sql`CURRENT_TIMESTAMP` },
            });
    });

    return { ok: true, key: newKey, merged: !!target };
}

/**
 * Move a blacklist entry to another pair, combining it with one already
 * there. No-shows move with the bookings, so the counts forgiven add up too.
 */
async function moveBlacklistEntry(tx: Tx, from: Pair, to: Pair): Promise<void> {
    const source = await tx.select().from(customerBlacklist).where(blacklistAt(from)).get();
    if (!source) return;
    const existing = await tx.select().from(customerBlacklist).where(blacklistAt(to)).get();

    if (!existing) {
        await tx
            .update(customerBlacklist)
            .set({ customerEmail: to.email, customerPhone: to.phone, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(blacklistAt(from));
        return;
    }
    await tx
        .update(customerBlacklist)
        .set({
            blocked: existing.blocked || source.blocked,
            reason: [existing.reason, source.reason].filter(Boolean).join("; ") || null,
            noShowsForgiven: existing.noShowsForgiven + source.noShowsForgiven,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(blacklistAt(to));
    await tx.delete(customerBlacklist).where(blacklistAt(from));
}

/* ── Delete ───────────────────────────────────────────── */

export type DeleteResult =
    | { ok: true; anonymisedBookings: number; keptBlacklist: boolean }
    | { ok: false; reason: "not_found" }
    | { ok: false; reason: "upcoming"; upcoming: number };

export async function anonymiseCustomer(key: string, now: SalonClock = salonNow()): Promise<DeleteResult> {
    const pair = parseCustomerKey(key);
    if (!pair) return { ok: false, reason: "not_found" };

    const summaries = await getCustomerSummaries(now);
    const customer = summaries.find((c) => c.key === key);
    if (!customer) return { ok: false, reason: "not_found" };
    if (customer.upcoming > 0) return { ok: false, reason: "upcoming", upcoming: customer.upcoming };

    // Read before the bookings lose their details: an earned blacklist is
    // counted from them and would otherwise lapse with the anonymising.
    const status = await getBlacklistStatus(pair.email, pair.phone);
    const emailSharedWithOthers = summaries.some((c) => c.key !== key && parseCustomerKey(c.key)!.email === pair.email);

    let anonymisedBookings = 0;
    await db.transaction(async (tx) => {
        const ids = await bookingIdsOf(tx, pair);
        anonymisedBookings = ids.length;
        if (ids.length > 0) {
            // Karin's reasons for an absence describe the person, so they go.
            await tx.delete(bookingAbsences).where(inArray(bookingAbsences.bookingId, ids));
            // The cancellation token goes too: it is the one way back to a
            // booking from outside, and there is nobody left to hold it.
            await tx
                .update(bookings)
                .set({ customerName: ANONYMISED_NAME, customerEmail: "", customerPhone: null, notes: null, cancellationToken: null })
                .where(inArray(bookings.id, ids));
        }

        await tx
            .delete(customerNotes)
            .where(and(emailMatches(customerNotes.customerEmail, pair.email), eq(customerNotes.customerPhone, pair.phone)));
        if (!emailSharedWithOthers) {
            // Older notes filed under the e-mail alone belonged only to them.
            await tx
                .delete(customerNotes)
                .where(and(emailMatches(customerNotes.customerEmail, pair.email), isNull(customerNotes.customerPhone)));
        }
        await tx.delete(customerProfiles).where(profileAt(pair));

        if (status.blacklisted) {
            // The block survives as Karin's own decision: the no-shows it may
            // have been earned by no longer point at anyone.
            const reason = status.manual
                ? status.reason
                : `${status.activeNoShows} no-shows before the customer was deleted`;
            await tx
                .insert(customerBlacklist)
                .values({ customerEmail: pair.email, customerPhone: pair.phone, blocked: true, reason, noShowsForgiven: 0 })
                .onConflictDoUpdate({
                    target: [customerBlacklist.customerEmail, customerBlacklist.customerPhone],
                    set: { blocked: true, reason, noShowsForgiven: 0, updatedAt: sql`CURRENT_TIMESTAMP` },
                });
        } else {
            await tx.delete(customerBlacklist).where(blacklistAt(pair));
        }
    });

    return { ok: true, anonymisedBookings, keptBlacklist: status.blacklisted };
}
