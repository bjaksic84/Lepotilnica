import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cancelLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";
import { CANCEL_TOKEN_REGEX, hoursUntilBooking, isInsideNoticeWindow } from "@/lib/cancellation";
import { sendLateCancellationRequest } from "@/lib/email";

/**
 * "Let the salon know" — the action offered on the cancellation page once the
 * appointment is inside the 36-hour notice window and the link can no longer
 * cancel it. Until now that screen was a dead end telling the customer to
 * phone; this carries their intent to someone who can act on it.
 *
 * It is a separate, explicit POST for two reasons:
 *
 *  - It must not hang off the page load. E-mail link scanners and browser
 *    prefetch routinely fire GETs at cancellation links, so notifying there
 *    would mail Karin about every booking whose link happened to be scanned
 *    after its window closed.
 *
 *  - It must not hang off the cancel endpoint's 403 either. The page renders
 *    no cancel button in the too-late state, so that branch only ever fires
 *    for a hand-crafted request — the traffic least worth acting on.
 *
 * Nothing is written to the database. The appointment stays booked, because
 * only Karin can decide whether to release a slot this close to the start.
 */

/**
 * Don't mail about an appointment that is well past. The link stays valid
 * indefinitely, and someone clearing out an old inbox should not page Karin
 * about a slot from last month.
 */
const STALE_AFTER_HOURS = 24;

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    try {
        const ip = getClientIp(request);
        const withinLimit = await enforceRateLimit("CANCEL_RATE_LIMITER", ip, cancelLimiter, 10);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }

        if (!CANCEL_TOKEN_REGEX.test(token)) {
            return NextResponse.json({ error: "Invalid cancellation link." }, { status: 400 });
        }

        const booking = await db
            .select()
            .from(bookings)
            .where(eq(bookings.cancellationToken, token))
            .get();

        if (!booking) {
            return NextResponse.json(
                { error: "Cancellation link is invalid or has already been used." },
                { status: 404 }
            );
        }

        if (booking.status === "cancelled") {
            return NextResponse.json(
                { error: "This appointment has already been cancelled." },
                { status: 400 }
            );
        }

        const hoursUntil = hoursUntilBooking(booking);

        // Outside the window the page shows a working cancel button, so there
        // is nothing for Karin to do by hand.
        if (!isInsideNoticeWindow(booking)) {
            return NextResponse.json(
                { error: "This appointment can still be cancelled directly." },
                { status: 400 }
            );
        }

        if (hoursUntil < -STALE_AFTER_HOURS) {
            return NextResponse.json(
                { error: "This appointment has already passed. Please contact us directly." },
                { status: 400 }
            );
        }

        // Awaited rather than deferred to runAfterResponse: the page tells the
        // customer their message has reached the salon, and that promise has to
        // be true. If Resend refuses, they need to hear it and pick up a phone.
        const sent = await sendLateCancellationRequest({
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            date: booking.date,
            time: booking.time,
            hoursUntil,
        });

        if (!sent.success) {
            return NextResponse.json(
                { error: "Could not reach the salon. Please call us instead." },
                { status: 502 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Late cancellation notice error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}
