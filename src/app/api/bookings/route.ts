import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, blockedTimes, services } from "@/db/schema";
import { bookingSchema } from "@/lib/validators";
import { eq, and, not } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";
import { v4 as uuidv4 } from "uuid";
import { sendBookingConfirmation } from "@/lib/email";
import { bookingLimiter, getClientIp } from "@/lib/rate-limit";

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

export async function POST(request: Request) {
    try {
        // ── Rate limiting ────────────────────────────────────────
        const ip = getClientIp(request);
        const { success: withinLimit } = await bookingLimiter.check(ip, 5);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many booking requests. Please try again later." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const result = bookingSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { date, time, serviceId } = result.data;

        // Look up service duration
        const service = await db.select().from(services).where(eq(services.id, serviceId)).get();
        if (!service) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        const requestedStart = timeToMinutes(time);
        const requestedEnd = requestedStart + service.duration;

        // Check overlap with existing bookings
        const existingBookings = await db
            .select({
                time: bookings.time,
                serviceDuration: services.duration,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .where(
                and(
                    eq(bookings.date, date),
                    not(eq(bookings.status, "cancelled"))
                )
            );

        for (const existing of existingBookings) {
            const existStart = timeToMinutes(existing.time);
            const existEnd = existStart + (existing.serviceDuration || 30);
            // Overlap check: two ranges overlap if start1 < end2 AND start2 < end1
            if (requestedStart < existEnd && existStart < requestedEnd) {
                return NextResponse.json(
                    { error: "Time slot conflicts with an existing booking" },
                    { status: 409 }
                );
            }
        }

        // Check overlap with blocked times
        const blockedForDate = await db
            .select()
            .from(blockedTimes)
            .where(eq(blockedTimes.date, date));

        for (const block of blockedForDate) {
            const blockStart = timeToMinutes(block.startTime);
            const blockEnd = timeToMinutes(block.endTime);
            if (requestedStart < blockEnd && blockStart < requestedEnd) {
                return NextResponse.json(
                    { error: "Time slot is blocked" },
                    { status: 409 }
                );
            }
        }

        // Create booking with cancellation token
        const cancellationToken = uuidv4();
        const newBooking = await db.insert(bookings).values({
            ...result.data,
            status: "confirmed",
            cancellationToken,
        }).returning().get();

        // Send confirmation email (non-blocking – don't fail the booking if email fails)
        sendBookingConfirmation({
            customerName: result.data.customerName,
            customerEmail: result.data.customerEmail,
            serviceName: service.name,
            servicePrice: service.price,
            serviceDuration: service.duration,
            date: result.data.date,
            time: result.data.time,
            cancellationToken,
        }).catch((err) => console.error("[Email] Background send failed:", err));

        await broadcast({ event: "booking_created", data: { ...newBooking, serviceName: service.name, serviceDuration: service.duration, servicePrice: service.price } });
        return NextResponse.json(newBooking, { status: 201 });
    } catch (error) {
        console.error("Booking error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
