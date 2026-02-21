import { NextResponse } from "next/server";
import { db } from "@/db";
import { noShows, bookings, services } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";
import { format } from "date-fns";

// POST /api/admin/no-show — Record a no-show for a booking
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
        }

        // Get the booking to find the customer email
        const booking = await db
            .select({
                customerEmail: bookings.customerEmail,
                customerName: bookings.customerName,
            })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .get();

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const email = booking.customerEmail.toLowerCase();
        const today = format(new Date(), "yyyy-MM-dd");

        // Upsert: increment count or insert new record
        const existing = await db
            .select()
            .from(noShows)
            .where(eq(noShows.customerEmail, email))
            .get();

        let newCount: number;

        if (existing) {
            newCount = existing.count + 1;
            await db
                .update(noShows)
                .set({
                    count: newCount,
                    lastNoShowDate: today,
                })
                .where(eq(noShows.customerEmail, email));
        } else {
            newCount = 1;
            await db.insert(noShows).values({
                customerEmail: email,
                count: 1,
                lastNoShowDate: today,
            });
        }

        // Also mark the booking as no-show (cancelled with reason)
        await db
            .update(bookings)
            .set({ status: "cancelled" })
            .where(eq(bookings.id, bookingId));

        await broadcast({
            event: "booking_updated",
            data: { id: bookingId, status: "cancelled", noShow: true },
        });

        const isBlacklisted = newCount >= 2;

        return NextResponse.json({
            success: true,
            customerEmail: email,
            noShowCount: newCount,
            isBlacklisted,
            message: isBlacklisted
                ? `${booking.customerName} is now blacklisted (${newCount} no-shows)`
                : `No-show recorded for ${booking.customerName} (${newCount}/2)`,
        });
    } catch (error) {
        console.error("No-show error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET /api/admin/no-show — Get all no-show records (for pre-loading blacklist data)
export async function GET() {
    try {
        const records = await db.select().from(noShows);
        return NextResponse.json(records);
    } catch (error) {
        console.error("No-show fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
