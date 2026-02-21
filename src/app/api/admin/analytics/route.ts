import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, services } from "@/db/schema";
import { eq, and, gte, lte, not, sql, desc, count } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET() {
    try {
        const now = new Date();
        const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
        const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
        const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
        const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

        // ── 1. This month's bookings (confirmed only) ──────────────────
        const thisMonthBookings = await db
            .select({
                id: bookings.id,
                customerName: bookings.customerName,
                customerEmail: bookings.customerEmail,
                serviceId: bookings.serviceId,
                date: bookings.date,
                time: bookings.time,
                status: bookings.status,
                serviceName: services.name,
                servicePrice: services.price,
                serviceDuration: services.duration,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .where(
                and(
                    gte(bookings.date, thisMonthStart),
                    lte(bookings.date, thisMonthEnd)
                )
            );

        // ── 2. Last month's bookings for comparison ─────────────────────
        const lastMonthBookings = await db
            .select({
                id: bookings.id,
                status: bookings.status,
                servicePrice: services.price,
                customerEmail: bookings.customerEmail,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .where(
                and(
                    gte(bookings.date, lastMonthStart),
                    lte(bookings.date, lastMonthEnd)
                )
            );

        // ── 3. All-time bookings for returning customer analysis ────────
        const allBookings = await db
            .select({
                customerEmail: bookings.customerEmail,
                customerName: bookings.customerName,
                customerPhone: bookings.customerPhone,
                status: bookings.status,
                date: bookings.date,
                servicePrice: services.price,
                serviceName: services.name,
            })
            .from(bookings)
            .leftJoin(services, eq(bookings.serviceId, services.id))
            .where(not(eq(bookings.status, "cancelled")));

        // ── Calculations ────────────────────────────────────────────────

        const confirmedThisMonth = thisMonthBookings.filter(b => b.status !== "cancelled");
        const confirmedLastMonth = lastMonthBookings.filter(b => b.status !== "cancelled");

        // Revenue this month (confirmed/pending bookings)
        const revenueThisMonth = confirmedThisMonth.reduce((sum, b) => sum + (b.servicePrice || 0), 0);
        const revenueLastMonth = confirmedLastMonth.reduce((sum, b) => sum + (b.servicePrice || 0), 0);
        const revenueChange = revenueLastMonth > 0
            ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
            : revenueThisMonth > 0 ? 100 : 0;

        // Total bookings this month
        const totalBookingsThisMonth = confirmedThisMonth.length;
        const totalBookingsLastMonth = confirmedLastMonth.length;
        const bookingsChange = totalBookingsLastMonth > 0
            ? Math.round(((totalBookingsThisMonth - totalBookingsLastMonth) / totalBookingsLastMonth) * 100)
            : totalBookingsThisMonth > 0 ? 100 : 0;

        // Cancellation rate
        const cancelledThisMonth = thisMonthBookings.filter(b => b.status === "cancelled").length;
        const cancellationRate = thisMonthBookings.length > 0
            ? Math.round((cancelledThisMonth / thisMonthBookings.length) * 100)
            : 0;

        // Most booked service
        const serviceCount: Record<string, { name: string; count: number; revenue: number }> = {};
        for (const b of confirmedThisMonth) {
            const name = b.serviceName || "Unknown";
            if (!serviceCount[name]) serviceCount[name] = { name, count: 0, revenue: 0 };
            serviceCount[name].count++;
            serviceCount[name].revenue += b.servicePrice || 0;
        }
        const serviceRanking = Object.values(serviceCount).sort((a, b) => b.count - a.count);
        const mostBookedService = serviceRanking[0] || null;

        // New vs returning customers (all-time analysis)
        const customerFirstBooking: Record<string, string> = {};
        const sortedAll = [...allBookings].sort((a, b) => a.date.localeCompare(b.date));
        for (const b of sortedAll) {
            if (!customerFirstBooking[b.customerEmail]) {
                customerFirstBooking[b.customerEmail] = b.date;
            }
        }

        let newCustomersThisMonth = 0;
        let returningCustomersThisMonth = 0;
        const seenThisMonth = new Set<string>();
        for (const b of confirmedThisMonth) {
            if (seenThisMonth.has(b.customerEmail)) continue;
            seenThisMonth.add(b.customerEmail);

            const firstDate = customerFirstBooking[b.customerEmail];
            if (firstDate && firstDate >= thisMonthStart) {
                newCustomersThisMonth++;
            } else {
                returningCustomersThisMonth++;
            }
        }

        // Average booking value
        const avgBookingValue = confirmedThisMonth.length > 0
            ? Math.round(revenueThisMonth / confirmedThisMonth.length)
            : 0;

        // Popular time slots
        const timeSlotCount: Record<string, number> = {};
        for (const b of confirmedThisMonth) {
            const hour = b.time.split(":")[0] + ":00";
            timeSlotCount[hour] = (timeSlotCount[hour] || 0) + 1;
        }
        const popularTimeSlots = Object.entries(timeSlotCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([time, count]) => ({ time, count }));

        // Busiest day of week
        const dayCount: Record<string, number> = {};
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for (const b of confirmedThisMonth) {
            const dayOfWeek = new Date(b.date).getDay();
            const dayName = dayNames[dayOfWeek];
            dayCount[dayName] = (dayCount[dayName] || 0) + 1;
        }
        const busiestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0] || null;

        // Daily revenue for chart (this month)
        const dailyRevenue: Record<string, number> = {};
        for (const b of confirmedThisMonth) {
            dailyRevenue[b.date] = (dailyRevenue[b.date] || 0) + (b.servicePrice || 0);
        }

        // Upcoming bookings today
        const today = format(now, "yyyy-MM-dd");
        const todaysBookings = confirmedThisMonth
            .filter(b => b.date === today)
            .sort((a, b) => a.time.localeCompare(b.time));

        // ── Loyal / Steady Customers ─────────────────────────────────────
        // A "loyal" customer is someone with 3+ bookings across 2+ distinct months
        const customerStats: Record<string, {
            name: string;
            email: string;
            phone: string | null;
            totalBookings: number;
            totalSpent: number;
            months: Set<string>;  // YYYY-MM
            lastVisit: string;
            favouriteService: string;
        }> = {};

        for (const b of sortedAll) {
            const email = b.customerEmail;
            const month = b.date.slice(0, 7); // YYYY-MM
            if (!customerStats[email]) {
                customerStats[email] = {
                    name: b.customerName,
                    email,
                    phone: b.customerPhone ?? null,
                    totalBookings: 0,
                    totalSpent: 0,
                    months: new Set(),
                    lastVisit: b.date,
                    favouriteService: "",
                };
            }
            const stat = customerStats[email];
            stat.totalBookings++;
            stat.totalSpent += b.servicePrice || 0;
            stat.months.add(month);
            if (b.date > stat.lastVisit) stat.lastVisit = b.date;
            // Keep latest name/phone in case they updated
            stat.name = b.customerName;
            if (b.customerPhone) stat.phone = b.customerPhone;
        }

        // Determine favourite service per customer
        const customerServiceCount: Record<string, Record<string, number>> = {};
        for (const b of sortedAll) {
            const svcName = b.serviceName || "Unknown";
            if (!customerServiceCount[b.customerEmail]) customerServiceCount[b.customerEmail] = {};
            customerServiceCount[b.customerEmail][svcName] = (customerServiceCount[b.customerEmail][svcName] || 0) + 1;
        }
        for (const email of Object.keys(customerStats)) {
            const svcCounts = customerServiceCount[email] || {};
            const sorted = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) customerStats[email].favouriteService = sorted[0][0];
        }

        // Filter to loyal: 3+ bookings AND visited in 2+ distinct months
        const loyalCustomers = Object.values(customerStats)
            .filter(c => c.totalBookings >= 3 && c.months.size >= 2)
            .sort((a, b) => b.totalBookings - a.totalBookings)
            .map(c => ({
                name: c.name,
                email: c.email,
                phone: c.phone,
                totalBookings: c.totalBookings,
                totalSpent: c.totalSpent,
                distinctMonths: c.months.size,
                lastVisit: c.lastVisit,
                favouriteService: c.favouriteService,
            }));

        return NextResponse.json({
            overview: {
                revenueThisMonth,
                revenueChange,
                totalBookingsThisMonth,
                bookingsChange,
                cancellationRate,
                avgBookingValue,
                newCustomers: newCustomersThisMonth,
                returningCustomers: returningCustomersThisMonth,
                totalUniqueCustomers: Object.keys(customerFirstBooking).length,
            },
            mostBookedService,
            serviceRanking: serviceRanking.slice(0, 5),
            popularTimeSlots,
            busiestDay: busiestDay ? { day: busiestDay[0], count: busiestDay[1] } : null,
            dailyRevenue: Object.entries(dailyRevenue)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, revenue]) => ({ date, revenue })),
            todaysBookings: todaysBookings.map(b => ({
                time: b.time,
                customerName: b.customerName,
                customerEmail: b.customerEmail,
                serviceName: b.serviceName,
                status: b.status,
                bookingId: b.id,
            })),
            loyalCustomers,
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
