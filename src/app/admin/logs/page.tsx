"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWebSocket, WsEvent } from "@/lib/useWebSocket";
import ToastContainer, { useToast } from "@/components/Toast";

type BookingNote = {
    note: string;
    date: string;
    serviceName: string | null;
    bookingId: number;
};

type AdminNote = {
    id: number;
    note: string;
    createdAt: string;
};

type Customer = {
    email: string;
    name: string;
    phone: string | null;
    totalBookings: number;
    lastVisit: string;
    noShowCount: number;
    bookingNotes: BookingNote[];
    adminNotes: AdminNote[];
};

export default function AdminLogsPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
    const [newNote, setNewNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const router = useRouter();
    const { toasts, addToast, removeToast } = useToast();

    const handleWsEvent = useCallback((event: WsEvent) => {
        if (event.event === "connected") return;
        const bookingEvents = ["booking_created", "booking_updated", "booking_deleted"];
        if (bookingEvents.includes(event.event)) {
            fetchCustomers();
        }
    }, []);

    const { status: wsStatus } = useWebSocket({ onEvent: handleWsEvent });

    const fetchCustomers = async () => {
        try {
            const res = await fetch("/api/admin/customers");
            if (res.status === 401) {
                router.push("/admin/login");
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const addNote = async (email: string) => {
        if (!newNote.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/customers/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerEmail: email, note: newNote }),
            });
            if (res.ok) {
                addToast({ type: "success", title: "Note Added", message: "Your note has been saved." });
                setNewNote("");
                fetchCustomers();
            } else {
                addToast({ type: "error", title: "Error", message: "Failed to add note." });
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to add note." });
        } finally {
            setSubmitting(false);
        }
    };

    const deleteNote = async (noteId: number) => {
        if (!confirm("Delete this note?")) return;
        try {
            const res = await fetch(`/api/admin/customers/notes?id=${noteId}`, { method: "DELETE" });
            if (res.ok) {
                addToast({ type: "info", title: "Deleted", message: "Note removed." });
                fetchCustomers();
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to delete note." });
        }
    };

    const filteredCustomers = customers.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.email.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(q))
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20">
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

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
                <div className="mb-8">
                    <Link href="/admin" className="text-yellow-600 text-sm font-bold hover:underline mb-4 inline-block">← Back to Dashboard</Link>
                    <h1 className="text-4xl font-playfair font-bold text-gray-900">Customer Logs</h1>
                    <p className="text-gray-500 mt-1">View customer history and manage notes for custom treatments.</p>
                </div>

                {/* Dashboard Navigation */}
                <div className="flex gap-4 mb-8">
                    <Link href="/admin" className="px-6 py-3 rounded-xl font-bold bg-white text-gray-600 hover:bg-gray-100 transition-all">Bookings</Link>
                    <Link href="/admin/services" className="px-6 py-3 rounded-xl font-bold bg-white text-gray-600 hover:bg-gray-100 transition-all">Services</Link>
                    <div className="px-6 py-3 rounded-xl font-bold bg-yellow-500 text-white shadow-lg cursor-default">Logs</div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, email or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Customers</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-yellow-600">{customers.filter(c => c.adminNotes.length > 0).length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">With Admin Notes</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-blue-600">{customers.filter(c => c.bookingNotes.length > 0).length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">With Booking Notes</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-red-600">{customers.filter(c => c.noShowCount >= 2).length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Blacklisted</div>
                    </div>
                </div>

                {/* Customer List */}
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {search ? "No customers match your search." : "No customers found."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCustomers.map((customer) => {
                            const isExpanded = expandedEmail === customer.email.toLowerCase();
                            const allNotesCount = customer.bookingNotes.length + customer.adminNotes.length;

                            return (
                                <div key={customer.email} className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                                    customer.noShowCount >= 2
                                        ? "border-red-200 ring-1 ring-red-100"
                                        : "border-gray-100"
                                }`}>
                                    {/* Customer Row */}
                                    <button
                                        onClick={() => {
                                            setExpandedEmail(isExpanded ? null : customer.email.toLowerCase());
                                            setNewNote("");
                                        }}
                                        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            customer.noShowCount >= 2
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-50 text-yellow-700"
                                        }`}>
                                            <span className="font-bold text-sm">{customer.name.charAt(0).toUpperCase()}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-gray-900">{customer.name}</span>
                                                {customer.noShowCount >= 2 && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 tracking-wide">Blacklisted</span>
                                                )}
                                                {customer.noShowCount === 1 && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-700 tracking-wide">1 No-Show</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 truncate">{customer.email}</div>
                                        </div>

                                        {/* Meta Badges */}
                                        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-900">{customer.totalBookings}</div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Bookings</div>
                                            </div>
                                            {customer.lastVisit && (
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-gray-600">{format(new Date(customer.lastVisit), "MMM d, yyyy")}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Last Visit</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes count + chevron */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {allNotesCount > 0 && (
                                                <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                    {allNotesCount} note{allNotesCount !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-5 py-4 space-y-5 bg-gray-50/30">
                                            {/* Contact Info */}
                                            <div className="flex flex-wrap gap-4 text-sm">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {customer.email}
                                                </div>
                                                {customer.phone && (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        {customer.phone}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-gray-600 md:hidden">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {customer.totalBookings} bookings
                                                </div>
                                            </div>

                                            {/* Booking Notes */}
                                            {customer.bookingNotes.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Booking Notes</h4>
                                                    <div className="space-y-2">
                                                        {customer.bookingNotes.map((bn, i) => (
                                                            <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                                                                        {bn.serviceName || "Booking"} · {format(new Date(bn.date), "MMM d, yyyy")}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-blue-800">{bn.note}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Admin Notes */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                                    Your Notes
                                                    {customer.adminNotes.length > 0 && (
                                                        <span className="ml-2 text-yellow-600 normal-case">({customer.adminNotes.length})</span>
                                                    )}
                                                </h4>
                                                {customer.adminNotes.length > 0 ? (
                                                    <div className="space-y-2 mb-3">
                                                        {customer.adminNotes.map((an) => (
                                                            <div key={an.id} className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 group">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1">
                                                                        <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block mb-1">
                                                                            {format(new Date(an.createdAt), "MMM d, yyyy · HH:mm")}
                                                                        </span>
                                                                        <p className="text-sm text-yellow-800 whitespace-pre-wrap">{an.note}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => deleteNote(an.id)}
                                                                        className="opacity-0 group-hover:opacity-100 p-1 text-yellow-400 hover:text-red-500 transition-all flex-shrink-0"
                                                                        title="Delete note"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 mb-3">No admin notes yet.</p>
                                                )}

                                                {/* Add Note Form */}
                                                <div className="flex gap-2">
                                                    <textarea
                                                        value={newNote}
                                                        onChange={(e) => setNewNote(e.target.value)}
                                                        placeholder="Add a note about this customer (e.g. treatment preferences, allergies, special requests...)"
                                                        rows={2}
                                                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                                                addNote(customer.email);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => addNote(customer.email)}
                                                        disabled={submitting || !newNote.trim()}
                                                        className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all self-end flex-shrink-0"
                                                    >
                                                        {submitting ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                        ) : (
                                                            "Add Note"
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1">Press ⌘+Enter to save quickly</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
