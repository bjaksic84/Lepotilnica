"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ToastContainer, { useToast } from "@/components/Toast";
import AddBookingModal from "@/components/admin/AddBookingModal";
import CustomerFormModal, { type CustomerFormValues } from "@/components/admin/CustomerFormModal";
import { ANONYMISED_NAME } from "@/lib/customer-identity";
import type { CustomerHistory, CustomerSummary, HistoryEntry } from "@/lib/customer-insight";

// Stored dates are the salon's wall clock; parseISO keeps them local rather
// than shifting them through UTC the way `new Date("YYYY-MM-DD")` does.
const fmtDate = (date: string, pattern = "MMM d, yyyy") => format(parseISO(date), pattern);

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** The first field error the API sent back, else its error, else `fallback`. */
const errorMessage = (data: { error?: unknown; details?: Record<string, string[] | undefined> }, fallback: string) => {
    const firstFieldError = data.details && Object.values(data.details).flat().find(Boolean);
    return firstFieldError || (typeof data.error === "string" ? data.error : fallback);
};

export default function AdminLogsPage() {
    const [customers, setCustomers] = useState<CustomerSummary[]>([]);
    const [histories, setHistories] = useState<Record<string, CustomerHistory>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [newNote, setNewNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [reasonDraft, setReasonDraft] = useState<{ bookingId: number; text: string } | null>(null);
    const [savingReason, setSavingReason] = useState(false);
    const [blacklistDraft, setBlacklistDraft] = useState<{ key: string; reason: string } | null>(null);
    const [blacklistBusy, setBlacklistBusy] = useState(false);
    const [customerForm, setCustomerForm] = useState<{ mode: "create" } | { mode: "edit"; customer: CustomerSummary } | null>(null);
    const [bookingFor, setBookingFor] = useState<CustomerSummary | null>(null);
    const [noteDraft, setNoteDraft] = useState<{ id: number; text: string } | null>(null);
    const [savingNote, setSavingNote] = useState(false);

    // The polling interval outlives renders, so it reads the open customer here.
    const expandedRef = useRef<string | null>(null);
    useEffect(() => {
        expandedRef.current = expandedKey;
    }, [expandedKey]);

    const router = useRouter();
    const { toasts, addToast, removeToast } = useToast();

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

    const fetchHistory = async (key: string) => {
        try {
            const res = await fetch(`/api/admin/customers/history?key=${encodeURIComponent(key)}`);
            if (res.ok) {
                const data: CustomerHistory = await res.json();
                setHistories((prev) => ({ ...prev, [key]: data }));
            }
        } catch (error) {
            console.error("Failed to fetch customer history", error);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // Auto-refresh: silently poll for new customer activity while the tab is visible.
    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
            fetchCustomers();
            if (expandedRef.current) fetchHistory(expandedRef.current);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const openCustomer = (key: string | null) => {
        setExpandedKey(key);
        setNewNote("");
        setReasonDraft(null);
        setBlacklistDraft(null);
        setNoteDraft(null);
        if (key) fetchHistory(key);
    };

    // Jump from a "possibly the same person" hint to that customer's record.
    const openRelated = (key: string) => {
        setSearch("");
        openCustomer(key);
        requestAnimationFrame(() =>
            document.getElementById(`customer-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
    };

    const addNote = async (customer: CustomerSummary) => {
        if (!newNote.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/customers/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerEmail: customer.email, customerPhone: customer.phone, note: newNote }),
            });
            if (res.ok) {
                addToast({ type: "success", title: "Note Added", message: "Your note has been saved." });
                setNewNote("");
                fetchCustomers();
                fetchHistory(customer.key);
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
                if (expandedKey) fetchHistory(expandedKey);
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to delete note." });
        }
    };

    const saveReason = async () => {
        if (!reasonDraft || !expandedKey) return;
        setSavingReason(true);
        try {
            const res = await fetch(`/api/admin/bookings/${reasonDraft.bookingId}/absence`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reasonDraft.text }),
            });
            if (res.ok) {
                addToast({
                    type: "success",
                    title: reasonDraft.text.trim() ? "Reason Saved" : "Reason Removed",
                    message: reasonDraft.text.trim() ? "The reason for absence has been saved." : "The reason for absence has been cleared.",
                });
                setReasonDraft(null);
                fetchHistory(expandedKey);
            } else {
                const data = await res.json().catch(() => ({}));
                addToast({ type: "error", title: "Error", message: typeof data.error === "string" ? data.error : "Failed to save the reason." });
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to save the reason." });
        } finally {
            setSavingReason(false);
        }
    };

    const blacklistCustomer = async () => {
        if (!blacklistDraft) return;
        setBlacklistBusy(true);
        try {
            const res = await fetch("/api/admin/customers/blacklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: blacklistDraft.key, reason: blacklistDraft.reason }),
            });
            if (res.ok) {
                addToast({ type: "warning", title: "Customer Blacklisted", message: "They can no longer book online with this e-mail and phone." });
                setBlacklistDraft(null);
                fetchCustomers();
            } else {
                addToast({ type: "error", title: "Error", message: "Failed to blacklist the customer." });
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to blacklist the customer." });
        } finally {
            setBlacklistBusy(false);
        }
    };

    const liftBlacklist = async (customer: CustomerSummary) => {
        if (!confirm(`Lift the blacklist for ${customer.name}? They will be able to book online again, and their no-shows so far are forgiven.`)) return;
        setBlacklistBusy(true);
        try {
            const res = await fetch(`/api/admin/customers/blacklist?key=${encodeURIComponent(customer.key)}`, { method: "DELETE" });
            if (res.ok) {
                addToast({ type: "success", title: "Blacklist Lifted", message: `${customer.name} can book online again.` });
                fetchCustomers();
            } else {
                addToast({ type: "error", title: "Error", message: "Failed to lift the blacklist." });
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to lift the blacklist." });
        } finally {
            setBlacklistBusy(false);
        }
    };

    const saveNewCustomer = async (values: CustomerFormValues): Promise<string | null> => {
        try {
            const res = await fetch("/api/admin/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 201 || (res.status === 409 && data.key)) {
                setCustomerForm(null);
                addToast(
                    res.status === 201
                        ? { type: "success", title: "Customer Added", message: `${values.customerName} is now in your logs.` }
                        : { type: "info", title: "Already a Customer", message: data.error }
                );
                await fetchCustomers();
                openRelated(data.key);
                return null;
            }
            return errorMessage(data, "Failed to add the customer.");
        } catch {
            return "Network error. Please try again.";
        }
    };

    const saveEditedCustomer = async (customer: CustomerSummary, values: CustomerFormValues, merge = false): Promise<string | null> => {
        try {
            const res = await fetch("/api/admin/customers", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: customer.key, ...values, merge }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setCustomerForm(null);
                addToast(
                    data.merged
                        ? { type: "success", title: "Customers Merged", message: `${customer.name} and ${values.customerName} are now one customer.` }
                        : { type: "success", title: "Customer Updated", message: "Saved on all of their bookings." }
                );
                setHistories({});
                await fetchCustomers();
                openRelated(data.key);
                return null;
            }
            if (res.status === 409 && data.conflict) {
                const other = data.conflict;
                const confirmed = confirm(
                    `${other.name} already has this e-mail and phone (${other.visits} visits, ${other.upcoming} upcoming).\n\n` +
                        `Merge them into one customer? Every booking, note and no-show of both is kept together under the new details. This cannot be undone.`
                );
                return confirmed ? saveEditedCustomer(customer, values, true) : "Not saved: those details belong to another customer.";
            }
            return errorMessage(data, "Failed to save the changes.");
        } catch {
            return "Network error. Please try again.";
        }
    };

    const deleteCustomer = async (customer: CustomerSummary) => {
        const kept = customer.visits + customer.cancelled;
        const message =
            `Delete ${customer.name}?\n\n` +
            `Their name, e-mail, phone and notes are removed for good.` +
            (kept > 0 ? ` Their ${kept} past booking${kept === 1 ? "" : "s"} stay as "${ANONYMISED_NAME}", so revenue in Analytics doesn't change.` : "") +
            (customer.blacklist.blacklisted ? `\n\nThey stay blacklisted, so their e-mail and phone are kept for that alone.` : "") +
            `\n\nThis cannot be undone.`;
        if (!confirm(message)) return;
        try {
            const res = await fetch(`/api/admin/customers?key=${encodeURIComponent(customer.key)}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                addToast({
                    type: "info",
                    title: "Customer Deleted",
                    message: data.anonymisedBookings > 0
                        ? `${data.anonymisedBookings} booking${data.anonymisedBookings === 1 ? "" : "s"} kept anonymously for Analytics.`
                        : `${customer.name} has been removed.`,
                });
                setExpandedKey(null);
                fetchCustomers();
            } else {
                addToast({ type: "error", title: "Not Deleted", message: errorMessage(data, "Failed to delete the customer.") });
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to delete the customer." });
        }
    };

    const saveNoteEdit = async () => {
        if (!noteDraft || !noteDraft.text.trim()) return;
        setSavingNote(true);
        try {
            const res = await fetch("/api/admin/customers/notes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: noteDraft.id, note: noteDraft.text }),
            });
            if (res.ok) {
                addToast({ type: "success", title: "Note Updated", message: "Your note has been saved." });
                setNoteDraft(null);
                if (expandedKey) fetchHistory(expandedKey);
            } else {
                addToast({ type: "error", title: "Error", message: "Failed to update the note." });
            }
        } catch {
            addToast({ type: "error", title: "Error", message: "Failed to update the note." });
        } finally {
            setSavingNote(false);
        }
    };

    const filteredCustomers = customers.filter((c) => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        const qDigits = digitsOf(q);
        return (
            c.email.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.otherNames.some((n) => n.toLowerCase().includes(q)) ||
            (!!c.phone && (c.phone.includes(q) || (qDigits.length >= 3 && digitsOf(c.phone).includes(qDigits))))
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
            </div>
        );
    }

    const renderCancelledExtras = (entry: HistoryEntry) => (
        <div className="mt-2.5 space-y-2">
            {entry.noShow ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-700 tracking-wide">No-Show</span>
            ) : (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-50 text-red-600 tracking-wide">Cancelled</span>
            )}

            {reasonDraft?.bookingId === entry.id ? (
                <div>
                    <textarea
                        value={reasonDraft.text}
                        onChange={(e) => setReasonDraft({ bookingId: entry.id, text: e.target.value })}
                        placeholder="Why were they absent? (e.g. ill, forgot, called in late...)"
                        rows={2}
                        maxLength={1000}
                        autoFocus
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveReason();
                        }}
                    />
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                        <p className="text-[10px] text-gray-400">Save it empty to remove the reason.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setReasonDraft(null)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveReason}
                                disabled={savingReason}
                                className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 disabled:opacity-40 transition-colors"
                            >
                                {savingReason ? "Saving..." : "Save Reason"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : entry.absenceReason ? (
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Reason for absence</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.absenceReason}</p>
                    </div>
                    <button
                        onClick={() => setReasonDraft({ bookingId: entry.id, text: entry.absenceReason ?? "" })}
                        className="text-xs font-bold text-yellow-700 hover:underline flex-shrink-0"
                    >
                        Edit
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setReasonDraft({ bookingId: entry.id, text: "" })}
                    className="block text-xs font-bold text-yellow-700 hover:underline"
                >
                    + Add reason for absence
                </button>
            )}
        </div>
    );

    const renderBooking = (entry: HistoryEntry, customer: CustomerSummary) => (
        <div key={entry.id} className="bg-white border border-gray-100 rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-sm">{entry.serviceName ?? "Unknown service"}</div>
                    <div className="text-xs text-gray-500">
                        {fmtDate(entry.date, "EEE, MMM d, yyyy")} · {entry.time}
                        {entry.endTime && `–${entry.endTime}`}
                        {entry.categoryName && <span className="text-gray-400"> · {entry.categoryName}</span>}
                    </div>
                    {entry.bookedAs.toLowerCase() !== customer.name.toLowerCase() && (
                        <div className="text-[11px] text-gray-400 mt-0.5">Booked as {entry.bookedAs}</div>
                    )}
                </div>
                <div className="text-right flex-shrink-0">
                    {entry.price !== null && <div className="text-sm font-bold text-gray-900">€{entry.price}</div>}
                    {entry.duration !== null && <div className="text-[10px] text-gray-400 uppercase tracking-wider">{entry.duration} min</div>}
                </div>
            </div>
            {entry.notes && (
                <p className="mt-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 whitespace-pre-wrap">{entry.notes}</p>
            )}
            {entry.status === "cancelled" && renderCancelledExtras(entry)}
        </div>
    );

    const renderSection = (title: string, entries: HistoryEntry[], empty: string, customer: CustomerSummary) => (
        <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {title}
                {entries.length > 0 && <span className="ml-2 text-yellow-600 normal-case">({entries.length})</span>}
            </h4>
            {entries.length > 0 ? (
                <div className="space-y-2">{entries.map((e) => renderBooking(e, customer))}</div>
            ) : (
                <p className="text-sm text-gray-400">{empty}</p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20">
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

            {customerForm?.mode === "create" && (
                <CustomerFormModal
                    eyebrow="Customer Logs"
                    title="Add customer"
                    withNote
                    submitLabel="Add Customer"
                    hint="Their first booking with this e-mail and phone will land on this customer."
                    onSubmit={saveNewCustomer}
                    onClose={() => setCustomerForm(null)}
                />
            )}
            {customerForm?.mode === "edit" && (
                <CustomerFormModal
                    eyebrow="Edit customer"
                    title={customerForm.customer.name}
                    initial={{
                        customerName: customerForm.customer.name,
                        customerPhone: customerForm.customer.phone ?? "",
                        customerEmail: customerForm.customer.email,
                    }}
                    submitLabel="Save Changes"
                    hint="New details are written to all of their bookings. If they belong to another customer, you'll be asked whether to merge the two."
                    onSubmit={(values) => saveEditedCustomer(customerForm.customer, values)}
                    onClose={() => setCustomerForm(null)}
                />
            )}
            {bookingFor && (
                <AddBookingModal
                    initialCustomer={{ name: bookingFor.name, email: bookingFor.email, phone: bookingFor.phone ?? "" }}
                    onClose={() => setBookingFor(null)}
                    onCreated={() => {
                        addToast({ type: "success", title: "Booking Created", message: `Booked for ${bookingFor.name}.` });
                        setBookingFor(null);
                        fetchCustomers();
                        if (expandedKey) fetchHistory(expandedKey);
                    }}
                />
            )}

            <div className="container mx-auto px-4 max-w-7xl">
                <div className="mb-8">
                    <Link href="/admin" className="text-yellow-600 text-sm font-bold hover:underline mb-4 inline-block">← Back to Dashboard</Link>
                    <h1 className="text-4xl font-playfair font-bold text-gray-900">Customer Logs</h1>
                    <p className="text-gray-500 mt-1">Every customer&apos;s visits, upcoming and cancelled bookings, and your notes. A customer is one e-mail + phone pair.</p>
                </div>

                {/* Search + add */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1 max-w-md">
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
                    <button
                        onClick={() => setCustomerForm({ mode: "create" })}
                        className="sm:ml-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Customer
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Customers</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-yellow-600">{customers.filter(c => c.adminNotesCount > 0).length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">With Admin Notes</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-blue-600">{customers.filter(c => c.upcoming > 0).length}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">With Upcoming</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="text-2xl font-bold text-red-600">{customers.filter(c => c.blacklist.blacklisted).length}</div>
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
                            const isExpanded = expandedKey === customer.key;
                            const isBlacklisted = customer.blacklist.blacklisted;
                            const history = histories[customer.key];
                            const totalBookings = customer.visits + customer.upcoming + customer.cancelled;
                            const cancelRate = totalBookings > 0 ? Math.round((customer.cancelled / totalBookings) * 100) : 0;

                            return (
                                <div key={customer.key} id={`customer-${customer.key}`} className={`bg-white rounded-2xl border overflow-hidden transition-all scroll-mt-24 ${
                                    isBlacklisted
                                        ? "border-red-200 ring-1 ring-red-100"
                                        : "border-gray-100"
                                }`}>
                                    {/* Customer Row */}
                                    <button
                                        onClick={() => openCustomer(isExpanded ? null : customer.key)}
                                        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            isBlacklisted
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-50 text-yellow-700"
                                        }`}>
                                            <span className="font-bold text-sm">{customer.name.charAt(0).toUpperCase()}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-gray-900">{customer.name}</span>
                                                {isBlacklisted && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 tracking-wide">Blacklisted</span>
                                                )}
                                                {!isBlacklisted && customer.blacklist.activeNoShows > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-700 tracking-wide">{customer.blacklist.activeNoShows} No-Show</span>
                                                )}
                                                {customer.related.length > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-100 text-gray-500 tracking-wide">Linked</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 truncate">
                                                {customer.email}{customer.phone && ` · ${customer.phone}`}
                                            </div>
                                        </div>

                                        {/* Meta Badges */}
                                        <div className="hidden md:flex items-center gap-5 flex-shrink-0">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-900">{customer.visits}</div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Visits</div>
                                            </div>
                                            {customer.upcoming > 0 && (
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-blue-600">{customer.upcoming}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Upcoming</div>
                                                </div>
                                            )}
                                            {customer.lastVisit && (
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-gray-600">{fmtDate(customer.lastVisit)}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Last Visit</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes count + chevron */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {customer.adminNotesCount + customer.bookingNotesCount > 0 && (
                                                <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                    {customer.adminNotesCount + customer.bookingNotesCount} note{customer.adminNotesCount + customer.bookingNotesCount !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-5 py-4 space-y-6 bg-gray-50/30">
                                            {/* Actions */}
                                            {customer.blacklistOnly ? (
                                                <p className="text-xs text-gray-500">
                                                    A deleted customer, kept only so the blacklist below keeps them from booking online. Lift it to remove them entirely.
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setBookingFor(customer)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                        New Booking
                                                    </button>
                                                    <button
                                                        onClick={() => setCustomerForm({ mode: "edit", customer })}
                                                        className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                                                    >
                                                        Edit Details
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCustomer(customer)}
                                                        className="px-3.5 py-2 bg-white border border-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                                                    >
                                                        Delete Customer
                                                    </button>
                                                </div>
                                            )}

                                            {/* Contact Info */}
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-4 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600 min-w-0">
                                                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="truncate">{customer.email}</span>
                                                    </div>
                                                    {customer.phone && (
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            </svg>
                                                            {customer.phone}
                                                        </div>
                                                    )}
                                                </div>
                                                {customer.otherNames.length > 0 && (
                                                    <p className="text-xs text-gray-500">
                                                        Also booked as <span className="font-medium text-gray-700">{customer.otherNames.join(", ")}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* Possibly the same person */}
                                            {customer.related.length > 0 && (
                                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Possibly the same person</p>
                                                    <div className="space-y-1">
                                                        {customer.related.map((r) => (
                                                            <button
                                                                key={r.key}
                                                                onClick={() => openRelated(r.key)}
                                                                className="block w-full text-left text-sm text-amber-900 hover:underline"
                                                            >
                                                                <span className="font-semibold">{r.name}</span>
                                                                {r.blacklisted && (
                                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 tracking-wide align-middle">Blacklisted</span>
                                                                )}
                                                                <span className="text-amber-700"> · same {r.sharedBy === "email" ? "e-mail" : "phone"}, different {r.sharedBy === "email" ? `phone (${r.phone ?? "none"})` : `e-mail (${r.email})`}</span>
                                                                <span className="text-amber-500"> →</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[11px] text-amber-600 mt-1.5">Kept as separate customers because the e-mail or phone differs.</p>
                                                </div>
                                            )}

                                            {/* Blacklist */}
                                            {isBlacklisted ? (
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-red-700">Blacklisted — can&apos;t book online with this e-mail + phone</p>
                                                        <p className="text-xs text-red-600 mt-0.5">
                                                            {customer.blacklist.manual
                                                                ? customer.blacklist.reason
                                                                    ? `Reason: ${customer.blacklist.reason}`
                                                                    : "Blacklisted by you."
                                                                : `After ${customer.blacklist.activeNoShows} no-shows.`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => liftBlacklist(customer)}
                                                        disabled={blacklistBusy}
                                                        className="px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 disabled:opacity-40 transition-colors flex-shrink-0"
                                                    >
                                                        Lift Blacklist
                                                    </button>
                                                </div>
                                            ) : blacklistDraft?.key === customer.key ? (
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                                                    <p className="text-xs text-red-700">They won&apos;t be able to book online with this e-mail + phone. Bookings you enter by hand still work.</p>
                                                    <input
                                                        value={blacklistDraft.reason}
                                                        onChange={(e) => setBlacklistDraft({ key: customer.key, reason: e.target.value })}
                                                        placeholder="Reason (optional)"
                                                        maxLength={500}
                                                        autoFocus
                                                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") blacklistCustomer();
                                                        }}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setBlacklistDraft(null)}
                                                            className="px-3 py-1.5 bg-white text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={blacklistCustomer}
                                                            disabled={blacklistBusy}
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
                                                        >
                                                            {blacklistBusy ? "Saving..." : "Blacklist"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="text-gray-400">
                                                        {customer.blacklist.activeNoShows > 0
                                                            ? `${customer.blacklist.activeNoShows} no-show${customer.blacklist.activeNoShows !== 1 ? "s" : ""} — blacklisted automatically at 2.`
                                                            : "Blacklisted automatically after 2 no-shows."}
                                                    </span>
                                                    <button
                                                        onClick={() => setBlacklistDraft({ key: customer.key, reason: "" })}
                                                        className="font-bold text-red-600 hover:underline flex-shrink-0"
                                                    >
                                                        Blacklist customer
                                                    </button>
                                                </div>
                                            )}

                                            {/* Insight */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                                <InsightTile label="Visits" value={String(customer.visits)} sub={customer.firstVisit ? `since ${fmtDate(customer.firstVisit)}` : undefined} />
                                                <InsightTile label="Spent" value={`€${customer.totalSpent}`} sub="at current prices" />
                                                <InsightTile label="Upcoming" value={String(customer.upcoming)} sub={customer.nextVisit ? `next ${fmtDate(customer.nextVisit, "MMM d")}` : undefined} />
                                                <InsightTile label="Cancelled" value={String(customer.cancelled)} sub={totalBookings > 0 ? `${cancelRate}% of bookings` : undefined} />
                                                <InsightTile label="Favourite" value={customer.favouriteService ?? "—"} small />
                                                <InsightTile
                                                    label="Comes Every"
                                                    value={customer.averageGapDays !== null ? `~${customer.averageGapDays} days` : "—"}
                                                    sub={customer.lastVisit ? `last ${fmtDate(customer.lastVisit, "MMM d")}` : undefined}
                                                />
                                            </div>

                                            {/* History */}
                                            {history ? (
                                                <>
                                                    {renderSection("Upcoming", history.upcoming, "No upcoming bookings.", customer)}
                                                    {renderSection("Past Visits", history.past, "No visits yet.", customer)}
                                                    {renderSection("Cancelled", history.cancelled, "No cancelled bookings.", customer)}
                                                </>
                                            ) : (
                                                <div className="flex justify-center py-6">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
                                                </div>
                                            )}

                                            {/* Admin Notes */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                                    Your Notes
                                                    {customer.adminNotesCount > 0 && (
                                                        <span className="ml-2 text-yellow-600 normal-case">({customer.adminNotesCount})</span>
                                                    )}
                                                </h4>
                                                {history && history.adminNotes.length > 0 ? (
                                                    <div className="space-y-2 mb-3">
                                                        {history.adminNotes.map((an) => (
                                                            <div key={an.id} className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                                                                {noteDraft?.id === an.id ? (
                                                                    <div className="space-y-2">
                                                                        <textarea
                                                                            value={noteDraft.text}
                                                                            onChange={(e) => setNoteDraft({ id: an.id, text: e.target.value })}
                                                                            rows={3}
                                                                            autoFocus
                                                                            className="w-full px-3 py-2 bg-white border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNoteEdit();
                                                                            }}
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                onClick={() => setNoteDraft(null)}
                                                                                className="px-3 py-1.5 bg-white text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={saveNoteEdit}
                                                                                disabled={savingNote || !noteDraft.text.trim()}
                                                                                className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 disabled:opacity-40 transition-colors"
                                                                            >
                                                                                {savingNote ? "Saving..." : "Save Note"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block mb-1">
                                                                                {format(new Date(an.createdAt), "MMM d, yyyy · HH:mm")}
                                                                            </span>
                                                                            <p className="text-sm text-yellow-800 whitespace-pre-wrap">{an.note}</p>
                                                                        </div>
                                                                        {/* Always visible: hover-only controls never appear on a phone. */}
                                                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                                                            <button
                                                                                onClick={() => setNoteDraft({ id: an.id, text: an.note })}
                                                                                className="p-1 text-yellow-500 hover:text-yellow-700 transition-colors"
                                                                                title="Edit note"
                                                                                aria-label="Edit note"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 9 17l.464-3.536z" />
                                                                                </svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => deleteNote(an.id)}
                                                                                className="p-1 text-yellow-400 hover:text-red-500 transition-colors"
                                                                                title="Delete note"
                                                                                aria-label="Delete note"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
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
                                                                addNote(customer);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => addNote(customer)}
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

function InsightTile({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-3 min-w-0">
            <div className={`font-bold text-gray-900 truncate ${small ? "text-sm leading-7" : "text-xl"}`} title={value}>{value}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</div>
            {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
        </div>
    );
}
