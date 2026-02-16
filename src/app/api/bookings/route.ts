import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, blockedTimes, services } from "@/db/schema";
import { bookingSchema } from "@/lib/validators";
import { eq, and, not } from "drizzle-orm";

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

export async function POST(request: Request) {
    try {
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

        // Create booking
        const newBooking = await db.insert(bookings).values({
            ...result.data,
            status: "confirmed",
        }).returning().get();

        return NextResponse.json(newBooking, { status: 201 });
    } catch (error) {
        console.error("Booking error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
