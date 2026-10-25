import { db } from "@/db";
import { bookings, services, categories, customerNotes, bookingAbsences, customerProfiles } from "@/db/schema";
import { eq, sql, type SQL } from "drizzle-orm";
import { customerKey, isAnonymised, normalizeEmail, normalizePhone, parseCustomerKey } from "@/lib/customer-identity";
import { salonNow, timeToMinutes, minutesToTime } from "@/lib/schedule";
import {
    CLEAR_STATUS,
    buildBlacklistStatuses,
    selectBlacklistEntries,
    type BlacklistStatus,
} from "@/lib/blacklist";

/**
 * Per-customer insight for the admin Logs page.
 *
 * Customers are derived from bookings (see customer-identity.ts for the
 * e-mail + phone rule), so a booking Karin enters by hand lands in exactly the
 * same place as one made online: a new pair starts a new customer, a known pair
 * adds to theirs. There is nothing to keep in sync.
 *
 * The grouping and arithmetic are pure functions over rows, so they can be
 * tested without a database; the loaders at the bottom only fetch the rows.
 */

export type SalonClock = { date: string; time: string };

/** One booking row with everything the Logs page shows about it. */
export type InsightBooking = {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    date: string;
    time: string;
    status: "pending" | "confirmed" | "cancelled";
    notes: string | null;
    createdAt: string;
    serviceName: string | null;
    categoryName: string | null;
    serviceDuration: number | null;
    servicePrice: number | null;
    noShow: boolean;
    absenceReason: string | null;
};

export type InsightNote = {
    id: number;
    customerEmail: string;
    customerPhone: string | null;
    note: string;
    createdAt: string;
};

/** A customer Karin added or renamed herself (see customerProfiles). */
export type InsightProfile = {
    customerEmail: string;
    customerPhone: string;
    name: string;
    updatedAt: string;
};

export type RelatedCustomer = {
    key: string;
    name: string;
    email: string;
    phone: string | null;
    sharedBy: "email" | "phone";
    blacklisted: boolean;
};

export type CustomerSummary = {
    key: string;
    /** Whichever was entered last: the name on their newest booking, or Karin's. */
    name: string;
    /** Other spellings used on earlier bookings, most recent first. */
    otherNames: string[];
    email: string;
    phone: string | null;
    /** Appointments that have started and were not cancelled. */
    visits: number;
    upcoming: number;
    cancelled: number;
    /** Sum of the visits' service prices, at today's prices. */
    totalSpent: number;
    firstVisit: string | null;
    lastVisit: string | null;
    nextVisit: string | null;
    favouriteService: string | null;
    /** Average days between visit dates, once there are two. */
    averageGapDays: number | null;
    /** Latest booking date of any kind; the list is sorted by it. */
    latestBookingDate: string | null;
    /** No-shows and blacklist state for this e-mail + phone pair. */
    blacklist: BlacklistStatus;
    adminNotesCount: number;
    bookingNotesCount: number;
    /** Other customers sharing this e-mail or this phone number. */
    related: RelatedCustomer[];
    /**
     * Nothing left but a blacklist entry — typically a deleted customer kept
     * blocked. There is nothing to edit, book or delete, only a block to lift.
     */
    blacklistOnly: boolean;
};

export type HistoryEntry = {
    id: number;
    date: string;
    time: string;
    endTime: string | null;
    serviceName: string | null;
    categoryName: string | null;
    duration: number | null;
    price: number | null;
    status: InsightBooking["status"];
    notes: string | null;
    /** The name typed on this particular booking. */
    bookedAs: string;
    createdAt: string;
    noShow: boolean;
    absenceReason: string | null;
};

export type CustomerHistory = {
    upcoming: HistoryEntry[];
    past: HistoryEntry[];
    cancelled: HistoryEntry[];
    adminNotes: { id: number; note: string; createdAt: string }[];
};

/* ── Pure helpers ─────────────────────────────────────── */

/**
 * Has the appointment started, by the salon's clock? One that starts this
 * very minute counts as started: it is no longer something to look forward to.
 */
export function hasStarted(b: Pick<InsightBooking, "date" | "time">, now: SalonClock): boolean {
    return `${b.date} ${b.time}` <= `${now.date} ${now.time}`;
}

export function phaseOf(
    b: Pick<InsightBooking, "date" | "time" | "status">,
    now: SalonClock
): "upcoming" | "past" | "cancelled" {
    if (b.status === "cancelled") return "cancelled";
    return hasStarted(b, now) ? "past" : "upcoming";
}

const dayNumber = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
};

