import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cancelLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";
import {
    CANCELLATION_NOTICE_HOURS,
    CANCEL_TOKEN_REGEX,
    isInsideNoticeWindow,
} from "@/lib/cancellation";

type Booking = typeof bookings.$inferSelect;

/** Shared guardrails: rate limit, token validation, lookup. */
async function loadBooking(
    request: Request,
    token: string
): Promise<{ error: NextResponse } | { booking: Booking }> {
    const ip = getClientIp(request);
    const withinLimit = await enforceRateLimit("CANCEL_RATE_LIMITER", ip, cancelLimiter, 10);
    if (!withinLimit) {
        return {
            error: NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            ),
        };
    }

    if (!CANCEL_TOKEN_REGEX.test(token)) {
        return { error: NextResponse.json({ error: "Invalid cancellation link." }, { status: 400 }) };
    }

    const booking = await db
        .select()
        .from(bookings)
        .where(eq(bookings.cancellationToken, token))
        .get();

    if (!booking) {
        return {
            error: NextResponse.json(
                { error: "Cancellation link is invalid or has already been used." },
                { status: 404 }
            ),
        };
    }

    return { booking };
}

/**
 * Read-only. Returns the booking's cancellation state so the page can render a
 * summary and an explicit confirm button. MUST NOT mutate — email link
 * scanners and browser prefetch routinely issue GETs against links in emails.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    try {
        const loaded = await loadBooking(request, token);
        if ("error" in loaded) return loaded.error;
        const { booking } = loaded;

        const summary = { date: booking.date, time: booking.time, customerName: booking.customerName };

        if (booking.status === "cancelled") {
            return NextResponse.json({ state: "already_cancelled", booking: summary });
        }
        if (isInsideNoticeWindow(booking)) {
            return NextResponse.json({ state: "too_late", booking: summary });
        }
        return NextResponse.json({ state: "cancellable", booking: summary });
    } catch (error) {
        console.error("Cancellation lookup error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}

/** Performs the cancellation after the customer explicitly confirms. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    try {
        const loaded = await loadBooking(request, token);
        if ("error" in loaded) return loaded.error;
        const { booking } = loaded;

        if (booking.status === "cancelled") {
            return NextResponse.json(
                { error: "This appointment has already been cancelled." },
                { status: 400 }
            );
        }

        if (isInsideNoticeWindow(booking)) {
            return NextResponse.json(
                {
                    error: `Cancellations must be made at least ${CANCELLATION_NOTICE_HOURS} hours before the appointment.`,
                    appointmentDate: booking.date,
                    appointmentTime: booking.time,
                },
                { status: 403 }
            );
        }

        await db
            .update(bookings)
            .set({ status: "cancelled" })
            .where(eq(bookings.id, booking.id));

        return NextResponse.json({
            success: true,
            message: "Your appointment has been successfully cancelled.",
            booking: {
                date: booking.date,
                time: booking.time,
                customerName: booking.customerName,
            },
        });
    } catch (error) {
        console.error("Cancellation error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}
