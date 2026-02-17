import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";
import { cancelLimiter, getClientIp } from "@/lib/rate-limit";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const ip = getClientIp(request);

    // Rate limit cancellation requests
    const { success: withinLimit } = await cancelLimiter.check(ip, 10);
    if (!withinLimit) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
        );
    }

    // Validate token format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
        return NextResponse.json({ error: "Invalid cancellation link." }, { status: 400 });
    }

    try {
        // Look up booking by cancellation token
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

        // Check if appointment is more than 24 hours away
        const appointmentDateTime = new Date(`${booking.date}T${booking.time}:00`);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilAppointment < 24) {
            return NextResponse.json(
                {
                    error: "Cancellations must be made at least 24 hours before the appointment.",
                    appointmentDate: booking.date,
                    appointmentTime: booking.time,
                },
                { status: 403 }
            );
        }

        // Cancel the booking
        await db
            .update(bookings)
            .set({ status: "cancelled" })
            .where(eq(bookings.id, booking.id));

        // Fetch service info for the broadcast
        const service = await db
            .select()
            .from(services)
            .where(eq(services.id, booking.serviceId))
            .get();

        await broadcast({
            event: "booking_updated",
            data: {
                ...booking,
                status: "cancelled",
                serviceName: service?.name,
                serviceDuration: service?.duration,
                servicePrice: service?.price,
            },
        });

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
