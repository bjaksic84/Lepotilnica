"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export type CustomerFormValues = { customerName: string; customerPhone: string; customerEmail: string; note?: string };

/**
 * Adding or editing a customer on the Logs page. The form only collects the
 * details; the caller saves them and answers with an error message (the
 * server's validation messages are already in Slovenian) or nothing.
 */
export default function CustomerFormModal({
    eyebrow,
    title,
    initial,
    withNote = false,
    submitLabel,
    hint,
    onSubmit,
    onClose,
}: {
    eyebrow: string;
    title: string;
    initial?: Partial<CustomerFormValues>;
    withNote?: boolean;
    submitLabel: string;
    hint?: string;
    onSubmit: (values: CustomerFormValues) => Promise<string | null>;
    onClose: () => void;
}) {
    const [name, setName] = useState(initial?.customerName ?? "");
    const [phone, setPhone] = useState(initial?.customerPhone ?? "");
    const [email, setEmail] = useState(initial?.customerEmail ?? "");
    const [note, setNote] = useState(initial?.note ?? "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const submit = async () => {
        setError(null);
        if (!name.trim() || !phone.trim()) return setError("Name and phone are required.");
        setSubmitting(true);
        try {
            const message = await onSubmit({
                customerName: name.trim(),
                customerPhone: phone.trim(),
                customerEmail: email.trim(),
                ...(withNote && note.trim() ? { note: note.trim() } : {}),
            });
            if (message) setError(message);
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
                className="relative bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div>
                        <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">{eyebrow}</p>
                        <h3 className="text-white text-lg font-bold mt-0.5">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1" aria-label="Close">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-3 overflow-y-auto">
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="Ime priimek" autoComplete="off" autoFocus />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone</label>
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="+386 40 123 456" inputMode="tel" autoComplete="off" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">E-mail <span className="normal-case text-gray-300">(optional)</span></label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="ime@email.com" inputMode="email" autoComplete="off" />
                        </div>
                    </div>
                    {withNote && (
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Note <span className="normal-case text-gray-300">(optional)</span></label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} className={`mt-1.5 ${inputClass} resize-none`} placeholder="Preferences, allergies, how they found the salon..." />
                        </div>
                    )}
                    {!email.trim() && (
                        <p className="text-[11px] text-gray-400">Without an e-mail they get no booking confirmations or reminders of changes; online they would still have to give one.</p>
                    )}
                    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}
                </div>

                <div className="border-t border-gray-100 p-4 flex gap-2 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : submitLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
