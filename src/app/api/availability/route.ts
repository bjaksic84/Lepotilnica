import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, blockedTimes, services } from "@/db/schema";
import { eq, and, not, gte, lte } from "drizzle-orm";

// Generate 30-minute slots from 09:00 to 17:00
function generateSlots(): string[] {
    const slots: string[] = [];
    for (let h = 9; h < 17; h++) {
        slots.push(`${h.toString().padStart(2, "0")}:00`);
        slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    slots.push("17:00");
    return slots;
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "30");

    if (!date) {
        return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    try {
        // Get all bookings for the date that are not cancelled, with service duration
        const bookedSlots = await db
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

        // Get all blocked times for the date
        const blocked = await db
            .select()
            .from(blockedTimes)
            .where(eq(blockedTimes.date, date));

        const ALL_SLOTS = generateSlots();

        // Build a set of occupied minutes
        const occupiedMinutes = new Set<number>();

        // Mark minutes occupied by bookings (using service duration)
        for (const booking of bookedSlots) {
            const startMin = timeToMinutes(booking.time);
            const dur = booking.serviceDuration || 30;
            for (let m = startMin; m < startMin + dur; m++) {
                occupiedMinutes.add(m);
            }
        }

        // Mark minutes occupied by blocked times
        for (const block of blocked) {
            const startMin = timeToMinutes(block.startTime);
            const endMin = timeToMinutes(block.endTime);
            for (let m = startMin; m < endMin; m++) {
                occupiedMinutes.add(m);
            }
        }

        // Filter slots: a slot is available if the full requested duration fits
        const availableSlots = ALL_SLOTS.filter(slot => {
            const slotMin = timeToMinutes(slot);
            // Check that the service fits within working hours (end by 17:30)
            if (slotMin + duration > 17 * 60 + 30) return false;
            // Check none of the minutes in the duration are occupied
            for (let m = slotMin; m < slotMin + duration; m++) {
                if (occupiedMinutes.has(m)) return false;
            }
            return true;
        });

        // Also return booked and blocked slot info for the admin view
        const bookedTimes = bookedSlots.map(b => b.time);
        const blockedSlotTimes = blocked.map(b => ({ startTime: b.startTime, endTime: b.endTime }));

        return NextResponse.json({
            date,
            slots: availableSlots,
            bookedTimes,
            blockedSlots: blockedSlotTimes,
        });
    } catch (error) {
        console.error("Availability error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
