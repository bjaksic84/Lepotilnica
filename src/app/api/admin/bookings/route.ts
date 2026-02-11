import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { desc } from "drizzle-orm";

// In a real app, we would add authentication check here
export async function GET() {
    try {
        const allBookings = await db
            .select()
            .from(bookings)
            .orderBy(desc(bookings.date), desc(bookings.time))
            .all();

        return NextResponse.json(allBookings);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
