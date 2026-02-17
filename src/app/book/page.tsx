"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import BookingCalendar from "@/components/BookingCalendar";
import { bookingSchema } from "@/lib/validators";

/* ─── Types ──────────────────────────────────────────── */

type Service = {
    id: number;
    name: string;
    duration: number;
    price: number;
    description: string | null;
    isPopular: boolean;
};

type Category = {
    id: number;
    name: string;
    description: string | null;
    services: Service[];
};

type Step = "service" | "date" | "time" | "details" | "confirmation";

/* ─── Constants ──────────────────────────────────────── */

// All 30-min slots from 09:00 to 16:30 (salon closes at 17:00)
const ALL_SLOTS: string[] = [];
for (let h = 9; h < 17; h++) {
    ALL_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
    ALL_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
}

const STEP_CONFIG: { key: Step; label: string }[] = [
    { key: "service", label: "Service" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "details", label: "Details" },
];

/* ─── Animation Variants ─────────────────────────────── */

const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 60 : -60, opacity: 0 }),
};

/* ─── Main Component ─────────────────────────────────── */

function BookingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Pre-selected service from URL (?service=X)
    const preServiceId = searchParams.get("service");
    const hasPreSelected = preServiceId !== null && !isNaN(Number(preServiceId));

    /* ── State ──────────────── */
    const [step, setStep] = useState<Step>(hasPreSelected ? "date" : "service");
    const [direction, setDirection] = useState(0);

    // Booking selections
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
        hasPreSelected ? Number(preServiceId) : null
    );
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    // Data
    const [categories, setCategories] = useState<Category[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);

    /* ── Computed ───────────── */
    const allServices = useMemo(
        () => categories.flatMap((c) => c.services),
        [categories]
    );
    const selectedService = useMemo(
        () => allServices.find((s) => s.id === selectedServiceId) ?? null,
        [allServices, selectedServiceId]
    );

    // Dynamic step sequence (skip service step if pre-selected & valid)
    const stepSequence: Step[] = useMemo(() => {
        if (hasPreSelected && selectedServiceId && allServices.some((s) => s.id === selectedServiceId)) {
            return ["date", "time", "details"];
        }
        return ["service", "date", "time", "details"];
    }, [hasPreSelected, selectedServiceId, allServices]);

    /* ── Effects ────────────── */

    // Fetch services
    useEffect(() => {
        fetch("/api/services")
            .then((r) => r.json())
            .then((data: Category[]) => setCategories(data))
            .catch(console.error)
            .finally(() => setLoadingServices(false));
    }, []);

    // Validate pre-selected service once services load
    useEffect(() => {
        if (hasPreSelected && !loadingServices && allServices.length > 0) {
            if (!allServices.some((s) => s.id === Number(preServiceId))) {
                setSelectedServiceId(null);
                setStep("service");
            }
        }
    }, [loadingServices, allServices, hasPreSelected, preServiceId]);

    // Fetch availability when date or service changes
    useEffect(() => {
        if (!selectedDate || !selectedService) return;
        setLoadingSlots(true);
        setAvailableSlots([]);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        fetch(`/api/availability?date=${dateStr}&duration=${selectedService.duration}`)
            .then((r) => r.json())
            .then((data) => setAvailableSlots(data.slots || []))
            .catch(console.error)
            .finally(() => setLoadingSlots(false));
    }, [selectedDate, selectedService]);

    /* ── Navigation ─────────── */
    const goTo = (target: Step) => {
        const order: Step[] = ["service", "date", "time", "details", "confirmation"];
        const curr = order.indexOf(step);
        const next = order.indexOf(target);
        setDirection(next > curr ? 1 : -1);
        setStep(target);
    };

    const goBack = () => {
        const idx = stepSequence.indexOf(step);
        if (idx > 0) goTo(stepSequence[idx - 1]);
    };

    /* ── Step Handlers ──────── */
    const handleServiceSelect = (id: number) => {
        setSelectedServiceId(id);
        setSelectedTime(null); // Reset time (duration may differ)
        goTo("date");
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null); // Reset time for new date
        goTo("time");
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        goTo("details");
    };

    /* ── Field Validation ───── */
    const validateField = (field: string, value: string) => {
        const next = { ...errors };
        switch (field) {
            case "name":
                if (!value.trim()) next.name = "Name is required";
                else if (value.trim().length < 2) next.name = "Name must be at least 2 characters";
                else if (!/^[a-zA-Z\u00C0-\u017E\s\-'.]+$/.test(value.trim()))
                    next.name = "Name can only contain letters, spaces and hyphens";
                else delete next.name;
                break;
            case "email":
                if (!value.trim()) next.email = "Email is required";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
                    next.email = "Please enter a valid email address";
                else delete next.email;
                break;
            case "phone": {
                const digits = value.replace(/\D/g, "");
                if (!value.trim()) next.phone = "Phone number is required";
                else if (digits.length < 8) next.phone = "Phone number is too short";
                else if (digits.length > 15) next.phone = "Phone number is too long";
                else if (!/^\+?[\d\s\-()]+$/.test(value.trim()))
                    next.phone = "Please enter a valid phone number";
                else delete next.phone;
                break;
            }
        }
        setErrors(next);
    };

    const handleBlur = (field: string, value: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        validateField(field, value);
    };

    const getFieldClass = (field: string) => {
        const base =
            "w-full px-5 py-3.5 rounded-xl bg-gray-50 border outline-none transition-all text-gray-900 placeholder:text-gray-400";
        if (!touched[field])
            return `${base} border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100`;
        if (errors[field])
            return `${base} border-red-300 ring-2 ring-red-100 bg-red-50/30`;
        return `${base} border-green-300 ring-2 ring-green-100 bg-green-50/20`;
    };

    /* ── Submit ──────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime || !selectedServiceId) return;

        // Touch all fields
        setTouched({ name: true, email: true, phone: true });

        const payload = {
            customerName: name.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim(),
            serviceId: selectedServiceId,
            date: format(selectedDate, "yyyy-MM-dd"),
            time: selectedTime,
            notes: notes.trim() || undefined,
        };

        const result = bookingSchema.safeParse(payload);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            const flat = result.error.flatten().fieldErrors;
            const fieldMap: Record<string, string> = {
                customerName: "name",
                customerEmail: "email",
                customerPhone: "phone",
            };
            Object.entries(flat).forEach(([key, msgs]) => {
                if (msgs?.[0]) fieldErrors[fieldMap[key] || key] = msgs[0];
            });
            setErrors(fieldErrors);
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                goTo("confirmation");
            } else {
                const data = await res.json();
                setErrors({ form: data.error || "Something went wrong. Please try again." });
            }
        } catch {
            setErrors({ form: "Network error. Please check your connection and try again." });
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Progress helpers ────── */
    const isStepDone = (s: Step) => {
        if (step === "confirmation") return true;
        switch (s) {
            case "service":
                return !!selectedServiceId;
            case "date":
                return !!selectedDate;
            case "time":
                return !!selectedTime;
            default:
                return false;
        }
    };

    /* ═══════════════════════════════════════════════════ */
    /* ══ RENDER ════════════════════════════════════════  */
    /* ═══════════════════════════════════════════════════ */

    return (
        <div className="min-h-screen pt-28 pb-20 bg-gradient-to-b from-rose-50/40 via-white to-white selection:bg-pink-200">
            {/* Background blobs */}
            <div className="fixed top-20 left-0 w-[500px] h-[500px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-15 -z-10" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-yellow-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-15 -z-10" />

            <div className="container mx-auto px-4 max-w-3xl">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 mb-2">
                        Book Your Appointment
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {step === "confirmation"
                            ? "Your booking is confirmed!"
                            : "Follow the steps below to schedule your treatment"}
                    </p>
                </motion.div>

                {/* ── Progress Bar ── */}
                {step !== "confirmation" && (
                    <div className="flex items-center justify-center mb-10">
                        {STEP_CONFIG.map((s, i) => {
                            const done = isStepDone(s.key);
                            const current = step === s.key;
                            return (
                                <div key={s.key} className="flex items-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <motion.div
                                            animate={{
                                                scale: current ? 1.15 : 1,
                                                backgroundColor: done && !current
                                                    ? "#22c55e"
                                                    : current
                                                        ? "#111827"
                                                        : "#f3f4f6",
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                                        >
                                            {done && !current ? (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span className={current ? "text-white" : "text-gray-400"}>
                                                    {i + 1}
                                                </span>
                                            )}
                                        </motion.div>
                                        <span
                                            className={`text-[10px] font-semibold tracking-wide uppercase ${
                                                current ? "text-gray-900" : done ? "text-green-600" : "text-gray-400"
                                            }`}
                                        >
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < STEP_CONFIG.length - 1 && (
                                        <div
                                            className={`w-10 sm:w-16 h-[2px] mx-1 sm:mx-2 mb-5 rounded-full transition-colors duration-300 ${
                                                done ? "bg-green-400" : "bg-gray-200"
                                            }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Selection Summary Chips ── */}
                {step !== "service" && step !== "confirmation" && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap items-center justify-center gap-2 mb-8"
                    >
                        {selectedService && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                {selectedService.name} · €{selectedService.price}
                            </span>
                        )}
                        {selectedDate && step !== "date" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                {format(selectedDate, "EEE, MMM d")}
                            </span>
                        )}
                        {selectedTime && step !== "time" && step !== "date" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                {selectedTime}
                            </span>
                        )}
                    </motion.div>
                )}

                {/* ══ Step Content ══ */}
                <div className="relative min-h-[420px]">
                    <AnimatePresence mode="wait" custom={direction}>
                        {/* ─── STEP 1: Service Selection ─── */}
                        {step === "service" && (
                            <motion.div
                                key="service"
                                custom={direction}
                                variants={stepVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <h2 className="text-xl font-playfair font-bold text-gray-900 text-center mb-8">
                                    Choose Your Treatment
                                </h2>

                                {loadingServices ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500/30 border-t-yellow-500" />
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">
                                        <p>No services available at the moment.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {categories.map((cat) => {
                                            if (cat.services.length === 0) return null;
                                            return (
                                                <div key={cat.id}>
                                                    {categories.length > 1 && (
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-6 h-[2px] bg-yellow-400 rounded-full" />
                                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em]">
                                                                {cat.name}
                                                            </h3>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {cat.services.map((service) => (
                                                            <motion.button
                                                                key={service.id}
                                                                onClick={() => handleServiceSelect(service.id)}
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                                                                    selectedServiceId === service.id
                                                                        ? "border-yellow-400 bg-yellow-50/50 shadow-md"
                                                                        : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                                                    <h4 className="font-semibold text-gray-900 text-[15px] leading-tight">
                                                                        {service.name}
                                                                    </h4>
                                                                    <span className="shrink-0 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                        {service.duration} min
                                                                    </span>
                                                                </div>
                                                                {service.description && (
                                                                    <p className="text-xs text-gray-500 line-clamp-1 mb-2.5">
                                                                        {service.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-lg font-bold text-gray-900 font-playfair">
                                                                        €{service.price}
                                                                    </span>
                                                                    <span className="text-xs text-yellow-600 font-semibold">
                                                                        Select →
                                                                    </span>
                                                                </div>
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ─── STEP 2: Date Selection ─── */}
                        {step === "date" && (
                            <motion.div
                                key="date"
                                custom={direction}
                                variants={stepVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-full flex items-center mb-8">
                                    <button
                                        onClick={goBack}
                                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h2 className="text-xl font-playfair font-bold text-gray-900 mx-auto pr-7">
                                        Pick a Date
                                    </h2>
                                </div>
                                <BookingCalendar
                                    onSelect={handleDateSelect}
                                    selectedDate={selectedDate || undefined}
                                />
                            </motion.div>
                        )}

                        {/* ─── STEP 3: Time Selection ─── */}
                        {step === "time" && (
                            <motion.div
                                key="time"
                                custom={direction}
                                variants={stepVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <div className="flex items-center mb-2">
                                    <button
                                        onClick={goBack}
                                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h2 className="text-xl font-playfair font-bold text-gray-900 mx-auto pr-7">
                                        Choose a Time
                                    </h2>
                                </div>

                                <p className="text-center text-sm text-gray-500 mb-8">
                                    {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                                    {selectedService && (
                                        <span className="text-gray-400"> · {selectedService.duration} min session</span>
                                    )}
                                </p>

                                {loadingSlots ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {ALL_SLOTS.map((time) => {
                                                const available = availableSlots.includes(time);
                                                return (
                                                    <motion.button
                                                        key={time}
                                                        disabled={!available}
                                                        onClick={() => available && handleTimeSelect(time)}
                                                        whileHover={available ? { scale: 1.04 } : {}}
                                                        whileTap={available ? { scale: 0.96 } : {}}
                                                        className={`
                                                            py-3 rounded-xl text-sm font-medium transition-all
                                                            ${available
                                                                ? "bg-white border border-gray-200 text-gray-800 hover:border-yellow-400 hover:shadow-md cursor-pointer"
                                                                : "bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed line-through decoration-gray-200"
                                                            }
                                                        `}
                                                    >
                                                        {time}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {availableSlots.length === 0 && (
                                            <div className="text-center py-12 mt-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 mb-2">No available times for this date.</p>
                                                <button
                                                    onClick={goBack}
                                                    className="text-yellow-600 text-sm font-medium hover:underline"
                                                >
                                                    ← Try another date
                                                </button>
                                            </div>
                                        )}

                                        {availableSlots.length > 0 && availableSlots.length <= 4 && (
                                            <p className="text-center text-xs text-amber-600 mt-4 font-medium">
                                                Limited availability — book soon!
                                            </p>
                                        )}

                                        {/* Legend */}
                                        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-white border border-gray-200" />
                                                <span className="text-[10px] text-gray-400">Available</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" />
                                                <span className="text-[10px] text-gray-400">Unavailable</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* ─── STEP 4: Details ─── */}
                        {step === "details" && (
                            <motion.div
                                key="details"
                                custom={direction}
                                variants={stepVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <div className="flex items-center mb-8">
                                    <button
                                        onClick={goBack}
                                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h2 className="text-xl font-playfair font-bold text-gray-900 mx-auto pr-7">
                                        Your Details
                                    </h2>
                                </div>

                                {/* Booking Summary Card */}
                                <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">{selectedService?.name}</p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}{" "}
                                                · {selectedService?.duration} min
                                            </p>
                                        </div>
                                        <span className="text-xl font-bold font-playfair text-gray-900">
                                            €{selectedService?.price}
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {errors.form && (
                                        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
                                            {errors.form}
                                        </div>
                                    )}

                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (touched.name) validateField("name", e.target.value);
                                            }}
                                            onBlur={() => handleBlur("name", name)}
                                            className={getFieldClass("name")}
                                            placeholder="Your full name"
                                            autoComplete="name"
                                        />
                                        {touched.name && errors.name && (
                                            <p className="text-red-500 text-xs pl-1 flex items-center gap-1">
                                                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email + Phone */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (touched.email) validateField("email", e.target.value);
                                                }}
                                                onBlur={() => handleBlur("email", email)}
                                                className={getFieldClass("email")}
                                                placeholder="your@email.com"
                                                autoComplete="email"
                                            />
                                            {touched.email && errors.email && (
                                                <p className="text-red-500 text-xs pl-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    {errors.email}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
                                                Phone
                                            </label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => {
                                                    setPhone(e.target.value);
                                                    if (touched.phone) validateField("phone", e.target.value);
                                                }}
                                                onBlur={() => handleBlur("phone", phone)}
                                                className={getFieldClass("phone")}
                                                placeholder="+386 40 123 456"
                                                autoComplete="tel"
                                            />
                                            {touched.phone && errors.phone && (
                                                <p className="text-red-500 text-xs pl-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    {errors.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
                                            Notes <span className="text-gray-400 normal-case">(optional)</span>
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all h-24 resize-none text-gray-900 placeholder:text-gray-400"
                                            placeholder="Any special requests, allergies, or notes?"
                                            maxLength={500}
                                        />
                                        {notes.length > 400 && (
                                            <p className="text-xs text-gray-400 text-right">{notes.length}/500</p>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-[15px] hover:bg-gray-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mt-2"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                                Confirming booking...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                Confirm Booking
                                                <span className="text-white/50">·</span>
                                                <span className="text-white/80">€{selectedService?.price}</span>
                                            </span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ─── Confirmation ─── */}
                        {step === "confirmation" && (
                            <motion.div
                                key="confirmation"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <motion.path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M5 13l4 4L19 7"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.4, delay: 0.3 }}
                                        />
                                    </svg>
                                </motion.div>

                                <h2 className="text-2xl font-playfair font-bold text-gray-900 mb-2">
                                    Booking Confirmed!
                                </h2>
                                <p className="text-gray-500 text-sm mb-8">
                                    A confirmation email has been sent to{" "}
                                    <span className="font-medium text-gray-700">{email}</span>
                                </p>

                                <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-sm mx-auto mb-8 shadow-sm">
                                    <p className="font-semibold text-gray-900 text-lg mb-0.5">{selectedService?.name}</p>
                                    <p className="text-gray-500 text-sm mb-4">
                                        {selectedService?.duration} minutes · €{selectedService?.price}
                                    </p>
                                    <div className="flex items-center justify-center gap-3 py-3 bg-gray-50 rounded-xl text-sm font-semibold text-gray-900">
                                        <span>{selectedDate && format(selectedDate, "EEE, MMM d, yyyy")}</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{selectedTime}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3">Booked for {name}</p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={() => router.push("/")}
                                        className="px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                                    >
                                        Return Home
                                    </button>
                                    <button
                                        onClick={() => {
                                            setStep("service");
                                            setSelectedServiceId(null);
                                            setSelectedDate(null);
                                            setSelectedTime(null);
                                            setName("");
                                            setEmail("");
                                            setPhone("");
                                            setNotes("");
                                            setErrors({});
                                            setTouched({});
                                        }}
                                        className="px-8 py-3 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        Book Another
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function BookingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gradient-to-b from-rose-50/40 to-white flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-yellow-500/30 border-t-yellow-500" />
                </div>
            }
        >
            <BookingContent />
        </Suspense>
    );
}
