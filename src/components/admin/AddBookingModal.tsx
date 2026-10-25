"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ADMIN_CLOSE, ADMIN_OPEN, generateAdminSlots, getScheduleForDateStr } from "@/lib/schedule";
import { customerKey, normalizePhone, parseCustomerKey } from "@/lib/customer-identity";
import type { CustomerSummary } from "@/lib/customer-insight";

type Service = { id: number; name: string; duration: number; price: number };
type Category = { id: number; name: string; services: Service[] };

const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Case- and accent-insensitive, so "spela" finds "Špela". */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const digitsOf = (s: string) => s.replace(/\D/g, "");

/** Slovenian count: singular, dual, plural for 3–4, plural genitive for 5+. */
const countLabel = (n: number, [one, two, few, many]: [string, string, string, string]) => {
    const m = n % 100;
    if (m === 1) return `${n} ${one}`;
    if (m === 2) return `${n} ${two}`;
    if (m === 3 || m === 4) return `${n} ${few}`;
    return `${n} ${many}`;
};
const visitsLabel = (n: number) => countLabel(n, ["obisk", "obiska", "obiski", "obiskov"]);
const noShowsLabel = (n: number) => countLabel(n, ["neprihod", "neprihoda", "neprihodi", "neprihodov"]);

export default function AddBookingModal({
    initialDate,
    initialTime,
    initialCustomer,
    onClose,
    onCreated,
}: {
    initialDate?: string;
    initialTime?: string;
    /** Pre-filled when booking from a customer's record in Logs. */
    initialCustomer?: { name: string; email: string; phone: string };
    onClose: () => void;
    onCreated: () => void;
}) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    const [name, setName] = useState(initialCustomer?.name ?? "");
    const [email, setEmail] = useState(initialCustomer?.email ?? "");
    const [phone, setPhone] = useState(initialCustomer?.phone ?? "");
    const [date, setDate] = useState(initialDate ?? todayStr());
    const [time, setTime] = useState(initialTime ?? "");
    const [notes, setNotes] = useState("");
    const [sendConfirmation, setSendConfirmation] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Known customers, so a booking for a returning client can be filled in
    // exactly and lands on their existing record rather than starting a new one.
    const [customers, setCustomers] = useState<CustomerSummary[]>([]);
    const [activeField, setActiveField] = useState<"name" | "phone" | "email" | null>(null);

    useEffect(() => {
        fetch("/api/services")
            .then((r) => r.json())
            .then((data: Category[]) => setCategories(data))
            .catch(() => {})
            .finally(() => setLoadingServices(false));
        fetch("/api/admin/customers")
            .then((r) => (r.ok ? r.json() : []))
            .then((data: CustomerSummary[]) => setCustomers(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    // Esc to close + lock background scroll while open.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    const visibleCategories = useMemo(
        () => categories.filter((c) => c.services.length > 0),
        [categories]
    );
    const allServices = useMemo(() => visibleCategories.flatMap((c) => c.services), [visibleCategories]);
    const selected = useMemo(
        () => selectedIds.map((id) => allServices.find((s) => s.id === id)).filter(Boolean) as Service[],
        [selectedIds, allServices]
    );
    const totalDuration = selected.reduce((s, x) => s + x.duration, 0);
    const totalPrice = selected.reduce((s, x) => s + x.price, 0);

    // Manual entry spans the whole admin window on a 15-minute grid, on any day
    // of the year — the public opening hours only constrain online bookings.
    const slots = useMemo(() => generateAdminSlots(15), []);
    // Keep the prefilled time selectable even if it's outside the generated slots.
    const timeOptions = useMemo(
        () => (time && !slots.includes(time) ? [time, ...slots] : slots),
        [time, slots]
    );
    // Informational only: the admin is allowed to book a closed day.
    const closedDay = useMemo(() => !!date && !getScheduleForDateStr(date), [date]);

    const toggle = (id: number) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    // A customer is the e-mail + phone pair (see customer-identity.ts), so
    // once both are typed we can say which record this booking will land on.
    const enteredKey = useMemo(() => {
        const complete = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && digitsOf(phone).length >= 8;
        return complete ? customerKey(email, phone) : null;
    }, [email, phone]);

    const match = useMemo(() => {
        if (!enteredKey) return null;
        const existing = customers.find((c) => c.key === enteredKey);
        if (existing) return { kind: "existing" as const, customer: existing };
        const entered = parseCustomerKey(enteredKey)!;
        const sameEmail = customers.find((c) => parseCustomerKey(c.key)?.email === entered.email);
        const samePhone = customers.find((c) => parseCustomerKey(c.key)?.phone === entered.phone);
        return { kind: "new" as const, sameEmail, samePhone };
    }, [enteredKey, customers]);

    const suggestions = useMemo(() => {
        if (!activeField) return [];
        const query = activeField === "name" ? name : activeField === "phone" ? phone : email;
        const q = fold(query);
        if (q.length < 2) return [];
        // "040 12" should find "+386 40 123 456": compare without the trunk 0.
        const qDigits = digitsOf(query).replace(/^0+/, "");
        return customers
            .filter((c) => c.key !== enteredKey)
            .filter((c) => {
                if (activeField === "email") return c.email.toLowerCase().includes(q);
                if (activeField === "phone") {
                    return qDigits.length >= 3 && !!c.phone && digitsOf(normalizePhone(c.phone)).includes(qDigits);
                }
                return [c.name, ...c.otherNames].some((n) => fold(n).includes(q));
            })
            .slice(0, 5);
    }, [activeField, name, phone, email, customers, enteredKey]);

    const pickCustomer = (c: CustomerSummary) => {
        setName(c.name);
        setEmail(c.email);
        setPhone(c.phone ?? "");
        setActiveField(null);
    };

    const submit = async () => {
        setError(null);
        if (selectedIds.length === 0) return setError("Izberite vsaj eno storitev.");
        if (!name.trim() || !email.trim() || !phone.trim()) return setError("Izpolnite ime, telefon in e-pošto.");
        if (!date) return setError("Izberite datum.");
        if (!time) return setError("Izberite uro.");

        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceIds: selectedIds,
                    customerName: name.trim(),
                    customerEmail: email.trim(),
                    customerPhone: phone.trim(),
                    date,
                    time,
                    notes: notes.trim() || undefined,
                    sendConfirmation,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                onCreated();
            } else {
                setError(typeof data.error === "string" ? data.error : "Napaka pri ustvarjanju rezervacije.");
            }
        } catch {
            setError("Napaka omrežja. Poskusite znova.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass =
        "w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all text-gray-900 placeholder:text-gray-400 text-sm";

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div>
                        <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Ročni vnos</p>
                        <h3 className="text-white text-lg font-bold mt-0.5">Nova rezervacija</h3>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1" aria-label="Zapri">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Services */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Storitve</label>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {selected.map((s) => (
                                <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-50 text-pink-800 text-xs font-semibold border border-pink-200">
                                    {s.name} · €{s.price}
                                    <button onClick={() => toggle(s.id)} className="text-pink-400 hover:text-pink-700" aria-label={`Odstrani ${s.name}`}>✕</button>
                                </span>
                            ))}
                            <button
                                onClick={() => setPickerOpen((v) => !v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                                {pickerOpen ? "Zapri seznam" : "+ Dodaj storitev"}
                            </button>
                        </div>

                        {pickerOpen && (
                            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                                {loadingServices ? (
                                    <div className="p-4 text-center text-sm text-gray-400">Nalaganje storitev ...</div>
                                ) : visibleCategories.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-400">Ni storitev.</div>
                                ) : (
                                    visibleCategories.map((cat) => (
                                        <div key={cat.id}>
                                            <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0">{cat.name}</div>
                                            {cat.services.map((s) => {
                                                const on = selectedIds.includes(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => toggle(s.id)}
                                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${on ? "bg-yellow-50" : "hover:bg-gray-50"}`}
                                                    >
                                                        <span className="flex items-center gap-2 min-w-0">
                                                            <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${on ? "bg-yellow-500 border-yellow-500" : "border-gray-300"}`}>
                                                                {on && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                )}
                                                            </span>
                                                            <span className="truncate text-gray-800">{s.name}</span>
                                                        </span>
                                                        <span className="flex-shrink-0 text-gray-400 text-xs">{s.duration}m · €{s.price}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {selected.length > 0 && (
                            <p className="mt-2 text-xs text-gray-500">
                                {selected.length} {selected.length === 1 ? "storitev" : "storitev"} · skupaj <span className="font-bold text-gray-700">{totalDuration} min</span> · <span className="font-bold text-gray-700">€{totalPrice}</span>
                            </p>
                        )}
                    </div>

                    {/* Customer */}
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ime in priimek</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setActiveField("name")} onBlur={() => setActiveField(null)} className={`mt-1.5 ${inputClass}`} placeholder="Ime priimek" autoComplete="off" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Telefon</label>
                                <input value={phone} onChange={(e) => setPhone(e.target.value)} onFocus={() => setActiveField("phone")} onBlur={() => setActiveField(null)} className={`mt-1.5 ${inputClass}`} placeholder="+386 40 123 456" inputMode="tel" autoComplete="off" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">E-pošta</label>
                                <input value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setActiveField("email")} onBlur={() => setActiveField(null)} className={`mt-1.5 ${inputClass}`} placeholder="ime@email.com" inputMode="email" autoComplete="off" />
                            </div>
                        </div>

                        {suggestions.length > 0 && (
                            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                                <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Obstoječe stranke</div>
                                {suggestions.map((c) => (
                                    <button
                                        key={c.key}
                                        type="button"
                                        // Keep focus in the input so its blur doesn't hide the list mid-click.
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => pickCustomer(c)}
                                        className="w-full text-left px-3 py-2 hover:bg-yellow-50 transition-colors"
                                    >
                                        <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                                        <div className="text-xs text-gray-400 truncate">
                                            {c.phone ?? "brez telefona"} · {c.email} · {visitsLabel(c.visits)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {match?.kind === "existing" && match.customer.blacklist.blacklisted && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                                <span className="font-bold">Stranka je na črni listi</span>
                                {match.customer.blacklist.reason
                                    ? ` (${match.customer.blacklist.reason})`
                                    : !match.customer.blacklist.manual && ` (${noShowsLabel(match.customer.blacklist.activeNoShows)})`}
                                . Spletno naročanje s temi podatki je onemogočeno; ročni vnos je kljub temu mogoč.
                            </div>
                        )}
                        {match?.kind === "existing" && (
                            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs">
                                <span className="font-bold">Obstoječa stranka:</span> {match.customer.name} · {visitsLabel(match.customer.visits)}
                                {match.customer.upcoming > 0 && ` · ${match.customer.upcoming} prihodnjih`}. Rezervacija bo dodana k tej stranki.
                                {name.trim() && fold(name) !== fold(match.customer.name) && (
                                    <> Prikazano ime se bo posodobilo v »{name.trim()}«.</>
                                )}
                            </div>
                        )}
                        {match?.kind === "new" && (match.sameEmail || match.samePhone) && (
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1.5">
                                <p>
                                    <span className="font-bold">Nova stranka.</span>{" "}
                                    {match.sameEmail
                                        ? <>Ta e-pošta že pripada stranki {match.sameEmail.name} z drugo številko ({match.sameEmail.phone ?? "brez telefona"}).</>
                                        : <>Ta številka že pripada stranki {match.samePhone!.name} z drugim e-naslovom ({match.samePhone!.email}).</>}{" "}
                                    {(match.sameEmail ?? match.samePhone)!.blacklist.blacklisted && (
                                        <><span className="font-bold text-red-700">Ta stranka je na črni listi.</span>{" "}</>
                                    )}
                                    Če gre za isto osebo s tipkarsko napako, uporabite obstoječe podatke.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => pickCustomer((match.sameEmail ?? match.samePhone)!)}
                                    className="font-bold text-amber-900 underline"
                                >
                                    Uporabi podatke stranke {(match.sameEmail ?? match.samePhone)!.name}
                                </button>
                            </div>
                        )}
                        {match?.kind === "new" && !match.sameEmail && !match.samePhone && (
                            <div className="p-3 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-xs">
                                <span className="font-bold">Nova stranka</span> — ob shranjevanju se ustvari nov zapis stranke.
                            </div>
                        )}
                    </div>

                    {/* Date + time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Datum</label>
                            <input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className={`mt-1.5 ${inputClass}`} />
                        </div>
                        <div className="min-w-0">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ura</label>
                            <select value={time} onChange={(e) => setTime(e.target.value)} className={`mt-1.5 ${inputClass}`}>
                                <option value="">—</option>
                                {timeOptions.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <p className="-mt-1 text-[11px] text-gray-400">
                        Ročni vnos je mogoč med {ADMIN_OPEN} in {ADMIN_CLOSE}; prekrivanje z drugimi termini je dovoljeno.
                    </p>

                    {closedDay && (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs">
                            Na ta dan je spletno naročanje zaprto (nedelja ali praznik). Ročni vnos je kljub temu mogoč.
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Opombe <span className="normal-case text-gray-300">(neobvezno)</span></label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} className={`mt-1.5 ${inputClass} resize-none`} placeholder="Posebne zahteve, alergije ..." />
                    </div>

                    <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" checked={sendConfirmation} onChange={(e) => setSendConfirmation(e.target.checked)} className="w-4 h-4 rounded accent-yellow-500" />
                        Pošlji potrditveni e-mail stranki
                    </label>

                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4 flex gap-2 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Prekliči</button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ustvarjam ...</>
                        ) : (
                            <>Ustvari rezervacijo{totalPrice > 0 ? ` · €${totalPrice}` : ""}</>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
