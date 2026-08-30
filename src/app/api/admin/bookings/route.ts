import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-guard";
import { bookings, services } from "@/db/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";
import { multiBookingSchema } from "@/lib/validators";
import { createBookings } from "@/lib/booking-service";
import { sendBookingConfirmation } from "@/lib/email";
import { runAfterResponse } from "@/lib/after-response";

export async function GET(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get("weekStart");
        const weekEnd = searchParams.get("weekEnd");

        let query = db
            .select({
                id: bookings.id,
                customerName: bookings.customerName,
                customerEmail: bookings.customerEmail,
                customerPhone: bookings.customerPhone,
                serviceId: bookings.serviceId,
                date: bookings.date,
                time: bookings.time,
                status: bookings.status,
                notes: bookings.notes,
                createdAt: bookings.createdAt,
                serviceName: services.name,
                serviceDuration: services.duration,
                servicePrice: services.price,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .orderBy(desc(bookings.date), desc(bookings.time));

        if (weekStart && weekEnd) {
            query = query.where(
                and(
                    gte(bookings.date, weekStart),
                    lte(bookings.date, weekEnd)
                )
            ) as typeof query;
        }

        const allBookings = await query;
        return NextResponse.json(allBookings);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * Admin manual booking creation. Auth is enforced by middleware (all of
 * /api/admin/* requires the admin_session cookie). Unlike the public flow
 * it isn't rate-limited and skips the no-show blacklist (the admin is
 * deliberately booking someone), but still enforces schedule/overlap/block
 * checks via the shared helper. The confirmation email is opt-in
 * (`sendConfirmation`, default true).
 */
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const body = await request.json();
        const result = multiBookingSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const created = await createBookings(result.data);
        if (!created.ok) {
            return NextResponse.json({ error: created.error }, { status: created.status });
        }

        if (body.sendConfirmation !== false) {
            // See runAfterResponse: on Workers a floating promise is cancelled
            // when the response is returned, which dropped the e-mail entirely.
            await runAfterResponse(
                sendBookingConfirmation({
                    customerName: result.data.customerName,
                    customerEmail: result.data.customerEmail,
                    date: result.data.date,
                    items: created.created.map((b) => ({
                        serviceName: b.serviceName,
                        servicePrice: b.servicePrice,
                        serviceDuration: b.serviceDuration,
                        time: b.time,
                        cancellationToken: b.cancellationToken,
                    })),
                }).then((res) => {
                    if (!res.success) console.error("[Email] Send failed:", res.error);
                }).catch((err) => console.error("[Email] Background send failed:", err))
            );
        }

        return NextResponse.json(created.created, { status: 201 });
    } catch (error) {
        console.error("Admin booking error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
