import { NextResponse } from "next/server";
import { db } from "@/db";
import { noShows } from "@/db/schema";
import { bookingSchema, multiBookingSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { sendBookingConfirmation, sendNewBookingNotification } from "@/lib/email";
import { runAfterResponse } from "@/lib/after-response";
import { bookingLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";
import { createBookings } from "@/lib/booking-service";

export async function POST(request: Request) {
    try {
        // ── Rate limiting ────────────────────────────────────────
        const ip = getClientIp(request);
        const withinLimit = await enforceRateLimit("BOOKING_RATE_LIMITER", ip, bookingLimiter, 5);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many booking requests. Please try again later." },
                { status: 429 }
            );
        }

        const body = await request.json();

        // ── Validate & normalise to serviceIds[] ─────────────────
        let serviceIds: number[];
        let validatedData: {
            customerName: string;
            customerEmail: string;
            customerPhone: string;
            date: string;
            time: string;
            notes?: string;
        };

        if (body.serviceIds) {
            const result = multiBookingSchema.safeParse(body);
            if (!result.success) {
                return NextResponse.json(
                    { error: "Validation failed", details: result.error.flatten().fieldErrors },
                    { status: 400 }
                );
            }
            validatedData = result.data;
            serviceIds = result.data.serviceIds;
        } else {
            const result = bookingSchema.safeParse(body);
            if (!result.success) {
                return NextResponse.json(
                    { error: "Validation failed", details: result.error.flatten().fieldErrors },
                    { status: 400 }
                );
            }
            validatedData = result.data;
            serviceIds = [result.data.serviceId];
        }

        const { date } = validatedData;

        // ── Blacklist check ──────────────────────────────────────
        const noShowRecord = await db
            .select()
            .from(noShows)
            .where(eq(noShows.customerEmail, validatedData.customerEmail.toLowerCase()))
            .get();

        if (noShowRecord && noShowRecord.count >= 2) {
            return NextResponse.json(
                { error: "This email address has been restricted from making bookings due to repeated no-shows. Please contact us directly." },
                { status: 403 }
            );
        }

        // ── Plan, validate & create (shared with the admin flow) ─
        const result = await createBookings({ ...validatedData, serviceIds });
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const createdBookings = result.created;

        // ── Send e-mails (after the response) ────────────────────
        // Two of them: the customer's confirmation and Karin's heads-up. Both
        // must go through runAfterResponse — a bare floating promise is
        // cancelled when the Worker returns, which silently dropped every
        // confirmation e-mail. Each carries its own logging and catch, so one
        // failing neither hides the other nor turns a good booking into a 500.
        //
        // Only the public flow notifies Karin. A booking she entered herself in
        // the dashboard goes through /api/admin/bookings and needs no telling.
        const confirmation = sendBookingConfirmation({
            customerEmail: validatedData.customerEmail,
            date,
            items: createdBookings.map(b => ({
                serviceName: b.serviceName,
                servicePrice: b.servicePrice,
                serviceDuration: b.serviceDuration,
                time: b.time,
                cancellationToken: b.cancellationToken,
            })),
        })
            .then((res) => {
                if (!res.success) console.error("[Email] Confirmation failed:", res.error);
            })
            .catch((err) => console.error("[Email] Confirmation threw:", err));

        const notification = sendNewBookingNotification({
            customerName: validatedData.customerName,
            customerEmail: validatedData.customerEmail,
            customerPhone: validatedData.customerPhone ?? null,
            date,
            notes: validatedData.notes ?? null,
            items: createdBookings.map(b => ({
                serviceName: b.serviceName,
                servicePrice: b.servicePrice,
                serviceDuration: b.serviceDuration,
                time: b.time,
            })),
        })
            .then((res) => {
                if (!res.success) console.error("[Email] Booking notification failed:", res.error);
            })
            .catch((err) => console.error("[Email] Booking notification threw:", err));

        await runAfterResponse(Promise.all([confirmation, notification]));

        return NextResponse.json(createdBookings, { status: 201 });
    } catch (error) {
        console.error("Booking error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
