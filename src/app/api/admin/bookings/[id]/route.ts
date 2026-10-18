import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-guard";
import { bookings, services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_CLOSE, ADMIN_OPEN, fitsAdminWindow, timeToMinutes, ADMIN_OPEN_MIN } from "@/lib/schedule";
import { sendBookingReschedule } from "@/lib/email";
import { runAfterResponse } from "@/lib/after-response";

// DELETE /api/admin/bookings/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const { id } = await params;
        await db.delete(bookings).where(eq(bookings.id, parseInt(id)));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
    }
}

/**
 * Body accepted by PATCH. Every field is optional so the same endpoint serves
 * the status buttons ({status}) and the calendar's drag-and-drop move
 * ({date, time, notifyCustomer}).
 */
const patchSchema = z.object({
    // Mirrors the column's own enum. The route used to also accept "completed",
    // which the `bookings.status` column does not declare and which nothing in
    // the app ever sent — it only type-checked because the body was untyped.
    status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neveljaven format datuma").optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Neveljaven format časa").optional(),
    notifyCustomer: z.boolean().optional(),
});

/**
 * PATCH /api/admin/bookings/[id] — update status and/or move the appointment.
 *
 * A move is bounded by the admin window (06:00–22:00) but is otherwise
 * unconstrained: it may land on a closed day and may overlap other bookings,
 * matching what manual creation already allows. Only the admin can reach this
 * route, and she is looking at the calendar when she drags.
 */
export async function PATCH(
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

        const parsed = patchSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const { status, date, time, notifyCustomer } = parsed.data;

        if (!status && !date && !time) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const existing = await db
            .select({
                id: bookings.id,
                date: bookings.date,
                time: bookings.time,
                customerEmail: bookings.customerEmail,
                cancellationToken: bookings.cancellationToken,
                serviceName: services.name,
                serviceDuration: services.duration,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .where(eq(bookings.id, bookingId))
            .get();

        if (!existing) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const update: Partial<Pick<typeof bookings.$inferInsert, "status" | "date" | "time">> = {};
        if (status) update.status = status;

        const isMove = !!date || !!time;
        const newDate = date ?? existing.date;
        const newTime = time ?? existing.time;

        if (isMove) {
            const duration = existing.serviceDuration ?? 30;
            if (!fitsAdminWindow(newTime, duration)) {
                const tooEarly = timeToMinutes(newTime) < ADMIN_OPEN_MIN;
                return NextResponse.json(
                    {
                        error: tooEarly
                            ? `Termin se ne more začeti pred ${ADMIN_OPEN}.`
                            : `Termin (${duration} min) bi se končal po ${ADMIN_CLOSE}.`,
                    },
                    { status: 400 }
                );
            }
            update.date = newDate;
            update.time = newTime;
        }

        await db.update(bookings).set(update).where(eq(bookings.id, bookingId));

        // Only notify on an actual change of date/time, and only when asked.
        const moved = isMove && (newDate !== existing.date || newTime !== existing.time);
        if (moved && notifyCustomer && existing.customerEmail) {
            // See runAfterResponse: on Workers a floating promise is cancelled
            // as soon as the response is returned.
            await runAfterResponse(
                sendBookingReschedule({
                    customerEmail: existing.customerEmail,
                    serviceName: existing.serviceName ?? "termin",
                    serviceDuration: existing.serviceDuration ?? 30,
                    previousDate: existing.date,
                    previousTime: existing.time,
                    date: newDate,
                    time: newTime,
                    cancellationToken: existing.cancellationToken,
                })
                    .then((res) => {
                        if (!res.success) console.error("[Email] Reschedule send failed:", res.error);
                    })
                    .catch((err) => console.error("[Email] Reschedule background send failed:", err))
            );
        }

        return NextResponse.json({ success: true, date: newDate, time: newTime, notified: !!(moved && notifyCustomer) });
    } catch (error) {
        console.error("Admin booking update error:", error);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }
}
