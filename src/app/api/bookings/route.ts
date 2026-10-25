import { NextResponse } from "next/server";
import { bookingSchema, multiBookingSchema } from "@/lib/validators";
import { sendBookingConfirmation, sendNewBookingNotification } from "@/lib/email";
import { runAfterResponse } from "@/lib/after-response";
import { bookingLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";
import { createBookings } from "@/lib/booking-service";
import { getBlacklistStatus } from "@/lib/blacklist";
import { BUSINESS } from "@/lib/site";

/**
 * The blacklist lives in tables added by a hand-applied migration (0005). If
 * this code ever ships before that migration runs, the lookup fails with "no
 * such table" — and failing the whole booking over it would take online
 * booking down to stop a handful of people. So that one error lets the booking
 * through, loudly; anything else still fails the request.
 */
async function isBlacklistedForBooking(email: string, phone: string): Promise<boolean> {
    try {
        return (await getBlacklistStatus(email, phone)).blacklisted;
    } catch (error) {
        // Drizzle wraps the driver's error; the SQLite message is on `cause`.
        let message = "";
        for (let e: unknown = error; e; e = (e as { cause?: unknown }).cause) message += ` ${(e as Error).message ?? e}`;
        if (/no such table/i.test(message)) {
            console.error("[Blacklist] Tables missing — apply drizzle/0005_customer_insight.sql. Booking allowed.", error);
            return false;
        }
        throw error;
    }
}

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
        // Per customer, on the exact e-mail + phone pair (see lib/blacklist).
        // The wording names neither no-shows nor which detail matched: Karin
        // may have blacklisted someone for another reason, and the booking
        // page shows this text to the customer as it is.
        if (await isBlacklistedForBooking(validatedData.customerEmail, validatedData.customerPhone)) {
            return NextResponse.json(
                { error: `Spletna rezervacija s temi podatki ni mogoča. Za termin nas prosimo pokličite na ${BUSINESS.phoneDisplay}.` },
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
