"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getScheduleForDateStr, timeToMinutes, minutesToTime } from "@/lib/schedule";

/**
 * Pick a from–to interval on a given day to block. Options are constrained to
 * the day's working hours; the shared timetable/overlap logic lives server-side.
 */
export default function BlockTimeModal({
    date,
    startTime,
    onBlock,
    onClose,
}: {
    date: string;
    startTime: string;
    onBlock: (date: string, start: string, end: string, reason: string) => Promise<void>;
    onClose: () => void;
}) {
    const schedule = useMemo(() => getScheduleForDateStr(date), [date]);

    // 30-min grid across the working day.
    const { startOptions, endOptions } = useMemo(() => {
        if (!schedule) return { startOptions: [] as string[], endOptions: [] as string[] };
        const open = timeToMinutes(schedule.open);
        const close = timeToMinutes(schedule.close);
        const starts: string[] = [];
        const ends: string[] = [];
        for (let m = open; m < close; m += 30) starts.push(minutesToTime(m));
        for (let m = open + 30; m <= close; m += 30) ends.push(minutesToTime(m));
        return { startOptions: starts, endOptions: ends };
    }, [schedule]);

    const [start, setStart] = useState(() => (startOptions.includes(startTime) ? startTime : startOptions[0] ?? ""));
    const [end, setEnd] = useState(() => {
        const startMin = timeToMinutes(startOptions.includes(startTime) ? startTime : startOptions[0] ?? "09:00");
        const next = minutesToTime(startMin + 30);
        return endOptions.includes(next) ? next : endOptions[endOptions.length - 1] ?? "";
    });
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Only end times strictly after the chosen start are valid.
    const validEnds = endOptions.filter((e) => timeToMinutes(e) > timeToMinutes(start));

    const submit = async () => {
        setError(null);
        if (!start || !end) return setError("Izberite začetek in konec.");
        if (timeToMinutes(end) <= timeToMinutes(start)) return setError("Konec mora biti po začetku.");
        setSubmitting(true);
        try {
            await onBlock(date, start, end, reason.trim());
            onClose();
        } catch {
            setError("Blokiranje ni uspelo. Poskusite znova.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass =
        "w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all text-gray-900 text-sm";

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white w-full max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
            >
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-white text-lg font-bold">Blokiraj termin</h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white p-1" aria-label="Zapri">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {!schedule ? (
                        <p className="text-sm text-gray-500 text-center py-4">Na ta dan je salon zaprt.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Od</label>
                                    <select
                                        value={start}
                                        onChange={(e) => {
                                            setStart(e.target.value);
                                            // keep end after start
                                            if (timeToMinutes(end) <= timeToMinutes(e.target.value)) {
                                                const next = minutesToTime(timeToMinutes(e.target.value) + 30);
                                                setEnd(endOptions.includes(next) ? next : endOptions[endOptions.length - 1] ?? "");
                                            }
                                        }}
                                        className={`mt-1.5 ${inputClass}`}
                                    >
                                        {startOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Do</label>
                                    <select value={end} onChange={(e) => setEnd(e.target.value)} className={`mt-1.5 ${inputClass}`}>
                                        {validEnds.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Razlog <span className="normal-case text-gray-300">(neobvezno)</span></label>
                                <input value={reason} onChange={(e) => setReason(e.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="npr. Odsotnost, malica ..." />
                            </div>
                            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}
                        </>
                    )}
                </div>

                {schedule && (
                    <div className="border-t border-gray-100 p-4 flex gap-2">
                        <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Prekliči</button>
                        <button
                            onClick={submit}
                            disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Blokiram ...</> : "Blokiraj"}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
