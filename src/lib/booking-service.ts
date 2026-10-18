import { db } from "@/db";
import { bookings, blockedTimes, services } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
    timeToMinutes,
    minutesToTime,
    getScheduleForDateStr,
    ADMIN_OPEN_MIN,
    ADMIN_CLOSE_MIN,
    ADMIN_OPEN,
    ADMIN_CLOSE,
} from "@/lib/schedule";

/**
 * Shared booking-creation core used by both the public flow (/api/bookings) and
 * the admin manual flow (/api/admin/bookings). It validates the schedule,
 * builds a sequential plan for one or more services starting at `time`, checks
 * for overlaps against existing bookings and blocked times, and inserts the
 * rows. Callers layer their own policy on top (rate limiting, blacklist,
 * confirmation email).
 *
 * The two callers differ in more than policy, so the mode is explicit:
 *
 *   "public"  Only inside the day's opening hours (Sundays and public holidays
 *             are refused outright), and never on top of an existing booking or
 *             a blocked interval.
 *
 *   "admin"   Anywhere in the 06:00–22:00 admin window, on any day of the year,
 *             and allowed to overlap whatever is already there. Karin can be
 *             doing two things at once — a treatment that leaves the client
 *             sitting while she starts the next one — and the software should
 *             record what she says is happening rather than argue with it.
 *             Overlap is therefore permitted ONLY through this path; the public
 *             flow can still never double-book her.
 */
export type BookingMode = "public" | "admin";

export type CreatedBookingItem = {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    serviceId: number;
    date: string;
    time: string;
    status: string;
    notes: string | null;
    cancellationToken: string;
    serviceName: string;
    serviceDuration: number;
    servicePrice: number;
};

export type CreateBookingsInput = {
    serviceIds: number[];
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    date: string;
    time: string;
    notes?: string;
    /** Defaults to the stricter public rules. */
    mode?: BookingMode;
};

export type CreateBookingsResult =
    | { ok: false; status: number; error: string }
    | { ok: true; created: CreatedBookingItem[] };

/**
 * Raised inside the booking transaction to roll it back and carry the reason
 * out. Throwing is the only way to abort a drizzle transaction; the message is
 * caught and turned back into a 409 by the caller.
 */
class SlotConflictError extends Error {}

/** libSQL surfaces write-lock contention as a busy/timeout error. */
function isBusyError(err: unknown): boolean {
    const text = err instanceof Error ? `${err.message} ${(err as { code?: string }).code ?? ""}` : String(err);
    return /SQLITE_BUSY|database is locked|timed? ?out|TRANSACTION_TIMEOUT/i.test(text);
}

const BUSY_RETRIES = 3;
const BUSY_BACKOFF_MS = 40;

