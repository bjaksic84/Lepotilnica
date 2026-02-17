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

// Analytics types
type AnalyticsData = {
    overview: {
        revenueThisMonth: number;
        revenueChange: number;
        totalBookingsThisMonth: number;
        bookingsChange: number;
        cancellationRate: number;
        avgBookingValue: number;
        newCustomers: number;
        returningCustomers: number;
        totalUniqueCustomers: number;
    };
    mostBookedService: { name: string; count: number; revenue: number } | null;
    serviceRanking: { name: string; count: number; revenue: number }[];
    popularTimeSlots: { time: string; count: number }[];
    busiestDay: { day: string; count: number } | null;
    dailyRevenue: { date: string; revenue: number }[];
    todaysBookings: { time: string; customerName: string; serviceName: string; status: string }[];
    loyalCustomers: {
        name: string;
        email: string;
        phone: string | null;
        totalBookings: number;
        totalSpent: number;
        distinctMonths: number;
        lastVisit: string;
        favouriteService: string;
    }[];
};

export default function AdminPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<"calendar" | "list" | "stats">("calendar");
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const router = useRouter();
    const { toasts, addToast, removeToast } = useToast();

    // ── Real-time WebSocket ────────────────────────────────────────────────
    const handleWsEvent = useCallback((event: WsEvent) => {
        if (event.event === "connected") return;

        const bookingEvents = ["booking_created", "booking_updated", "booking_deleted"];
        const blockedEvents = ["blocked_time_created", "blocked_time_deleted"];

        if ([...bookingEvents, ...blockedEvents].includes(event.event)) {
            fetchData();
            if (activeTab === "stats") fetchAnalytics();
        }

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
    }, [addToast, activeTab]);

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

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewDate]);

    useEffect(() => {
        if (activeTab === "stats" && !analytics) {
            fetchAnalytics();
        }
    }, [activeTab]);

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
            if (res.ok) fetchData();
            else alert("Failed to block time");
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

    const weekStats = {
        total: bookings.length,
        upcoming: bookings.filter(b => new Date(b.date + 'T' + b.time) >= new Date() && b.status === 'confirmed').length,
        revenue: bookings.filter(b => b.status === 'confirmed').reduce((acc, curr) => acc + curr.servicePrice, 0)
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20">
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

            {/* ── Booking Detail Modal ──────────────────────────────── */}
            {selectedBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Booking Details</p>
                                <h3 className="text-white text-lg font-bold mt-0.5">#{selectedBooking.id}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="text-white/60 hover:text-white transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                    selectedBooking.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                                    selectedBooking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {selectedBooking.status}
                                </span>
                                <span className="text-2xl font-bold text-gray-900">€{selectedBooking.servicePrice}</span>
                            </div>

                            {/* Customer Info */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                                        <span className="text-pink-700 font-bold text-sm">{selectedBooking.customerName.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{selectedBooking.customerName}</div>
                                        <div className="text-xs text-gray-400">Customer</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    {selectedBooking.customerEmail && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <span className="truncate">{selectedBooking.customerEmail}</span>
                                        </div>
                                    )}
                                    {selectedBooking.customerPhone && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span>{selectedBooking.customerPhone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Appointment Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</div>
                                    <div className="font-bold text-gray-900 mt-1">{format(new Date(selectedBooking.date), "EEE, MMM d, yyyy")}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</div>
                                    <div className="font-bold text-gray-900 mt-1">{selectedBooking.time}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service</div>
                                    <div className="font-bold text-gray-900 mt-1 text-sm">{selectedBooking.serviceName}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</div>
                                    <div className="font-bold text-gray-900 mt-1">{selectedBooking.serviceDuration} min</div>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedBooking.notes && (
                                <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                                    <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1">Notes</div>
                                    <p className="text-sm text-yellow-800">{selectedBooking.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="border-t border-gray-100 px-6 py-4 flex gap-2">
                            {selectedBooking.status !== 'cancelled' && (
                                <button
                                    onClick={() => {
                                        handleStatusUpdate(selectedBooking.id, 'cancelled');
                                        setSelectedBooking(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                                >
                                    Cancel Booking
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    handleDelete(selectedBooking.id);
                                    setSelectedBooking(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WebSocket Status */}
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
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-playfair font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-500 mt-1">Welcome back, Karin.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">This Week</span>
                            <span className="text-xl font-bold text-gray-900">{weekStats.upcoming} <span className="text-sm font-normal text-gray-400">upcoming</span></span>
                        </div>
                        <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue</span>
                            <span className="text-xl font-bold text-yellow-600">€{weekStats.revenue}</span>
                        </div>
                        <Link href="/admin/services" className="bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-sm font-bold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Services
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl w-fit shadow-sm border border-gray-100">
                    {(["calendar", "list", "stats"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                                activeTab === tab
                                    ? "bg-gray-900 text-white shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            {tab === "calendar" ? "Calendar" : tab === "list" ? "Bookings" : "Analytics"}
                        </button>
                    ))}
                </div>

                {/* ── Calendar Tab ────────────────────────────────────── */}
                {activeTab === "calendar" && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <h3 className="font-bold text-yellow-800 text-sm">How to use the calendar</h3>
                                <p className="text-yellow-700 text-sm">Click a booking to see full details. Drag on empty slots to block time. Click a blocked slot to remove it.</p>
                            </div>
                        </div>
                        <WeeklyTimetable
                            bookings={bookings}
                            blockedTimes={blockedTimes}
                            currentDate={viewDate}
                            onDateChange={setViewDate}
                            onBlockTime={handleBlockTime}
                            onDeleteBlock={handleDeleteBlock}
                            onBookingClick={(id) => {
                                const booking = bookings.find(b => b.id === id);
                                if (booking) setSelectedBooking(booking);
                            }}
                        />
                    </div>
                )}

                {/* ── List Tab ────────────────────────────────────────── */}
                {activeTab === "list" && (
                    <div className="space-y-4">
                        {bookings.length === 0 && (
                            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                No bookings found for this week.
                            </div>
                        )}

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {bookings.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()).map((booking) => (
                                <div key={booking.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-900">{format(new Date(booking.date), "EEE, MMM d")} at {booking.time}</div>
                                            <div className="text-sm text-gray-500">{booking.serviceName} ({booking.serviceDuration} min)</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
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
                                                <button onClick={() => handleStatusUpdate(booking.id, 'cancelled')} className="p-2 text-red-500 bg-red-50 rounded-full" title="Cancel">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(booking.id)} className="p-2 text-gray-400 bg-gray-50 rounded-full" title="Delete">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Client</th>
                                        <th className="px-6 py-4">Service</th>
                                        <th className="px-6 py-4">Price</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {bookings.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()).map((booking) => (
                                        <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{format(new Date(booking.date), "MMM d")}</div>
                                                <div className="text-gray-400 text-xs">{booking.time}</div>
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
                                                <span className="font-bold text-gray-900">€{booking.servicePrice}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700' : booking.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {booking.status !== 'cancelled' && (
                                                        <button onClick={() => handleStatusUpdate(booking.id, 'cancelled')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel Booking">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(booking.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors" title="Delete">
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
                )}

                {/* ── Stats/Analytics Tab ─────────────────────────────── */}
                {activeTab === "stats" && (
                    <div className="space-y-6">
                        {analyticsLoading && !analytics ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
                            </div>
                        ) : analytics ? (
                            <>
                                {/* KPI Cards Row */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        label="Revenue (Month)"
                                        value={`€${analytics.overview.revenueThisMonth}`}
                                        change={analytics.overview.revenueChange}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        }
                                    />
                                    <StatCard
                                        label="Bookings (Month)"
                                        value={String(analytics.overview.totalBookingsThisMonth)}
                                        change={analytics.overview.bookingsChange}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        }
                                    />
                                    <StatCard
                                        label="Avg. Booking Value"
                                        value={`€${analytics.overview.avgBookingValue}`}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        }
                                    />
                                    <StatCard
                                        label="Cancellation Rate"
                                        value={`${analytics.overview.cancellationRate}%`}
                                        invertChange
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        }
                                    />
                                </div>

                                {/* Two-column grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* Most Booked Service */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Top Services</h3>
                                        {analytics.serviceRanking.length > 0 ? (
                                            <div className="space-y-3">
                                                {analytics.serviceRanking.map((service, i) => {
                                                    const maxCount = analytics.serviceRanking[0].count;
                                                    const pct = Math.round((service.count / maxCount) * 100);
                                                    return (
                                                        <div key={service.name} className="group">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-gray-900">{service.name}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-sm font-bold text-gray-900">{service.count}</span>
                                                                    <span className="text-xs text-gray-400 ml-1">bookings</span>
                                                                    <span className="text-xs text-gray-300 mx-1">·</span>
                                                                    <span className="text-xs font-medium text-yellow-600">€{service.revenue}</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-yellow-400' : 'bg-gray-300'}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-sm">No bookings this month yet.</p>
                                        )}
                                    </div>

                                    {/* New vs Returning Customers */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Customer Breakdown</h3>
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-green-50 rounded-xl p-4 text-center">
                                                <div className="text-3xl font-bold text-green-700 font-playfair">{analytics.overview.newCustomers}</div>
                                                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mt-1">New</div>
                                            </div>
                                            <div className="bg-blue-50 rounded-xl p-4 text-center">
                                                <div className="text-3xl font-bold text-blue-700 font-playfair">{analytics.overview.returningCustomers}</div>
                                                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">Returning</div>
                                            </div>
                                        </div>
                                        {(analytics.overview.newCustomers + analytics.overview.returningCustomers) > 0 && (
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                    <span>New</span>
                                                    <span>Returning</span>
                                                </div>
                                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="bg-green-400 h-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.round((analytics.overview.newCustomers / (analytics.overview.newCustomers + analytics.overview.returningCustomers)) * 100)}%`
                                                        }}
                                                    />
                                                    <div className="bg-blue-400 h-full flex-1" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Total unique clients (all time)</span>
                                                <span className="font-bold text-gray-900">{analytics.overview.totalUniqueCustomers}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Popular Time Slots */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Peak Hours</h3>
                                        {analytics.popularTimeSlots.length > 0 ? (
                                            <div className="space-y-2.5">
                                                {analytics.popularTimeSlots.map((slot) => {
                                                    const maxCount = analytics.popularTimeSlots[0].count;
                                                    const pct = Math.round((slot.count / maxCount) * 100);
                                                    return (
                                                        <div key={slot.time} className="flex items-center gap-3">
                                                            <span className="text-sm font-mono font-bold text-gray-600 w-12">{slot.time}</span>
                                                            <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-lg flex items-center px-2 transition-all duration-500"
                                                                    style={{ width: `${Math.max(pct, 15)}%` }}
                                                                >
                                                                    <span className="text-[10px] font-bold text-yellow-900">{slot.count}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-sm">No data yet.</p>
                                        )}
                                        {analytics.busiestDay && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Busiest day</span>
                                                <span className="font-bold text-gray-900">{analytics.busiestDay.day} <span className="text-gray-400 font-normal text-xs">({analytics.busiestDay.count} bookings)</span></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Today's Schedule */}
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Today&apos;s Schedule</h3>
                                        {analytics.todaysBookings.length > 0 ? (
                                            <div className="space-y-2">
                                                {analytics.todaysBookings.map((b, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                                        <span className="text-sm font-mono font-bold text-gray-900 w-12">{b.time}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-gray-900 truncate">{b.customerName}</div>
                                                            <div className="text-xs text-gray-400 truncate">{b.serviceName}</div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                            {b.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" /></svg>
                                                <p className="text-sm text-gray-400">No appointments today.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Revenue Trend */}
                                {analytics.dailyRevenue.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Daily Revenue This Month</h3>
                                        <div className="flex items-end gap-1 h-32">
                                            {analytics.dailyRevenue.map((day) => {
                                                const maxRev = Math.max(...analytics.dailyRevenue.map(d => d.revenue));
                                                const pct = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0;
                                                return (
                                                    <div key={day.date} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                                                        <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-gray-700 bg-white shadow px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                                            €{day.revenue} · {day.date.slice(5)}
                                                        </div>
                                                        <div
                                                            className="w-full bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t transition-all duration-300 group-hover:from-yellow-500 group-hover:to-yellow-400 min-h-[2px]"
                                                            style={{ height: `${Math.max(pct, 2)}%` }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Loyal / Steady Customers */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loyal Customers</h3>
                                        <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">3+ visits, 2+ months</span>
                                    </div>
                                    {analytics.loyalCustomers && analytics.loyalCustomers.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                                    <tr>
                                                        <th className="pb-3 pr-4">Customer</th>
                                                        <th className="pb-3 pr-4">Visits</th>
                                                        <th className="pb-3 pr-4">Total Spent</th>
                                                        <th className="pb-3 pr-4">Favourite Service</th>
                                                        <th className="pb-3 pr-4">Last Visit</th>
                                                        <th className="pb-3">Months Active</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {analytics.loyalCustomers.map((customer, i) => (
                                                        <tr key={customer.email} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-3 pr-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {customer.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{customer.name}</div>
                                                                        <div className="text-xs text-gray-400">{customer.phone || customer.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 pr-4">
                                                                <span className="font-bold text-gray-900">{customer.totalBookings}</span>
                                                            </td>
                                                            <td className="py-3 pr-4">
                                                                <span className="font-bold text-yellow-600">€{customer.totalSpent}</span>
                                                            </td>
                                                            <td className="py-3 pr-4">
                                                                <span className="text-gray-700 text-xs bg-gray-50 px-2 py-1 rounded-full">{customer.favouriteService}</span>
                                                            </td>
                                                            <td className="py-3 pr-4">
                                                                <span className="text-gray-600 text-xs">{format(new Date(customer.lastVisit), "MMM d, yyyy")}</span>
                                                            </td>
                                                            <td className="py-3">
                                                                <span className="text-gray-600 text-xs">{customer.distinctMonths}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <p className="text-sm text-gray-400">No loyal customers identified yet.</p>
                                            <p className="text-xs text-gray-300 mt-1">Customers with 3+ bookings across 2+ months will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                                Failed to load analytics data.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Stat Card Component ─────────────────────────────────────────────────
function StatCard({ label, value, change, invertChange, icon }: {
    label: string;
    value: string;
    change?: number;
    invertChange?: boolean;
    icon: React.ReactNode;
}) {
    const isPositive = change !== undefined ? (invertChange ? change <= 0 : change >= 0) : true;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-gray-400">{icon}</span>
                {change !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                )}
            </div>
            <div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">{label}</div>
            </div>
        </div>
    );
}
