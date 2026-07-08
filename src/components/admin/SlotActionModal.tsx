"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";

/**
 * Small action sheet shown when the admin taps empty space in the timetable.
 * Offers the two things that empty time can become: a manual booking or a block.
 */
export default function SlotActionModal({
    date,
    time,
    onPickReservation,
    onPickBlock,
    onClose,
}: {
    date: string;
    time: string;
    onPickReservation: () => void;
    onPickBlock: () => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const dateLabel = (() => {
        const d = new Date(`${date}T00:00:00`);
        return isNaN(d.getTime()) ? date : format(d, "EEE, d. MMM", { locale: sl });
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white w-full max-w-xs sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
            >
                <div className="px-5 pt-5 pb-3 text-center">
                    <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">{dateLabel}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{time}</p>
                </div>
                <div className="p-3 pt-0 space-y-2">
                    <button
                        onClick={onPickReservation}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Dodaj rezervacijo
                    </button>
                    <button
                        onClick={onPickBlock}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        Blokiraj termin
                    </button>
                    <button onClick={onClose} className="w-full px-4 py-2.5 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors">
                        Prekliči
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