const byStartAsc = (a: { date: string; time: string }, b: { date: string; time: string }) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

/** Does an admin note belong to this customer? Legacy notes carry no phone. */
function noteMatches(note: InsightNote, email: string, phone: string): boolean {
    if (normalizeEmail(note.customerEmail) !== email) return false;
    return note.customerPhone === null || normalizePhone(note.customerPhone) === phone;
}

function summarise(key: string, rows: InsightBooking[], now: SalonClock, profile?: InsightProfile): CustomerSummary {
    // Highest id = entered most recently, which is what "current details"
    // means. Appointment date would be wrong: someone who books a far-off date
    // first and a nearer one later has typed their newest details second.
    const newestFirst = [...rows].sort((a, b) => b.id - a.id);
    const latest = newestFirst[0];
    // A name Karin set wins until the customer books again after it. Both
    // timestamps are SQLite CURRENT_TIMESTAMP text, so they compare as strings.
    const name =
        profile && profile.updatedAt >= latest.createdAt ? profile.name.trim() : latest.customerName.trim();

    const otherNames: string[] = [];
    const seenNames = new Set([name.toLowerCase()]);
    for (const r of newestFirst) {
        const n = r.customerName.trim();
        if (seenNames.has(n.toLowerCase())) continue;
        seenNames.add(n.toLowerCase());
        otherNames.push(n);
    }
    // A name Karin entered that a later booking overrode stays searchable.
    if (profile && !seenNames.has(profile.name.trim().toLowerCase())) otherNames.push(profile.name.trim());

    const past = rows.filter((r) => phaseOf(r, now) === "past").sort(byStartAsc);
    const upcoming = rows.filter((r) => phaseOf(r, now) === "upcoming").sort(byStartAsc);
    const cancelled = rows.filter((r) => r.status === "cancelled");

    // Favourite = most often booked among appointments that weren't cancelled;
    // ties go to the one booked most recently. Meaningless for one booking.
    let favouriteService: string | null = null;
    const kept = newestFirst.filter((r) => r.status !== "cancelled" && r.serviceName);
    if (kept.length >= 2) {
        const counts = new Map<string, number>();
        for (const r of kept) counts.set(r.serviceName!, (counts.get(r.serviceName!) ?? 0) + 1);
        let best = 0;
        for (const r of kept) {
            const c = counts.get(r.serviceName!)!;
            if (c > best) {
                best = c;
                favouriteService = r.serviceName;
            }
        }
    }

    const visitDays = [...new Set(past.map((r) => r.date))];
    const averageGapDays =
        visitDays.length >= 2
            ? Math.round((dayNumber(visitDays[visitDays.length - 1]) - dayNumber(visitDays[0])) / (visitDays.length - 1))
            : null;

    return {
        key,
        name,
        otherNames,
        email: latest.customerEmail,
        phone: latest.customerPhone,
        visits: past.length,
        upcoming: upcoming.length,
        cancelled: cancelled.length,
        totalSpent: past.reduce((sum, r) => sum + (r.servicePrice ?? 0), 0),
        firstVisit: past[0]?.date ?? null,
        lastVisit: past[past.length - 1]?.date ?? null,
        nextVisit: upcoming[0]?.date ?? null,
        favouriteService,
        averageGapDays,
        latestBookingDate: rows.reduce<string | null>((max, r) => (max === null || r.date > max ? r.date : max), null),
        blacklist: CLEAR_STATUS,
        adminNotesCount: 0,
        bookingNotesCount: rows.filter((r) => r.notes && r.notes.trim()).length,
        related: [],
        blacklistOnly: false,
    };
}

/** A customer with no bookings, known only from a profile, a note or a blacklist. */
function emptySummary(key: string, name: string, email: string, phone: string | null): CustomerSummary {
    return {
        key,
        name,
        otherNames: [],
        email,
        phone,
        visits: 0,
        upcoming: 0,
        cancelled: 0,
        totalSpent: 0,
        firstVisit: null,
        lastVisit: null,
        nextVisit: null,
        favouriteService: null,
        averageGapDays: null,
        latestBookingDate: null,
        blacklist: CLEAR_STATUS,
        adminNotesCount: 0,
        bookingNotesCount: 0,
        related: [],
        blacklistOnly: false,
    };
}

