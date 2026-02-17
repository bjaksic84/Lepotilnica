import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { broadcast } from "@/lib/broadcast";

// DELETE /api/admin/bookings/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await db.delete(bookings).where(eq(bookings.id, parseInt(id)));
        await broadcast({ event: "booking_deleted", data: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
    }
}

// PATCH /api/admin/bookings/[id] - Update status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!["confirmed", "cancelled", "completed"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        await db
            .update(bookings)
            .set({ status })
            .where(eq(bookings.id, parseInt(id)));

        await broadcast({ event: "booking_updated", data: { id: parseInt(id), status } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }
}
