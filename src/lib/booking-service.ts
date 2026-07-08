import { db } from "@/db";
import { bookings, blockedTimes, services } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { timeToMinutes, minutesToTime, getScheduleForDateStr } from "@/lib/schedule";

/**
 * Shared booking-creation core used by both the public flow (/api/bookings) and
 * the admin manual flow (/api/admin/bookings). It validates the schedule,
 * builds a sequential plan for one or more services starting at `time`, checks
 * for overlaps against existing bookings and blocked times, and inserts the
 * rows. Callers layer their own policy on top (rate limiting, blacklist,
 * confirmation email).
 */

export type CreatedBookingItem = {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    serviceId: number;
    date: string;
    time: string;
    status: string;
    notes: string | null;
    cancellationToken: string;
    serviceName: string;
    serviceDuration: number;
    servicePrice: number;
};

export type CreateBookingsInput = {
    serviceIds: number[];
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    date: string;
    time: string;
    notes?: string;
};

export type CreateBookingsResult =
    | { ok: false; status: number; error: string }
    | { ok: true; created: CreatedBookingItem[] };

export async function createBookings(input: CreateBookingsInput): Promise<CreateBookingsResult> {
    const { serviceIds, date, time } = input;

    // ── Check day is open ────────────────────────────────────
    const schedule = getScheduleForDateStr(date);
    if (!schedule) {
        return { ok: false, status: 400, error: "The salon is closed on this day." };
    }

    // ── Look up all requested services ───────────────────────
    const serviceRecords: (typeof services.$inferSelect)[] = [];
    for (const id of serviceIds) {
        const service = await db.select().from(services).where(eq(services.id, id)).get();
        if (!service) {
            return { ok: false, status: 404, error: `Service not found: ${id}` };
        }
        serviceRecords.push(service);
    }

    // ── Build sequential booking plan ────────────────────────
    const openingMin = timeToMinutes(schedule.open);
    const closingMin = timeToMinutes(schedule.close);
    let currentTimeMin = timeToMinutes(time);

    if (currentTimeMin < openingMin) {
        return { ok: false, status: 400, error: "Requested time is before opening hours" };
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
            return { ok: false, status: 400, error: `Service "${service.name}" would end after closing time` };
        }

        bookingPlan.push({ service, startTime: minutesToTime(startMin), startMin, endMin });
        currentTimeMin = endMin;
    }

    // ── Check overlap with existing bookings ─────────────────
    const existingBookings = await db
        .select({ time: bookings.time, serviceDuration: services.duration })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(eq(bookings.date, date), not(eq(bookings.status, "cancelled"))));

    for (const planned of bookingPlan) {
        for (const existing of existingBookings) {
            const existStart = timeToMinutes(existing.time);
            const existEnd = existStart + (existing.serviceDuration || 30);
            if (planned.startMin < existEnd && existStart < planned.endMin) {
                return { ok: false, status: 409, error: `Time slot for "${planned.service.name}" conflicts with an existing booking` };
            }
        }
    }

    // ── Check overlap with blocked times ─────────────────────
    const blockedForDate = await db.select().from(blockedTimes).where(eq(blockedTimes.date, date));

    for (const planned of bookingPlan) {
        for (const block of blockedForDate) {
            const blockStart = timeToMinutes(block.startTime);
            const blockEnd = timeToMinutes(block.endTime);
            if (planned.startMin < blockEnd && blockStart < planned.endMin) {
                return { ok: false, status: 409, error: `Time slot for "${planned.service.name}" is blocked` };
            }
        }
    }

    // ── Create bookings ──────────────────────────────────────
    const created: CreatedBookingItem[] = [];
    for (const planned of bookingPlan) {
        const cancellationToken = uuidv4();
        const newBooking = await db
            .insert(bookings)
            .values({
                customerName: input.customerName,
                customerEmail: input.customerEmail,
                customerPhone: input.customerPhone,
                serviceId: planned.service.id,
                date,
                time: planned.startTime,
                status: "confirmed",
                cancellationToken,
                notes: input.notes,
            })
            .returning()
            .get();

        created.push({
            ...newBooking,
            serviceName: planned.service.name,
            serviceDuration: planned.service.duration,
            servicePrice: planned.service.price,
            cancellationToken,
        });
    }

    return { ok: true, created };
}
