import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { bookingSchema } from "@/lib/validators";
import { eq, and } from "drizzle-orm";

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

        const { date, time } = result.data;

        // Check if slot is already taken
        const existingBooking = await db
            .select()
            .from(bookings)
            .where(
                and(
                    eq(bookings.date, date),
                    eq(bookings.time, time),
                    eq(bookings.status, "confirmed") // Only check confirmed bookings? Or pending too?
                    // For now, let's assume anything in DB blocks the slot to avoid double booking
                )
            )
            .get();

        // Actually, we should probably check if *any* booking exists for that slot that isn't cancelled
        const slotTaken = await db.select().from(bookings).where(and(eq(bookings.date, date), eq(bookings.time, time))).get();

        if (slotTaken && slotTaken.status !== 'cancelled') {
            return NextResponse.json(
                { error: "Time slot already booked" },
                { status: 409 }
            );
        }

        // Create booking
        const newBooking = await db.insert(bookings).values({
            ...result.data,
            status: "confirmed", // Auto-confirm for now
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
