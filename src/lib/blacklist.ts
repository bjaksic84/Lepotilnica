import { db } from "@/db";
import { bookings, bookingAbsences, customerBlacklist, type CustomerBlacklistEntry } from "@/db/schema";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { customerKey, parseCustomerKey } from "@/lib/customer-identity";

/**
 * The blacklist: customers who may not book online.
 *
 * Kept per customer — the e-mail + phone pair the Logs page groups by — and
 * enforced on that exact pair. A booking under a different e-mail or a
 * different number is a different customer and goes through; the Logs page
 * marks a blacklisted customer among a record's "possibly the same person"
 * links, so that case is visible to Karin rather than silent.
 *
 * Two ways onto it: Karin blacklists someone by hand, or a customer reaches
 * NO_SHOW_LIMIT no-shows. No-shows are counted from the bookings she marked
 * (booking_absences.no_show) rather than kept in a separate counter, so marking
 * the same booking twice cannot count twice, and a booking with three services
 * nobody turned up for counts three times — three treatments' worth of lost
 * time, which is intended.
 *
 * Lifting clears her flag and forgives the no-shows so far; later ones count
 * from zero. Manual bookings are never refused (she is booking the person
 * deliberately), but the form warns her.
 */
export const NO_SHOW_LIMIT = 2;

export type BlacklistStatus = {
    /** Every booking marked as a no-show. */
    noShows: number;
    /** No-shows since the blacklist was last lifted; these count toward the limit. */
    activeNoShows: number;
    /** Blacklisted by Karin by hand. */
    manual: boolean;
    reason: string | null;
    blacklisted: boolean;
};

type Entry = Pick<CustomerBlacklistEntry, "customerEmail" | "customerPhone" | "blocked" | "reason" | "noShowsForgiven">;

export const CLEAR_STATUS: BlacklistStatus = {
    noShows: 0,
    activeNoShows: 0,
    manual: false,
    reason: null,
    blacklisted: false,
};

export function blacklistStatus(noShows: number, entry?: Entry): BlacklistStatus {
    const activeNoShows = Math.max(0, noShows - (entry?.noShowsForgiven ?? 0));
    const manual = entry?.blocked ?? false;
    return {
        noShows,
        activeNoShows,
        manual,
        reason: manual ? (entry?.reason ?? null) : null,
        blacklisted: manual || activeNoShows >= NO_SHOW_LIMIT,
    };
}

/**
 * Status of every customer with a no-show or a blacklist decision, by
 * customer key. `noShowKeys` holds one key per booking marked as a no-show.
 */
export function buildBlacklistStatuses(noShowKeys: string[], entries: Entry[]): Map<string, BlacklistStatus> {
    const counts = new Map<string, number>();
    for (const key of noShowKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
    const byKey = new Map(entries.map((e) => [customerKey(e.customerEmail, e.customerPhone), e]));
    const keys = new Set([...counts.keys(), ...byKey.keys()]);
    return new Map([...keys].map((key) => [key, blacklistStatus(counts.get(key) ?? 0, byKey.get(key))]));
}

/* ── Loaders ──────────────────────────────────────────── */

/** One customer key per booking marked as a no-show. */
async function selectNoShowKeys(where?: SQL): Promise<string[]> {
    const rows = await db
        .select({ email: bookings.customerEmail, phone: bookings.customerPhone })
        .from(bookingAbsences)
        .innerJoin(bookings, eq(bookings.id, bookingAbsences.bookingId))
        .where(and(eq(bookingAbsences.noShow, true), where));
    return rows.map((r) => customerKey(r.email, r.phone));
}

export async function selectBlacklistEntries(): Promise<Entry[]> {
    return db.select().from(customerBlacklist);
}

export async function getBlacklistStatuses(): Promise<Map<string, BlacklistStatus>> {
    const [keys, entries] = await Promise.all([selectNoShowKeys(), selectBlacklistEntries()]);
    return buildBlacklistStatuses(keys, entries);
}

export async function getBlacklistStatus(email: string, phone: string | null | undefined): Promise<BlacklistStatus> {
    const key = customerKey(email, phone);
    const pair = parseCustomerKey(key)!;
    const [keys, entry] = await Promise.all([
        // Narrow by e-mail in SQL; the phone is compared after normalisation.
        selectNoShowKeys(sql`lower(trim(${bookings.customerEmail})) = ${pair.email}`),
        db
            .select()
            .from(customerBlacklist)
            .where(and(eq(customerBlacklist.customerEmail, pair.email), eq(customerBlacklist.customerPhone, pair.phone)))
            .get(),
    ]);
    return blacklistStatus(keys.filter((k) => k === key).length, entry);
}

/* ── Karin's decisions ────────────────────────────────── */

async function upsertEntry(
    email: string,
    phone: string | null | undefined,
    values: Pick<Entry, "blocked" | "reason"> & Partial<Pick<Entry, "noShowsForgiven">>
): Promise<void> {
    const pair = parseCustomerKey(customerKey(email, phone))!;
    await db
        .insert(customerBlacklist)
        .values({ customerEmail: pair.email, customerPhone: pair.phone, ...values })
        .onConflictDoUpdate({
            target: [customerBlacklist.customerEmail, customerBlacklist.customerPhone],
            set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
}

export async function blacklistCustomer(
    email: string,
    phone: string | null | undefined,
    reason?: string | null
): Promise<BlacklistStatus> {
    await upsertEntry(email, phone, { blocked: true, reason: reason?.trim() || null });
    return getBlacklistStatus(email, phone);
}

/** Lift a blacklist, manual or earned, forgiving every no-show so far. */
export async function liftBlacklist(email: string, phone: string | null | undefined): Promise<BlacklistStatus> {
    const current = await getBlacklistStatus(email, phone);
    await upsertEntry(email, phone, { blocked: false, reason: null, noShowsForgiven: current.noShows });
    return getBlacklistStatus(email, phone);
}
