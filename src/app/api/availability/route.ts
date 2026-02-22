import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, blockedTimes, services } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";
import { generateSlotsForDateStr, getClosingMinutes, timeToMinutes } from "@/lib/schedule";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "30");

    if (!date) {
        return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    try {
        const closingMin = getClosingMinutes(date);
        if (closingMin === 0) {
            // Salon is closed on this day
            return NextResponse.json({ date, slots: [], bookedTimes: [], blockedSlots: [] });
        }

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

        // Day-specific 30-min slots (respects day-of-week opening hours)
        const ALL_SLOTS = generateSlotsForDateStr(date);

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
            // Check that the service fits within working hours
            if (slotMin + duration > closingMin) return false;
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