/** Group bookings into customers and summarise each one. */
export function buildCustomerSummaries(
    rows: InsightBooking[],
    notes: InsightNote[],
    blacklist: Map<string, BlacklistStatus>,
    now: SalonClock,
    profiles: InsightProfile[] = []
): CustomerSummary[] {
    const groups = new Map<string, InsightBooking[]>();
    for (const r of rows) {
        // A deleted customer's bookings are kept for revenue but belong to no one.
        if (isAnonymised(r.customerEmail)) continue;
        const key = customerKey(r.customerEmail, r.customerPhone);
        const group = groups.get(key);
        if (group) group.push(r);
        else groups.set(key, [r]);
    }

    const profileByKey = new Map(profiles.map((p) => [customerKey(p.customerEmail, p.customerPhone), p]));
    const summaries = new Map<string, CustomerSummary>();
    for (const [key, group] of groups) summaries.set(key, summarise(key, group, now, profileByKey.get(key)));

    // Customers Karin added who have not booked yet.
    for (const [key, profile] of profileByKey) {
        if (summaries.has(key)) continue;
        const { email, phone } = parseCustomerKey(key)!;
        summaries.set(key, emptySummary(key, profile.name.trim(), email, phone || null));
    }

    for (const note of notes) {
        const email = normalizeEmail(note.customerEmail);
        const matched = [...summaries.values()].filter((s) => {
            const parsed = parseCustomerKey(s.key)!;
            return noteMatches(note, parsed.email, parsed.phone);
        });
        if (matched.length > 0) {
            for (const s of matched) s.adminNotesCount++;
            continue;
        }
        // A note whose customer has no bookings left (all deleted) still shows.
        const key = customerKey(email, note.customerPhone);
        summaries.set(key, { ...emptySummary(key, note.customerEmail, note.customerEmail, note.customerPhone), adminNotesCount: 1 });
    }

    // So does a blacklisted one: otherwise there would be no way to lift it.
    for (const [key, status] of blacklist) {
        if (!status.blacklisted || summaries.has(key)) continue;
        const { email, phone } = parseCustomerKey(key)!;
        summaries.set(key, { ...emptySummary(key, email, email, phone || null), blacklistOnly: true });
    }
    for (const s of summaries.values()) s.blacklist = blacklist.get(s.key) ?? CLEAR_STATUS;

    // Link customers that share half of their identity, so a returning
    // customer with a new number (or a shared household e-mail) is visible.
    const byEmail = new Map<string, CustomerSummary[]>();
    const byPhone = new Map<string, CustomerSummary[]>();
    for (const s of summaries.values()) {
        const { email, phone } = parseCustomerKey(s.key)!;
        byEmail.set(email, [...(byEmail.get(email) ?? []), s]);
        if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), s]);
    }
    for (const s of summaries.values()) {
        const { email, phone } = parseCustomerKey(s.key)!;
        const link = (others: CustomerSummary[] | undefined, sharedBy: RelatedCustomer["sharedBy"]) => {
            for (const o of others ?? []) {
                if (o.key === s.key || s.related.some((r) => r.key === o.key)) continue;
                s.related.push({
                    key: o.key,
                    name: o.name,
                    email: o.email,
                    phone: o.phone,
                    sharedBy,
                    blacklisted: o.blacklist.blacklisted,
                });
            }
        };
        link(byEmail.get(email), "email");
        if (phone) link(byPhone.get(phone), "phone");
    }

    return [...summaries.values()].sort((a, b) => {
        if (!a.latestBookingDate) return b.latestBookingDate ? 1 : 0;
        if (!b.latestBookingDate) return -1;
        return b.latestBookingDate.localeCompare(a.latestBookingDate);
    });
}

function toEntry(r: InsightBooking): HistoryEntry {
    return {
        id: r.id,
        date: r.date,
        time: r.time,
        endTime: r.serviceDuration ? minutesToTime(timeToMinutes(r.time) + r.serviceDuration) : null,
        serviceName: r.serviceName,
        categoryName: r.categoryName,
        duration: r.serviceDuration,
        price: r.servicePrice,
        status: r.status,
        notes: r.notes && r.notes.trim() ? r.notes : null,
        bookedAs: r.customerName.trim(),
        createdAt: r.createdAt,
        noShow: r.noShow,
        absenceReason: r.absenceReason,
    };
}

