"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { use } from "react";

interface CancelResult {
    success?: boolean;
    message?: string;
    error?: string;
    booking?: {
        date: string;
        time: string;
        customerName: string;
    };
}

export default function CancelPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [result, setResult] = useState<CancelResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function cancelBooking() {
            try {
                const res = await fetch(`/api/cancel/${token}`);
                const data = await res.json();
                setResult(data);
            } catch {
                setResult({ error: "Something went wrong. Please try again." });
            } finally {
                setLoading(false);
            }
        }

        cancelBooking();
    }, [token]);

    return (
        <main className="min-h-screen bg-gradient-to-b from-white to-pink-50/30 flex items-center justify-center px-4 py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-900 px-8 py-6 text-center">
                        <h1 className="font-playfair text-2xl text-white tracking-wide">
                            LEPOTILNICA
                        </h1>
                        <p className="text-yellow-500 text-xs tracking-[0.25em] uppercase mt-1">
                            by Karin
                        </p>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-10 text-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                                <p className="text-gray-500 text-sm">
                                    Processing your cancellation...
                                </p>
                            </div>
                        ) : result?.success ? (
                            <>
                                <div className="w-16 h-16 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <h2 className="font-playfair text-xl text-gray-900 mb-2">
                                    Appointment Cancelled
                                </h2>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                    {result.message}
                                </p>
                                {result.booking && (
                                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6">
                                        <p><span className="font-medium text-gray-800">{result.booking.customerName}</span></p>
                                        <p className="mt-1">{result.booking.date} at {result.booking.time}</p>
                                    </div>
                                )}
                                <a
                                    href="/"
                                    className="inline-block px-8 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all"
                                >
                                    Back to Home
                                </a>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <h2 className="font-playfair text-xl text-gray-900 mb-2">
                                    Unable to Cancel
                                </h2>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                                    {result?.error || "Something went wrong."}
                                </p>
                                <a
                                    href="/"
                                    className="inline-block px-8 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all"
                                >
                                    Back to Home
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
