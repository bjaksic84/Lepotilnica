import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, services } from "@/db/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";

export async function GET(request: Request) {
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
