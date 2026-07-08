"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type BookingSummary = { date: string; time: string; customerName: string };
type LoadState = "cancellable" | "already_cancelled" | "too_late";

export default function CancelPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    const [loading, setLoading] = useState(true);
    const [state, setState] = useState<LoadState | null>(null);
    const [booking, setBooking] = useState<BookingSummary | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // Read-only load of the booking's details. Crucially this does NOT cancel —
    // the cancellation only happens when the customer clicks confirm below, so
    // email scanners / prefetch can't silently cancel a real appointment.
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch(`/api/cancel/${token}`);
                const data = await res.json();
                if (!active) return;
                if (res.ok && data.state) {
                    setState(data.state as LoadState);
                    setBooking(data.booking ?? null);
                } else {
                    setLoadError(data.error || "Nekaj je šlo narobe. Prosimo, poskusite znova.");
                }
            } catch {
                if (active) setLoadError("Nekaj je šlo narobe. Prosimo, poskusite znova.");
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [token]);

    const confirmCancel = async () => {
        setCancelling(true);
        setCancelError(null);
        try {
            const res = await fetch(`/api/cancel/${token}`, { method: "POST" });
            const data = await res.json();
            if (res.ok && data.success) {
                setDone(true);
            } else {
                setCancelError(data.error || "Preklica ni bilo mogoče dokončati. Prosimo, poskusite znova.");
            }
        } catch {
            setCancelError("Napaka omrežja. Prosimo, preverite povezavo in poskusite znova.");
        } finally {
            setCancelling(false);
        }
    };

    const homeLink = (
        <Link
            href="/"
            className="inline-block px-8 py-3 bg-charcoal text-porcelain rounded-full text-sm font-medium hover:bg-charcoal/90 transition-all"
        >
            Nazaj na domačo stran
        </Link>
    );

    const bookingCard = booking && (
        <div className="bg-blush/50 rounded-xl p-4 text-sm text-charcoal/60 mb-6">
            <p><span className="font-medium text-charcoal">{booking.customerName}</span></p>
            <p className="mt-1">{booking.date} ob {booking.time}</p>
        </div>
    );

    const successIcon = (
        <div className="w-16 h-16 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
        </div>
    );

    const errorIcon = (
        <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
    );

    function renderContent() {
        if (loading) {
            return (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-dusty-rose/30 border-t-charcoal rounded-full animate-spin" />
                    <p className="text-charcoal/50 text-sm">Nalaganje podrobnosti ...</p>
                </div>
            );
        }

        // Cancellation completed successfully.
        if (done) {
            return (
                <>
                    {successIcon}
                    <h2 className="font-playfair text-xl text-charcoal mb-2">Termin preklican</h2>
                    <p className="text-charcoal/50 text-sm leading-relaxed mb-6">
                        Vaš termin je bil uspešno preklican.
                    </p>
                    {bookingCard}
                    {homeLink}
                </>
            );
        }

        // Failed to load, or the POST failed.
        const hardError = loadError || cancelError;
        if (hardError && state !== "cancellable") {
            return (
                <>
                    {errorIcon}
                    <h2 className="font-playfair text-xl text-charcoal mb-2">Preklic ni uspel</h2>
                    <p className="text-charcoal/50 text-sm leading-relaxed mb-6">{hardError}</p>
                    {homeLink}
                </>
            );
        }

        if (state === "already_cancelled") {
            return (
                <>
                    {successIcon}
                    <h2 className="font-playfair text-xl text-charcoal mb-2">Termin je že preklican</h2>
                    <p className="text-charcoal/50 text-sm leading-relaxed mb-6">
                        Ta termin je bil že preklican. Ni potrebno storiti ničesar.
                    </p>
                    {bookingCard}
                    {homeLink}
                </>
            );
        }

        if (state === "too_late") {
            return (
                <>
                    {errorIcon}
                    <h2 className="font-playfair text-xl text-charcoal mb-2">Preklic ni mogoč</h2>
                    <p className="text-charcoal/50 text-sm leading-relaxed mb-6">
                        Termin je mogoče preklicati najkasneje 24 ur pred začetkom. Za pomoč nas prosimo kontaktirajte.
                    </p>
                    {bookingCard}
                    {homeLink}
                </>
            );
        }

        // state === "cancellable" — ask for explicit confirmation.
        return (
            <>
                <h2 className="font-playfair text-xl text-charcoal mb-2">Preklic termina</h2>
                <p className="text-charcoal/50 text-sm leading-relaxed mb-6">
                    Ali ste prepričani, da želite preklicati spodnji termin?
                </p>
                {bookingCard}
                {cancelError && (
                    <p className="text-red-500 text-sm mb-4">{cancelError}</p>
                )}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={confirmCancel}
                        disabled={cancelling}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-charcoal text-porcelain rounded-full text-sm font-medium hover:bg-charcoal/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {cancelling ? (
                            <>
                                <span className="w-4 h-4 border-2 border-porcelain/30 border-t-porcelain rounded-full animate-spin" />
                                Preklicujem ...
                            </>
                        ) : (
                            "Da, prekliči termin"
                        )}
                    </button>
                    <Link
                        href="/"
                        className="text-charcoal/50 text-sm font-medium hover:text-charcoal transition-colors"
                    >
                        Obdrži termin
                    </Link>
                </div>
            </>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-porcelain to-blush/30 flex items-center justify-center px-4 py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-porcelain rounded-2xl shadow-xl border border-dusty-rose/30 overflow-hidden">
                    {/* Header */}
                    <div className="bg-charcoal px-8 py-6 text-center">
                        <h1 className="font-playfair text-2xl text-porcelain tracking-wide">
                            LEPOTILNICA
                        </h1>
                        <p className="text-gold text-xs tracking-[0.25em] uppercase mt-1">
                            by Karin
                        </p>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-10 text-center">{renderContent()}</div>
                </div>
            </motion.div>
        </main>
    );
}
