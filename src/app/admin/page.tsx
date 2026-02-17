"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WeeklyTimetable, { Booking as WeeklyBooking, BlockedTime } from "@/components/WeeklyTimetable";
import { useWebSocket, WsEvent } from "@/lib/useWebSocket";
import ToastContainer, { useToast } from "@/components/Toast";

type Booking = WeeklyBooking & {
    customerEmail: string;
    customerPhone: string;
    serviceId: number;
    notes?: string;
    serviceName: string;
    serviceDuration: number;
    servicePrice: number;
};

export default function AdminPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

    const router = useRouter();
    const { toasts, addToast, removeToast } = useToast();

    // ── Real-time WebSocket ────────────────────────────────────────────────
    const handleWsEvent = useCallback((event: WsEvent) => {
        if (event.event === "connected") return;

        // Auto-refresh data on any booking or blocked-time event
        const bookingEvents = ["booking_created", "booking_updated", "booking_deleted"];
        const blockedEvents = ["blocked_time_created", "blocked_time_deleted"];

        if ([...bookingEvents, ...blockedEvents].includes(event.event)) {
            fetchData();
        }

        // Show toast notifications
        const messages: Record<string, { title: string; message: string }> = {
            booking_created: { title: "New Booking", message: `${(event.data as Record<string, unknown>).customerName || "A customer"} just booked an appointment` },
            booking_updated: { title: "Booking Updated", message: `Booking #${(event.data as Record<string, unknown>).id} status changed to ${(event.data as Record<string, unknown>).status}` },
            booking_deleted: { title: "Booking Deleted", message: `Booking #${(event.data as Record<string, unknown>).id} was removed` },
            blocked_time_created: { title: "Time Blocked", message: "A new time slot has been blocked" },
            blocked_time_deleted: { title: "Block Removed", message: "A blocked time slot was freed up" },
            service_created: { title: "Service Added", message: "A new service was created" },
            service_updated: { title: "Service Updated", message: "A service was modified" },
            service_deleted: { title: "Service Deleted", message: "A service was removed" },
            category_created: { title: "Category Added", message: "A new category was created" },
            category_updated: { title: "Category Updated", message: "A category was modified" },
            category_deleted: { title: "Category Deleted", message: "A category was removed" },
        };

        const msg = messages[event.event];
        if (msg) {
            addToast({
                type: bookingEvents.includes(event.event) ? "info" : blockedEvents.includes(event.event) ? "warning" : "success",
                title: msg.title,
                message: msg.message,
            });
        }
    }, [addToast]);

    const { status: wsStatus } = useWebSocket({ onEvent: handleWsEvent });

    const fetchData = async () => {
        setLoading(true);
        try {
            const weekStart = format(startOfWeek(viewDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
            const weekEnd = format(endOfWeek(viewDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

            const [bookingsRes, blockedRes] = await Promise.all([
                fetch(`/api/admin/bookings?weekStart=${weekStart}&weekEnd=${weekEnd}`),
                fetch(`/api/admin/blocked-times?startDate=${weekStart}&endDate=${weekEnd}`)
            ]);

            if (bookingsRes.status === 401) {
                router.push("/admin/login");
                throw new Error("Unauthorized");
            }

            const bookingsData = await bookingsRes.json();
            const blockedData = await blockedRes.json();

            setBookings(bookingsData);
            setBlockedTimes(blockedData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewDate]); // Refetch when week changes

    const handleStatusUpdate = async (id: number, status: string) => {
        if (!confirm(`Are you sure you want to mark this booking as ${status}?`)) return;

        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.ok) fetchData();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this booking permanently?")) return;

        try {
            const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
            if (res.ok) fetchData();
        } catch (error) {
            alert("Failed to delete booking");
        }
    };

    const handleBlockTime = async (date: string, startTime: string, endTime: string) => {
        try {
            const res = await fetch("/api/admin/blocked-times", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, startTime, endTime, reason: "Manual Block" }),
            });

            if (res.ok) {
                fetchData();
            } else {
                alert("Failed to block time");
            }
        } catch (error) {
            console.error(error);
            alert("Error blocking time");
        }
    };

    const handleDeleteBlock = async (id: number) => {
        if (!confirm("Remove this blocked time?")) return;
        try {
            const res = await fetch(`/api/admin/blocked-times/${id}`, { method: "DELETE" });
            if (res.ok) fetchData();
        } catch (error) {
            alert("Failed to delete block");
        }
    };

    if (loading && bookings.length === 0) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
        </div>
    );

    const stats = {
        total: bookings.length, // Only shows for current week now, might want separate total stats api later
        upcoming: bookings.filter(b => new Date(b.date + 'T' + b.time) >= new Date() && b.status === 'confirmed').length,
        revenue: bookings.filter(b => b.status === 'confirmed').reduce((acc, curr) => acc + curr.servicePrice, 0)
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20">
            {/* Real-time Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

            {/* WebSocket Status Indicator */}
            <div className="fixed bottom-4 right-4 z-50">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                    wsStatus === "connected"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : wsStatus === "reconnecting" || wsStatus === "connecting"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        wsStatus === "connected" ? "bg-green-500 animate-pulse" : wsStatus === "reconnecting" || wsStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                    }`} />
                    {wsStatus === "connected" ? "Live" : wsStatus === "reconnecting" ? "Reconnecting..." : wsStatus === "connecting" ? "Connecting..." : "Offline"}
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-playfair font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Welcome back, Karin.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue (Week)</span>
                            <span className="text-2xl font-bold text-yellow-600">€{stats.revenue}</span>
                        </div>
                        <Link href="/admin/services" className="bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg border border-transparent hover:bg-gray-800 transition-all flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Manage Services
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl w-fit shadow-sm border border-gray-100">
                    <button
                        onClick={() => setViewMode("calendar")}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === "calendar" ? "bg-yellow-100 text-yellow-800" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        Calendar View
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === "list" ? "bg-yellow-100 text-yellow-800" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        List View
                    </button>
                </div>

                {viewMode === "calendar" ? (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <h3 className="font-bold text-yellow-800 text-sm">How to block time?</h3>
                                <p className="text-yellow-700 text-sm">Click and drag on empty slots in the calendar to block time. Click on a blocked slot to remove it.</p>
                            </div>
                        </div>
                        <WeeklyTimetable
                            bookings={bookings}
                            blockedTimes={blockedTimes}
                            currentDate={viewDate}
                            onDateChange={setViewDate}
                            onBlockTime={handleBlockTime}
                            onDeleteBlock={handleDeleteBlock}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.length === 0 && (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">No bookings found for this week.</div>
                        )}

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {bookings.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()).map((booking) => (
                                <div key={booking.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-900">{format(new Date(booking.date), "EEE, MMM d")} at {booking.time}</div>
                                            <div className="text-sm text-gray-500">{booking.serviceName} ({booking.serviceDuration} min)</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {booking.status}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-sm text-gray-900">{booking.customerName}</div>
                                            <div className="text-xs text-gray-400">{booking.customerPhone}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            {booking.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                                    className="p-2 text-red-500 bg-red-50 rounded-full"
                                                    title="Cancel"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(booking.id)}
                                                className="p-2 text-gray-400 bg-gray-50 rounded-full"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-2xl p-1 shadow-sm border border-gray-200">
                            <div className="overflow-x-auto rounded-xl">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-900 font-bold uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Date & Time</th>
                                            <th className="px-6 py-4">Client</th>
                                            <th className="px-6 py-4">Service</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {bookings.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()).map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-bold text-gray-900 text-base">
                                                        {format(new Date(booking.date), "MMM d")}
                                                    </div>
                                                    <div className="text-gray-500 font-medium">{booking.time}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{booking.customerName}</div>
                                                    <div className="text-xs text-gray-400">{booking.customerPhone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-gray-900">{booking.serviceName}</span>
                                                    <span className="text-xs text-gray-400 block">{booking.serviceDuration} min</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {booking.status !== 'cancelled' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                title="Cancel Booking"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(booking.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                                                            title="Delete Permanently"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
