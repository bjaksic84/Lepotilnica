import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, blockedTimes, services, noShows } from "@/db/schema";
import { bookingSchema, multiBookingSchema } from "@/lib/validators";
import { eq, and, not } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";
import { v4 as uuidv4 } from "uuid";
import { sendBookingConfirmation } from "@/lib/email";
import { bookingLimiter, getClientIp } from "@/lib/rate-limit";
import { timeToMinutes, minutesToTime, getScheduleForDateStr } from "@/lib/schedule";

export async function POST(request: Request) {
    try {
        // ── Rate limiting ────────────────────────────────────────
        const ip = getClientIp(request);
        const { success: withinLimit } = await bookingLimiter.check(ip, 5);
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

        const { date, time } = validatedData;

        // ── Check day is open ────────────────────────────────────
        const schedule = getScheduleForDateStr(date);
        if (!schedule) {
            return NextResponse.json(
                { error: "The salon is closed on this day." },
                { status: 400 }
            );
        }

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

        // ── Look up all requested services ───────────────────────
        const serviceRecords: (typeof services.$inferSelect)[] = [];
        for (const id of serviceIds) {
            const service = await db.select().from(services).where(eq(services.id, id)).get();
            if (!service) {
                return NextResponse.json({ error: `Service not found: ${id}` }, { status: 404 });
            }
            serviceRecords.push(service);
        }

        // ── Build sequential booking plan ────────────────────────
        const openingMin = timeToMinutes(schedule.open);
        const closingMin = timeToMinutes(schedule.close);
        let currentTimeMin = timeToMinutes(time);

        if (currentTimeMin < openingMin) {
            return NextResponse.json({ error: "Requested time is before opening hours" }, { status: 400 });
        }

        const bookingPlan: {
            service: typeof services.$inferSelect;
            startTime: string;
            startMin: number;
            endMin: number;
        }[] = [];

        for (const service of serviceRecords) {
            const startMin = currentTimeMin;
            const endMin = startMin + service.duration;

            if (endMin > closingMin) {
                return NextResponse.json(
                    { error: `Service "${service.name}" would end after closing time` },
                    { status: 400 }
                );
            }

            bookingPlan.push({
                service,
                startTime: minutesToTime(startMin),
                startMin,
                endMin,
            });

            currentTimeMin = endMin;
        }

        // ── Check overlap with existing bookings ─────────────────
        const existingBookings = await db
            .select({
                time: bookings.time,
                serviceDuration: services.duration,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .where(
                and(
                    eq(bookings.date, date),
                    not(eq(bookings.status, "cancelled"))
                )
            );

        for (const planned of bookingPlan) {
            for (const existing of existingBookings) {
                const existStart = timeToMinutes(existing.time);
                const existEnd = existStart + (existing.serviceDuration || 30);
                if (planned.startMin < existEnd && existStart < planned.endMin) {
                    return NextResponse.json(
                        { error: `Time slot for "${planned.service.name}" conflicts with an existing booking` },
                        { status: 409 }
                    );
                }
            }
        }

        // ── Check overlap with blocked times ─────────────────────
        const blockedForDate = await db
            .select()
            .from(blockedTimes)
            .where(eq(blockedTimes.date, date));

        for (const planned of bookingPlan) {
            for (const block of blockedForDate) {
                const blockStart = timeToMinutes(block.startTime);
                const blockEnd = timeToMinutes(block.endTime);
                if (planned.startMin < blockEnd && blockStart < planned.endMin) {
                    return NextResponse.json(
                        { error: `Time slot for "${planned.service.name}" is blocked` },
                        { status: 409 }
                    );
                }
            }
        }

        // ── Create bookings ──────────────────────────────────────
        const createdBookings = [];
        for (const planned of bookingPlan) {
            const cancellationToken = uuidv4();
            const newBooking = await db.insert(bookings).values({
                customerName: validatedData.customerName,
                customerEmail: validatedData.customerEmail,
                customerPhone: validatedData.customerPhone,
                serviceId: planned.service.id,
                date,
                time: planned.startTime,
                status: "confirmed",
                cancellationToken,
                notes: validatedData.notes,
            }).returning().get();

            createdBookings.push({
                ...newBooking,
                serviceName: planned.service.name,
                serviceDuration: planned.service.duration,
                servicePrice: planned.service.price,
                cancellationToken,
            });
        }

        // ── Send confirmation email (non-blocking) ───────────────
        sendBookingConfirmation({
            customerName: validatedData.customerName,
            customerEmail: validatedData.customerEmail,
            date,
            items: createdBookings.map(b => ({
                serviceName: b.serviceName,
                servicePrice: b.servicePrice,
                serviceDuration: b.serviceDuration,
                time: b.time,
                cancellationToken: b.cancellationToken,
            })),
        }).catch((err) => console.error("[Email] Background send failed:", err));

        // ── Broadcast each booking ───────────────────────────────
        for (const booking of createdBookings) {
            await broadcast({ event: "booking_created", data: booking });
        }

        return NextResponse.json(createdBookings, { status: 201 });
    } catch (error) {
        console.error("Booking error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
