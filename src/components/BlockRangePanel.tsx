"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
    onBlock: (startDate: string, startTime: string, endDate: string, endTime: string, reason: string) => Promise<void>;
    blocking: boolean;
};

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BlockRangePanel({ onBlock, blocking }: Props) {
    const [open, setOpen] = useState(false);
    const [startDate, setStartDate] = useState(todayStr());
    const [startTime, setStartTime] = useState("09:00");
    const [endDate, setEndDate] = useState(todayStr());
    const [endTime, setEndTime] = useState("20:00");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const submit = async () => {
        setError("");
        // Validate: end must be strictly after start
        const startStamp = `${startDate}T${startTime}`;
        const endStamp = `${endDate}T${endTime}`;
        if (endStamp <= startStamp) {
            setError("Konec mora biti za začetkom.");
            return;
        }
        await onBlock(startDate, startTime, endDate, endTime, reason.trim());
        setOpen(false);
        setReason("");
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
                <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Blokiraj odsotnost (dopust / daljša odsotnost)
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-4 mt-3">
                                Blokira vse termine med izbranima točkama. Stranke teh terminov ne morejo rezervirati.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Start */}
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Začetek</span>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={startDate}
                                            min={todayStr()}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                                        />
                                        <input
                                            type="time"
                                            value={startTime}
                                            step={1800}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-[110px] px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                                        />
                                    </div>
                                </div>
                                {/* End */}
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Konec</span>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                                        />
                                        <input
                                            type="time"
                                            value={endTime}
                                            step={1800}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-[110px] px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Razlog (neobvezno) — npr. Dopust"
                                className="w-full mt-4 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                            />

                            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

                            <div className="flex items-center gap-2 mt-4">
                                <button
                                    onClick={submit}
                                    disabled={blocking}
                                    className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {blocking ? (
                                        <>
                                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                            Blokiram...
                                        </>
                                    ) : "Blokiraj obdobje"}
                                </button>
                                <button
                                    onClick={() => { setOpen(false); setError(""); }}
                                    className="px-4 py-2.5 text-gray-500 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Prekliči
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
