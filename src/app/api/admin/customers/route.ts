import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, services, customerNotes, noShows } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET /api/admin/customers — List all customers grouped by email with their notes
export async function GET() {
    try {
        // 1. Get all unique customers from bookings
        const allBookings = await db
            .select({
                customerName: bookings.customerName,
                customerEmail: bookings.customerEmail,
                customerPhone: bookings.customerPhone,
                date: bookings.date,
                time: bookings.time,
                status: bookings.status,
                bookingNotes: bookings.notes,
                bookingId: bookings.id,
                serviceName: services.name,
                createdAt: bookings.createdAt,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .orderBy(desc(bookings.date), desc(bookings.time));

        // 2. Get all admin notes
        const allNotes = await db
            .select()
            .from(customerNotes)
            .orderBy(desc(customerNotes.createdAt));

        // 3. Get no-show data
        const allNoShows = await db.select().from(noShows);
        const noShowMap: Record<string, number> = {};
        for (const ns of allNoShows) {
            noShowMap[ns.customerEmail.toLowerCase()] = ns.count;
        }

        // 4. Group by email
        const customerMap = new Map<string, {
            email: string;
            name: string;
            phone: string | null;
            totalBookings: number;
            lastVisit: string;
            noShowCount: number;
            bookingNotes: { note: string; date: string; serviceName: string | null; bookingId: number }[];
            adminNotes: { id: number; note: string; createdAt: string }[];
        }>();

        for (const b of allBookings) {
            const email = b.customerEmail.toLowerCase();
            if (!customerMap.has(email)) {
                customerMap.set(email, {
                    email: b.customerEmail,
                    name: b.customerName,
                    phone: b.customerPhone,
                    totalBookings: 0,
                    lastVisit: b.date,
                    noShowCount: noShowMap[email] || 0,
                    bookingNotes: [],
                    adminNotes: [],
                });
            }
            const customer = customerMap.get(email)!;
            customer.totalBookings++;
            // Keep the latest name / phone
            if (b.date > customer.lastVisit) {
                customer.lastVisit = b.date;
                customer.name = b.customerName;
                if (b.customerPhone) customer.phone = b.customerPhone;
            }
            if (b.bookingNotes && b.bookingNotes.trim()) {
                customer.bookingNotes.push({
                    note: b.bookingNotes,
                    date: b.date,
                    serviceName: b.serviceName,
                    bookingId: b.bookingId,
                });
            }
        }

        // 5. Attach admin notes
        for (const note of allNotes) {
            const email = note.customerEmail.toLowerCase();
            const customer = customerMap.get(email);
            if (customer) {
                customer.adminNotes.push({
                    id: note.id,
                    note: note.note,
                    createdAt: note.createdAt,
                });
            } else {
                // Admin note for an email that no longer has bookings — still show
                customerMap.set(email, {
                    email: note.customerEmail,
                    name: note.customerEmail,
                    phone: null,
                    totalBookings: 0,
                    lastVisit: "",
                    noShowCount: noShowMap[email] || 0,
                    bookingNotes: [],
                    adminNotes: [{
                        id: note.id,
                        note: note.note,
                        createdAt: note.createdAt,
                    }],
                });
            }
        }

        // 6. Sort customers by last visit descending
        const customers = Array.from(customerMap.values()).sort((a, b) => {
            if (!a.lastVisit) return 1;
            if (!b.lastVisit) return -1;
            return b.lastVisit.localeCompare(a.lastVisit);
        });

        return NextResponse.json(customers);
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
