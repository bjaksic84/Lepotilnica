"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Booking = {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    serviceId: string;
    date: string;
    time: string;
    status: "confirmed" | "cancelled" | "completed" | "pending";
    notes?: string;
};

export default function AdminPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchBookings = () => {
        fetch("/api/admin/bookings")
            .then(res => {
                if (res.status === 401) {
                    router.push("/admin/login");
                    throw new Error("Unauthorized");
                }
                return res.json();
            })
            .then(data => {
                setBookings(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleStatusUpdate = async (id: number, status: string) => {
        if (!confirm(`Are you sure you want to mark this booking as ${status}?`)) return;

        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.ok) fetchBookings();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this booking permanently?")) return;

        try {
            const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
            if (res.ok) fetchBookings();
        } catch (error) {
            alert("Failed to delete booking");
        }
    };

    const handleBlockSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const date = (form.elements.namedItem("date") as HTMLInputElement).value;
        const time = (form.elements.namedItem("time") as HTMLInputElement).value;

        if (!date || !time) return;

        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date,
                    time,
                    customerName: "Admin Blocked",
                    customerEmail: "admin@lepotilnica.si",
                    customerPhone: "000",
                    serviceId: "blocked",
                    status: "confirmed"
                }),
            });

            if (res.ok) {
                alert("Slot blocked successfully");
                fetchBookings();
                form.reset();
            } else {
                alert("Failed to block slot");
            }
        } catch (error) {
            alert("Error blocking slot");
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
        </div>
    );

    const stats = {
        total: bookings.length,
        upcoming: bookings.filter(b => new Date(b.date) >= new Date() && b.status === 'confirmed').length,
        revenue: bookings.filter(b => b.status === 'confirmed').reduce((acc, curr) => {
            const price = curr.serviceId === 'facial' ? 85 : curr.serviceId === 'massage' ? 70 : curr.serviceId === 'manicure' ? 45 : 0;
            return acc + price;
        }, 0)
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-playfair font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Welcome back, Karin.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Upcoming</span>
                            <span className="text-2xl font-bold text-gray-900">{stats.upcoming}</span>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Est. Revenue</span>
                            <span className="text-2xl font-bold text-yellow-600">€{stats.revenue}</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-4 mb-8">
                    <div className="px-6 py-3 rounded-xl font-bold bg-yellow-500 text-white shadow-lg cursor-default">Bookings</div>
                    <Link href="/admin/services" className="px-6 py-3 rounded-xl font-bold bg-white text-gray-600 hover:bg-gray-100 transition-all">Services</Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Booking List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-1 shadow-sm border border-gray-200">
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
                                        {bookings.map((booking) => (
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
                                                    <span className="capitalize px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
                                                        {booking.serviceId}
                                                    </span>
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

                    {/* Sidebar / Quick Actions */}
                    <div className="space-y-8">
                        {/* Manage Services Card */}
                        <Link href="/admin/services" className="block glass-panel p-6 rounded-2xl hover:shadow-lg transition-all group">
                            <h2 className="text-xl font-playfair font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Manage Services
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">Create, edit, and manage your service categories and offerings.</p>
                            <span className="text-yellow-600 font-bold text-sm group-hover:underline">Go to Service Management →</span>
                        </Link>

                        {/* Block Slot Card */}
                        <div className="glass-panel p-6 rounded-2xl">
                            <h2 className="text-xl font-playfair font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Block Time Slot
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">Prevent bookings for specific dates/times (e.g. holidays).</p>

                            <form onSubmit={handleBlockSlot} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest pl-1">Date</label>
                                    <input type="date" name="date" required className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-400/50 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest pl-1">Time</label>
                                    <select name="time" required className="w-full px-4 py-3 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-400/50 outline-none text-sm appearance-none">
                                        {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-md">
                                    Block Availability
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