/** One customer's bookings split by what happened to them. */
export function buildCustomerHistory(
    rows: InsightBooking[],
    notes: InsightNote[],
    key: string,
    now: SalonClock
): CustomerHistory {
    const parsed = parseCustomerKey(key);
    if (!parsed) return { upcoming: [], past: [], cancelled: [], adminNotes: [] };

    const mine = rows.filter((r) => customerKey(r.customerEmail, r.customerPhone) === key);
    const upcoming = mine.filter((r) => phaseOf(r, now) === "upcoming").sort(byStartAsc);
    const past = mine.filter((r) => phaseOf(r, now) === "past").sort(byStartAsc).reverse();
    const cancelled = mine.filter((r) => r.status === "cancelled").sort(byStartAsc).reverse();

    return {
        upcoming: upcoming.map(toEntry),
        past: past.map(toEntry),
        cancelled: cancelled.map(toEntry),
        adminNotes: notes
            .filter((n) => noteMatches(n, parsed.email, parsed.phone))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
            .map((n) => ({ id: n.id, note: n.note, createdAt: n.createdAt })),
    };
}

/* ── Loaders ──────────────────────────────────────────── */

async function selectInsightBookings(where?: SQL): Promise<InsightBooking[]> {
    const rows = await db
        .select({
            id: bookings.id,
            customerName: bookings.customerName,
            customerEmail: bookings.customerEmail,
            customerPhone: bookings.customerPhone,
            date: bookings.date,
            time: bookings.time,
            status: bookings.status,
            notes: bookings.notes,
            createdAt: bookings.createdAt,
            serviceName: services.name,
            categoryName: categories.name,
            serviceDuration: services.duration,
            servicePrice: services.price,
            noShow: bookingAbsences.noShow,
            absenceReason: bookingAbsences.reason,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(categories, eq(services.categoryId, categories.id))
        .leftJoin(bookingAbsences, eq(bookingAbsences.bookingId, bookings.id))
        .where(where);
    return rows.map((r) => ({ ...r, noShow: r.noShow ?? false }));
}

async function selectNotes(where?: SQL): Promise<InsightNote[]> {
    return db
        .select({
            id: customerNotes.id,
            customerEmail: customerNotes.customerEmail,
            customerPhone: customerNotes.customerPhone,
            note: customerNotes.note,
            createdAt: customerNotes.createdAt,
        })
        .from(customerNotes)
        .where(where);
}

export async function getCustomerSummaries(now: SalonClock = salonNow()): Promise<CustomerSummary[]> {
    const [rows, notes, entries, profiles] = await Promise.all([
        selectInsightBookings(),
        selectNotes(),
        selectBlacklistEntries(),
        db
            .select({
                customerEmail: customerProfiles.customerEmail,
                customerPhone: customerProfiles.customerPhone,
                name: customerProfiles.name,
                updatedAt: customerProfiles.updatedAt,
            })
            .from(customerProfiles),
    ]);
    // The rows already carry each booking's no-show mark.
    const noShowKeys = rows
        .filter((r) => r.noShow && !isAnonymised(r.customerEmail))
        .map((r) => customerKey(r.customerEmail, r.customerPhone));
    return buildCustomerSummaries(rows, notes, buildBlacklistStatuses(noShowKeys, entries), now, profiles);
}

export async function getCustomerHistory(key: string, now: SalonClock = salonNow()): Promise<CustomerHistory | null> {
    const parsed = parseCustomerKey(key);
    if (!parsed) return null;
    // Narrow by e-mail in SQL; the phone is compared after normalisation,
    // which SQL can't do.
    const [rows, notes] = await Promise.all([
        selectInsightBookings(sql`lower(trim(${bookings.customerEmail})) = ${parsed.email}`),
        selectNotes(sql`lower(trim(${customerNotes.customerEmail})) = ${parsed.email}`),
    ]);
    return buildCustomerHistory(rows, notes, key, now);
}

/* ── Absences ─────────────────────────────────────────── */

/** Mark a booking as a no-show, keeping any reason already written. */
export async function flagNoShow(bookingId: number): Promise<void> {
    await db
        .insert(bookingAbsences)
        .values({ bookingId, noShow: true })
        .onConflictDoUpdate({
            target: bookingAbsences.bookingId,
            set: { noShow: true, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
}

/**
 * Set or clear Karin's reason for an absence. An empty reason clears it, and a
 * row left with nothing in it is removed.
 */
export async function setAbsenceReason(
    bookingId: number,
    reason: string
): Promise<{ noShow: boolean; reason: string | null }> {
    const text = reason.trim() || null;
    const row = await db
        .insert(bookingAbsences)
        .values({ bookingId, reason: text })
        .onConflictDoUpdate({
            target: bookingAbsences.bookingId,
            set: { reason: text, updatedAt: sql`CURRENT_TIMESTAMP` },
        })
        .returning()
        .get();
    if (!row.noShow && !row.reason) {
        await db.delete(bookingAbsences).where(eq(bookingAbsences.bookingId, bookingId));
    }
    return { noShow: row.noShow, reason: row.reason };
}