export async function createBookings(input: CreateBookingsInput): Promise<CreateBookingsResult> {
    const { serviceIds, date, time, mode = "public" } = input;
    const isAdmin = mode === "admin";

    // ── Resolve the window this booking has to fit inside ────
    let openingMin: number;
    let closingMin: number;

    if (isAdmin) {
        openingMin = ADMIN_OPEN_MIN;
        closingMin = ADMIN_CLOSE_MIN;
    } else {
        const schedule = getScheduleForDateStr(date);
        if (!schedule) {
            return { ok: false, status: 400, error: "The salon is closed on this day." };
        }
        openingMin = timeToMinutes(schedule.open);
        closingMin = timeToMinutes(schedule.close);
    }

    // ── Look up all requested services ───────────────────────
    const serviceRecords: (typeof services.$inferSelect)[] = [];
    for (const id of serviceIds) {
        const service = await db.select().from(services).where(eq(services.id, id)).get();
        if (!service) {
            return { ok: false, status: 404, error: `Service not found: ${id}` };
        }
        serviceRecords.push(service);
    }

    // ── Build sequential booking plan ────────────────────────
    let currentTimeMin = timeToMinutes(time);

    if (currentTimeMin < openingMin) {
        return {
            ok: false,
            status: 400,
            error: isAdmin
                ? `Ročni vnos je mogoč šele od ${ADMIN_OPEN} naprej.`
                : "Requested time is before opening hours",
        };
    }

    const bookingPlan: {
        service: typeof services.$inferSelect;
        startTime: string;
        startMin: number;
        endMin: number;
    }[] = [];

    for (const service of serviceRecords) {
        const startMin = currentTimeMin;
        const endMin = startMin + service.duration;

        if (endMin > closingMin) {
            return {
                ok: false,
                status: 400,
                error: isAdmin
                    ? `Storitev "${service.name}" bi se končala po ${ADMIN_CLOSE}.`
                    : `Service "${service.name}" would end after closing time`,
            };
        }

        bookingPlan.push({ service, startTime: minutesToTime(startMin), startMin, endMin });
        currentTimeMin = endMin;
    }

    // ── Check and insert, atomically ─────────────────────────
    //
    // The overlap check and the insert MUST happen inside one write
    // transaction. They used to be two independent statements, which left a
    // window in which every concurrent request for the same slot read "free"
    // and then wrote: a load test put seven different customers in a single
    // 11:00 appointment, each with a confirmation e-mail. That window is wider
    // in production than in testing — on Workers each request runs in its own
    // isolate with no shared state, and Turso is a network round-trip away.
    //
    // `behavior: "immediate"` takes the write lock at BEGIN rather than on
    // first write, so concurrent bookings queue at the start instead of
    // discovering the conflict halfway through and having to unwind.
    //
    // Note this deliberately does NOT use a unique index on (date, time): the
    // admin flow is allowed to double-book (see the mode docs above), and an
    // index cannot be told to make an exception. Serialising the check is also
    // strictly stronger — a unique index would only catch an identical start
    // time, missing a 10:00 90-minute service overlapping a 10:30 one.
    const runTransaction = async (): Promise<CreatedBookingItem[]> =>
        db.transaction(async (tx) => {
            // The admin is allowed to double-book and to book over her own
            // blocked time; both are deliberate acts taken with the calendar
            // in front of her.
            if (!isAdmin) {
                const existingBookings = await tx
                    .select({ time: bookings.time, serviceDuration: services.duration })
                    .from(bookings)
                    .leftJoin(services, eq(bookings.serviceId, services.id))
                    .where(and(eq(bookings.date, date), not(eq(bookings.status, "cancelled"))));

                for (const planned of bookingPlan) {
                    for (const existing of existingBookings) {
                        const existStart = timeToMinutes(existing.time);
                        const existEnd = existStart + (existing.serviceDuration || 30);
                        if (planned.startMin < existEnd && existStart < planned.endMin) {
                            throw new SlotConflictError(
                                `Time slot for "${planned.service.name}" conflicts with an existing booking`
                            );
                        }
                    }
                }

                const blockedForDate = await tx
                    .select()
                    .from(blockedTimes)
                    .where(eq(blockedTimes.date, date));

                for (const planned of bookingPlan) {
                    for (const block of blockedForDate) {
                        const blockStart = timeToMinutes(block.startTime);
                        const blockEnd = timeToMinutes(block.endTime);
                        if (planned.startMin < blockEnd && blockStart < planned.endMin) {
                            throw new SlotConflictError(
                                `Time slot for "${planned.service.name}" is blocked`
                            );
                        }
                    }
                }
            }

            const rows: CreatedBookingItem[] = [];
            for (const planned of bookingPlan) {
                const cancellationToken = uuidv4();
                const newBooking = await tx
                    .insert(bookings)
                    .values({
                        customerName: input.customerName,
                        customerEmail: input.customerEmail,
                        customerPhone: input.customerPhone,
                        serviceId: planned.service.id,
                        date,
                        time: planned.startTime,
                        status: "confirmed",
                        cancellationToken,
                        notes: input.notes,
                    })
                    .returning()
                    .get();

                rows.push({
                    ...newBooking,
                    serviceName: planned.service.name,
                    serviceDuration: planned.service.duration,
                    servicePrice: planned.service.price,
                    cancellationToken,
                });
            }
            return rows;
        }, { behavior: "immediate" });

    for (let attempt = 0; attempt <= BUSY_RETRIES; attempt++) {
        try {
            return { ok: true, created: await runTransaction() };
        } catch (err) {
            // A real conflict — someone else holds the slot. Final answer.
            if (err instanceof SlotConflictError) {
                return { ok: false, status: 409, error: err.message };
            }
            // Lock contention is transient: the booking was never written, so
            // retrying is safe and usually succeeds once the holder commits.
            if (isBusyError(err) && attempt < BUSY_RETRIES) {
                await new Promise((r) => setTimeout(r, BUSY_BACKOFF_MS * (attempt + 1)));
                continue;
            }
            if (isBusyError(err)) {
                return {
                    ok: false,
                    status: 503,
                    error: "The booking system is busy right now. Please try again in a moment.",
                };
            }
            throw err;
        }
    }

    // Unreachable: the loop either returns or throws.
    return { ok: false, status: 500, error: "Booking failed" };
}
