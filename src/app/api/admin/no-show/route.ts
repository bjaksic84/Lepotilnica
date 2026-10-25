import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-guard";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { flagNoShow } from "@/lib/customer-insight";
import { NO_SHOW_LIMIT, getBlacklistStatus, getBlacklistStatuses } from "@/lib/blacklist";

// POST /api/admin/no-show — Record a no-show for a booking
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const body = await request.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
        }

        const booking = await db
            .select({
                customerEmail: bookings.customerEmail,
                customerPhone: bookings.customerPhone,
                customerName: bookings.customerName,
            })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .get();

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // The mark on the booking is the count: a customer's no-shows are their
        // bookings marked this way (see lib/blacklist). Both writes are
        // idempotent, so a repeated click cannot count the booking twice.
        await flagNoShow(bookingId);
        await db
            .update(bookings)
            .set({ status: "cancelled" })
            .where(eq(bookings.id, bookingId));

        const status = await getBlacklistStatus(booking.customerEmail, booking.customerPhone);

        return NextResponse.json({
            success: true,
            noShowCount: status.activeNoShows,
            isBlacklisted: status.blacklisted,
            message: status.blacklisted
                ? `${booking.customerName} is now blacklisted (${status.activeNoShows} no-shows)`
                : `No-show recorded for ${booking.customerName} (${status.activeNoShows}/${NO_SHOW_LIMIT})`,
        });
    } catch (error) {
        console.error("No-show error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET /api/admin/no-show — Blacklist state of every customer that has any, for
// the dashboard's badges. Keyed by customer (e-mail + phone).
export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const statuses = await getBlacklistStatuses();
        return NextResponse.json([...statuses].map(([key, status]) => ({ key, ...status })));
    } catch (error) {
        console.error("No-show fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
