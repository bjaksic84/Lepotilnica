import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cancelLimiter, getClientIp } from "@/lib/rate-limit";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Booking = typeof bookings.$inferSelect;

/** Shared guardrails: rate limit, token validation, lookup. */
async function loadBooking(
    request: Request,
    token: string
): Promise<{ error: NextResponse } | { booking: Booking }> {
    const ip = getClientIp(request);
    const { success: withinLimit } = await cancelLimiter.check(ip, 10);
    if (!withinLimit) {
        return {
            error: NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            ),
        };
    }

    if (!UUID_REGEX.test(token)) {
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

function hoursUntil(booking: Booking): number {
    const appointmentDateTime = new Date(`${booking.date}T${booking.time}:00`);
    return (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
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
        if (hoursUntil(booking) < 24) {
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

        if (hoursUntil(booking) < 24) {
            return NextResponse.json(
                {
                    error: "Cancellations must be made at least 24 hours before the appointment.",
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
