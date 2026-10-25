import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-guard";
import { setAbsenceReason } from "@/lib/customer-insight";

const bodySchema = z.object({
    reason: z.string().max(1000, "Razlog je predolg (največ 1000 znakov)"),
});

/**
 * PUT /api/admin/bookings/[id]/absence — Karin's note on why a customer was
 * absent from this booking. An empty reason clears it.
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const { id } = await params;
        const bookingId = parseInt(id);
        if (!Number.isFinite(bookingId)) {
            return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const existing = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .get();
        if (!existing) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        return NextResponse.json(await setAbsenceReason(bookingId, parsed.data.reason));
    } catch (error) {
        console.error("Absence reason error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
