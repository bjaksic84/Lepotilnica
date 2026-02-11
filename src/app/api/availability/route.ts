import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";

// Mock available hours
const HOURS = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
        return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    try {
        // Get all bookings for the date that are not cancelled
        const bookedSlots = await db
            .select({ time: bookings.time })
            .from(bookings)
            .where(
                and(
                    eq(bookings.date, date),
                    not(eq(bookings.status, "cancelled"))
                )
            );

        const bookedTimes = new Set(bookedSlots.map(b => b.time));

        const availableSlots = HOURS.filter(time => !bookedTimes.has(time));

        return NextResponse.json({ date, slots: availableSlots });
    } catch (error) {
        console.error("Availability error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
