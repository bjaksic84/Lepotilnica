"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import {
    ADMIN_CLOSE,
    ADMIN_OPEN,
    fitsAdminWindow,
    generateAdminSlots,
    getScheduleForDateStr,
} from "@/lib/schedule";

export type MovableBooking = {
    id: number;
    customerName: string;
    customerEmail: string;
    serviceName: string;
    serviceDuration: number;
    date: string;
    time: string;
};

function dayLabel(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    return isNaN(d.getTime()) ? dateStr : format(d, "EEEE, d. MMMM yyyy", { locale: sl });
}

/**
 * Confirms a move before it is written. The drag only proposes — the admin
 * still sees exactly which day and time she landed on, can correct it here
 * (which is also how a move is made on a phone, where there is no drag), and
 * decides whether the customer hears about it.
 */
export default function MoveBookingModal({
    booking,
    targetDate,
    targetTime,
    onClose,
    onMoved,
}: {
    booking: MovableBooking;
    targetDate: string;
    targetTime: string;
    onClose: () => void;
    onMoved: (notified: boolean) => void;
}) {
    const [date, setDate] = useState(targetDate);
    const [time, setTime] = useState(targetTime);
    // Customers Karin entered by hand may have no e-mail to notify.
    const canNotify = !!booking.customerEmail?.trim();
    const [notify, setNotify] = useState(canNotify);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Manual entry runs on the 15-minute grid across the whole admin window,
    // so a treatment can start at e.g. 07:45 when that is what was agreed.
    const slots = useMemo(() => generateAdminSlots(15), []);
    const timeOptions = useMemo(
        () => (time && !slots.includes(time) ? [time, ...slots] : slots),
        [time, slots]
    );

    const unchanged = date === booking.date && time === booking.time;
    const fits = fitsAdminWindow(time, booking.serviceDuration);
    // Not a blocker — the admin may book a closed day deliberately — but worth saying.
    const closedDay = !getScheduleForDateStr(date);

    const submit = async () => {
        setError(null);
        if (unchanged) return setError("Termin je enak obstoječemu.");
        if (!fits) return setError(`Storitev (${booking.serviceDuration} min) mora biti končana do ${ADMIN_CLOSE}.`);

        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/bookings/${booking.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, time, notifyCustomer: notify && canNotify }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                onMoved(!!data.notified);
            } else {
                setError(typeof data.error === "string" ? data.error : "Prestavitev ni uspela.");
            }
        } catch {
            setError("Napaka omrežja. Poskusite znova.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass =
        "w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all text-gray-900 text-sm";

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div>
                        <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Prestavitev</p>
                        <h3 className="text-white text-lg font-bold mt-0.5">Potrdite nov termin</h3>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1" aria-label="Zapri">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Who / what */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="font-bold text-gray-900">{booking.customerName}</div>
                        <div className="text-sm text-gray-500">
                            {booking.serviceName} · {booking.serviceDuration} min
                        </div>
                    </div>

                    {/* From → to */}
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                        <div className="px-4 py-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Iz</div>
                            <div className="text-sm text-gray-400 line-through mt-0.5 capitalize">
                                {dayLabel(booking.date)} ob {booking.time}
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-yellow-50/60">
                            <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest">V</div>
                            <div className="text-sm font-bold text-gray-900 mt-0.5 capitalize">
                                {dayLabel(date)} ob {time}
                            </div>
                        </div>
                    </div>

                    {/* Editable target */}
                    {/* min-w-0 so the native date control can shrink instead of
                        forcing the grid wider than a narrow phone. */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Datum</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1.5 ${inputClass}`} />
                        </div>
                        <div className="min-w-0">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ura</label>
                            <select value={time} onChange={(e) => setTime(e.target.value)} className={`mt-1.5 ${inputClass}`}>
                                {timeOptions.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <p className="text-[11px] text-gray-400">
                        Ročni vnos je mogoč med {ADMIN_OPEN} in {ADMIN_CLOSE}; prekrivanje z drugimi termini je dovoljeno.
                    </p>

                    {closedDay && (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs">
                            Na ta dan je spletno naročanje zaprto (nedelja ali praznik). Ročni vnos je kljub temu mogoč.
                        </div>
                    )}

                    {canNotify ? (
                        <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-4 h-4 rounded accent-yellow-500" />
                            Obvesti stranko po e-pošti
                        </label>
                    ) : (
                        <p className="text-xs text-gray-400">Stranka nima e-pošte, zato obvestila ni mogoče poslati.</p>
                    )}
                    {notify && canNotify && (
                        <p className="-mt-2 text-[11px] text-gray-400 pl-7">
                            Na {booking.customerEmail} pošljemo obvestilo o spremembi termina.
                        </p>
                    )}

                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}
                </div>

                <div className="border-t border-gray-100 p-4 flex gap-2 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Prekliči</button>
                    <button
                        onClick={submit}
                        disabled={submitting || unchanged || !fits}
                        className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Prestavljam ...</>
                        ) : (
                            "Potrdi prestavitev"
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
