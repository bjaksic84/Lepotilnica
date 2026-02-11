"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import BookingCalendar from "@/components/BookingCalendar";
import { BookingFormData, bookingSchema } from "@/lib/validators";
import { z } from "zod";

export default function BookingPage() {
    const [step, setStep] = useState<"date" | "time" | "details" | "confirmation">("date");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [formData, setFormData] = useState<Partial<BookingFormData>>({
        serviceId: "consultation", // Default service
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Fetch slots when date changes
    useEffect(() => {
        if (selectedDate) {
            const fetchSlots = async () => {
                setLoadingSlots(true);
                try {
                    const dateStr = format(selectedDate, "yyyy-MM-dd");
                    const res = await fetch(`/api/availability?date=${dateStr}`);
                    const data = await res.json();
                    if (data.slots) {
                        setAvailableSlots(data.slots);
                    }
                } catch (error) {
                    console.error("Failed to fetch slots", error);
                } finally {
                    setLoadingSlots(false);
                }
            };
            fetchSlots();
        }
    }, [selectedDate]);

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null);
        setStep("time");
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setStep("details");
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) return;

        setErrors({});
        setSubmitting(true);

        const payload = {
            ...formData,
            date: format(selectedDate, "yyyy-MM-dd"),
            time: selectedTime,
        };

        // Client-side validation
        const result = bookingSchema.safeParse(payload);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            const flattened = result.error.flatten().fieldErrors;

            Object.entries(flattened).forEach(([key, value]) => {
                if (value && value.length > 0) {
                    fieldErrors[key] = value[0];
                }
            });

            setErrors(fieldErrors);
            setSubmitting(false);
            return;
        }

        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setStep("confirmation");
            } else {
                const errorData = await res.json();
                setErrors({ form: errorData.error || "Something went wrong" });
            }
        } catch (error) {
            setErrors({ form: "Network error, please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const services = [
        { id: "consultation", name: "Free Consultation", duration: "30 min" },
        { id: "facial", name: "Premium Facial", duration: "60 min" },
        { id: "massage", name: "Relaxing Massage", duration: "60 min" },
    ];

    return (
        <div className="min-h-screen pt-32 pb-20 bg-pink-50/30">
            {/* Background blobs for depth */}
            <div className="fixed top-20 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10 animate-blob" />
            <div className="fixed bottom-0 right-0 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10 animate-blob animation-delay-2000" />

            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-playfair font-bold text-gray-900 mb-4"
                    >
                        Book Your <br />
                        <span className="text-gold-gradient">Premium Experience</span>
                    </motion.h1>

                    {/* Progress Bar */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        {["date", "time", "details", "confirmation"].map((s, i) => {
                            const stepIndex = ["date", "time", "details", "confirmation"].indexOf(step);
                            const isCompleted = stepIndex > i;
                            const isCurrent = stepIndex === i;

                            return (
                                <div key={s} className="flex items-center">
                                    <motion.div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500
                                    ${isCompleted || isCurrent ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-400'}
                                `}
                                        animate={{ scale: isCurrent ? 1.1 : 1 }}
                                    >
                                        {i + 1}
                                    </motion.div>
                                    {i < 3 && (
                                        <div className={`w-12 h-[2px] mx-2 ${isCompleted ? 'bg-gray-900' : 'bg-gray-200'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-8 md:p-12 rounded-3xl min-h-[500px] relative overflow-hidden"
                >
                    <AnimatePresence mode="wait">
                        {step === "date" && (
                            <motion.div
                                key="date"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center"
                            >
                                <h2 className="text-2xl font-playfair font-bold mb-8 text-gray-800">Select a Date</h2>
                                <BookingCalendar onSelect={handleDateSelect} selectedDate={selectedDate || undefined} />
                            </motion.div>
                        )}

                        {step === "time" && (
                            <motion.div
                                key="time"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center mb-8">
                                    <button onClick={() => setStep("date")} className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <h2 className="text-2xl font-playfair font-bold text-gray-800">Select a Time</h2>
                                </div>

                                <p className="text-gray-600 mb-8">Availability for <span className="font-bold text-gray-900">{selectedDate && format(selectedDate, "EEEE, MMMM do")}</span></p>

                                {loadingSlots ? (
                                    <div className="flex justify-center items-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {availableSlots.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => handleTimeSelect(time)}
                                                className="py-4 px-2 rounded-xl border border-gray-100 bg-white hover:border-yellow-400 hover:shadow-md transition-all text-gray-700 font-medium hover:-translate-y-1"
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-gray-500">No slots available for this date.</p>
                                        <button onClick={() => setStep("date")} className="mt-4 text-yellow-600 underline text-sm">Choose another date</button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === "details" && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center mb-8">
                                    <button onClick={() => setStep("time")} className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <h2 className="text-2xl font-playfair font-bold text-gray-800">Your Details</h2>
                                </div>

                                <form onSubmit={handleFormSubmit} className="space-y-6 max-w-xl mx-auto">
                                    {errors.form && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center">{errors.form}</div>}

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Service</label>
                                        <div className="relative">
                                            <select
                                                value={formData.serviceId}
                                                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-500/50 outline-none appearance-none font-medium text-gray-900"
                                            >
                                                {services.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.duration})</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.customerName || ""}
                                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                                className={`w-full px-5 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 outline-none transition-all ${errors.customerName ? "ring-2 ring-red-200 bg-red-50" : "focus:ring-yellow-500/50"}`}
                                                placeholder="Jane Doe"
                                            />
                                            {errors.customerName && <p className="text-red-500 text-xs pl-1">{errors.customerName}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.customerEmail || ""}
                                                onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                                                className={`w-full px-5 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 outline-none transition-all ${errors.customerEmail ? "ring-2 ring-red-200 bg-red-50" : "focus:ring-yellow-500/50"}`}
                                                placeholder="jane@example.com"
                                            />
                                            {errors.customerEmail && <p className="text-red-500 text-xs pl-1">{errors.customerEmail}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.customerPhone || ""}
                                            onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                            className={`w-full px-5 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 outline-none transition-all ${errors.customerPhone ? "ring-2 ring-red-200 bg-red-50" : "focus:ring-yellow-500/50"}`}
                                            placeholder="+386..."
                                        />
                                        {errors.customerPhone && <p className="text-red-500 text-xs pl-1">{errors.customerPhone}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Notes (Optional)</label>
                                        <textarea
                                            value={formData.notes || ""}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full px-5 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-yellow-500/50 outline-none h-32 resize-none"
                                            placeholder="Any special requests or allergies?"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="btn-primary w-full py-4 text-lg"
                                        >
                                            {submitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                    Confirming...
                                                </span>
                                            ) : "Confirm Booking"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {step === "confirmation" && (
                            <motion.div
                                key="confirmation"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-10"
                            >
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-4xl font-playfair font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
                                <div className="bg-gray-50 p-6 rounded-2xl max-w-sm mx-auto mb-8 border border-gray-100">
                                    <p className="text-gray-900 font-medium text-lg mb-1">{formData.customerName}</p>
                                    <p className="text-gray-500 mb-4">{services.find(s => s.id === formData.serviceId)?.name}</p>
                                    <div className="flex items-center justify-center gap-2 text-gray-700 font-semibold bg-white py-2 rounded-lg border border-gray-200">
                                        <span>{selectedDate && format(selectedDate, "MMM d")}</span>
                                        <span>•</span>
                                        <span>{selectedTime}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.location.href = "/"}
                                    className="btn-primary"
                                >
                                    Return Home
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
