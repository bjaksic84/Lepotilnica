import type { bookings } from "@/db/schema";
import { salonTimeToEpoch } from "@/lib/schedule";

type Booking = typeof bookings.$inferSelect;

/**
 * Notice period for a fee-free cancellation, per the terms of service
 * (/pogoji, §3).
 *
 * Shared by the cancellation endpoint and the "ask the salon" endpoint beside
 * it, so the two can never disagree about where the cutoff is. The number is
 * still mirrored in prose in several places — the ToS page, the confirmation
 * and reschedule e-mails, the cancellation page and the homepage FAQ — and
 * those have to be changed by hand alongside it.
 *
 * Note the ToS also mentions 24 hours, which is a *fee* tier and not a second
 * cutoff: under 36 hours a fee applies, under 24 hours (or more than 15
 * minutes late) a larger one. Only the 36 is enforced in code.
 */
export const CANCELLATION_NOTICE_HOURS = 36;

/** Cancellation tokens are v4 UUIDs, minted per booking row. */
export const CANCEL_TOKEN_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Hours from now until the appointment starts; negative once it has passed.
 * The stored date and time are Ljubljana wall clock, and are read as such
 * whatever zone the server keeps (Workers run in UTC).
 */
export function hoursUntilBooking(booking: Pick<Booking, "date" | "time">): number {
    return (salonTimeToEpoch(booking.date, booking.time) - Date.now()) / (1000 * 60 * 60);
}

/** True when the appointment is too close to be cancelled through the link. */
export function isInsideNoticeWindow(booking: Pick<Booking, "date" | "time">): boolean {
    return hoursUntilBooking(booking) < CANCELLATION_NOTICE_HOURS;
}
