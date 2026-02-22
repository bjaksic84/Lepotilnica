"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import BookingCalendar from "@/components/BookingCalendar";
import { multiBookingSchema } from "@/lib/validators";
import { generateSlotsForDateStr, timeToMinutes, minutesToTime } from "@/lib/schedule";

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

    // Pre-selected service(s) from URL (?service=X or ?services=X,Y,Z)
    const preServiceIds: number[] = useMemo(() => {
        const multi = searchParams.get("services");
        if (multi) {
            return multi.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
        }
        const single = searchParams.get("service");
        if (single && !isNaN(Number(single))) {
            return [Number(single)];
        }
        return [];
    }, [searchParams]);
    const hasPreSelected = preServiceIds.length > 0;

    /* ── State ──────────────── */
    const [step, setStep] = useState<Step>(hasPreSelected ? "date" : "service");
    const [direction, setDirection] = useState(0);

    // Booking selections
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(preServiceIds);
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
    const selectedServices = useMemo(
        () => selectedServiceIds.map((id) => allServices.find((s) => s.id === id)).filter(Boolean) as Service[],
        [allServices, selectedServiceIds]
    );
    const totalDuration = useMemo(
        () => selectedServices.reduce((sum, s) => sum + s.duration, 0),
        [selectedServices]
    );
    const totalPrice = useMemo(
        () => selectedServices.reduce((sum, s) => sum + s.price, 0),
        [selectedServices]
    );

    // Day-specific 30-min slots (computed when date is selected)
    const daySlots = useMemo(() => {
        if (!selectedDate) return [];
        return generateSlotsForDateStr(format(selectedDate, "yyyy-MM-dd"));
    }, [selectedDate]);

    // Compute each service's start time given the selected start time
    const getServiceTime = useCallback(
        (index: number): string => {
            if (!selectedTime) return "";
            let minutes = timeToMinutes(selectedTime);
            for (let i = 0; i < index; i++) {
                minutes += selectedServices[i].duration;
            }
            return minutesToTime(minutes);
        },
        [selectedTime, selectedServices]
    );

    // Dynamic step sequence (skip service step if pre-selected & valid)
    const stepSequence: Step[] = useMemo(() => {
        if (
            hasPreSelected &&
            selectedServiceIds.length > 0 &&
            selectedServiceIds.every((id) => allServices.some((s) => s.id === id))
        ) {
            return ["date", "time", "details"];
        }
        return ["service", "date", "time", "details"];
    }, [hasPreSelected, selectedServiceIds, allServices]);

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
            const validIds = selectedServiceIds.filter((id) =>
                allServices.some((s) => s.id === id)
            );
            if (validIds.length === 0) {
                setSelectedServiceIds([]);
                setStep("service");
            } else if (validIds.length !== selectedServiceIds.length) {
                setSelectedServiceIds(validIds);
            }
        }
    }, [loadingServices, allServices, hasPreSelected, preServiceIds]);

    // Fetch availability when date or services change
    useEffect(() => {
        if (!selectedDate || selectedServices.length === 0) return;
        setLoadingSlots(true);
        setAvailableSlots([]);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        fetch(`/api/availability?date=${dateStr}&duration=${totalDuration}`)
            .then((r) => r.json())
            .then((data) => setAvailableSlots(data.slots || []))
            .catch(console.error)
            .finally(() => setLoadingSlots(false));
    }, [selectedDate, totalDuration, selectedServices.length]);

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
    const handleServiceToggle = (id: number) => {
        setSelectedServiceIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }
            return [...prev, id];
        });
        setSelectedTime(null); // Reset time (duration may differ)
    };

    const handleServicesContinue = () => {
        if (selectedServiceIds.length === 0) return;
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
            "w-full px-5 py-3.5 rounded-xl bg-blush-light border outline-none transition-all text-charcoal placeholder:text-charcoal/30";
        if (!touched[field])
            return `${base} border-dusty-rose/30 focus:border-gold focus:ring-2 focus:ring-gold/10`;
        if (errors[field])
            return `${base} border-red-300 ring-2 ring-red-100 bg-red-50/30`;
        return `${base} border-green-300 ring-2 ring-green-100 bg-green-50/20`;
    };

    /* ── Submit ──────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime || selectedServiceIds.length === 0) return;

        // Touch all fields
        setTouched({ name: true, email: true, phone: true });

        const payload = {
            customerName: name.trim(),
            customerEmail: email.trim(),
            customerPhone: phone.trim(),
            serviceIds: selectedServiceIds,
            date: format(selectedDate, "yyyy-MM-dd"),
            time: selectedTime,
            notes: notes.trim() || undefined,
        };

        const result = multiBookingSchema.safeParse(payload);
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
                return selectedServiceIds.length > 0;
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
        <div className="min-h-screen pt-28 pb-20 bg-gradient-to-b from-blush/30 via-porcelain to-porcelain selection:bg-dusty-rose/40">
            {/* Background blobs */}
            <div className="fixed top-20 left-0 w-[500px] h-[500px] bg-dusty-rose rounded-full mix-blend-multiply filter blur-[120px] opacity-15 -z-10" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-gold-light rounded-full mix-blend-multiply filter blur-[120px] opacity-10 -z-10" />

            <div className="container mx-auto px-4 max-w-3xl">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <h1 className="text-3xl md:text-4xl font-playfair font-bold text-charcoal mb-2">
                        Book Your Appointment
                    </h1>
                    <p className="text-charcoal/50 text-sm">
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
                                                        ? "#2D2A2A"
                                                        : "#F2E6E6",
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                                        >
                                            {done && !current ? (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span className={current ? "text-porcelain" : "text-charcoal/40"}>
                                                    {i + 1}
                                                </span>
                                            )}
                                        </motion.div>
                                        <span
                                            className={`text-[10px] font-semibold tracking-wide uppercase ${
                                                current ? "text-charcoal" : done ? "text-green-600" : "text-charcoal/40"
                                            }`}
                                        >
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < STEP_CONFIG.length - 1 && (
                                        <div
                                            className={`w-10 sm:w-16 h-[2px] mx-1 sm:mx-2 mb-5 rounded-full transition-colors duration-300 ${
                                                done ? "bg-green-400" : "bg-dusty-rose/30"
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
                        {selectedServices.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-porcelain rounded-full text-xs font-medium text-charcoal border border-dusty-rose/30 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                {selectedServices.length === 1
                                    ? `${selectedServices[0].name} · €${selectedServices[0].price}`
                                    : `${selectedServices.length} services · €${totalPrice}`}
                            </span>
                        )}
                        {selectedDate && step !== "date" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-porcelain rounded-full text-xs font-medium text-charcoal border border-dusty-rose/30 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-dusty-rose" />
                                {format(selectedDate, "EEE, MMM d")}
                            </span>
                        )}
                        {selectedTime && step !== "time" && step !== "date" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-porcelain rounded-full text-xs font-medium text-charcoal border border-dusty-rose/30 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-charcoal/40" />
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
                                <h2 className="text-xl font-playfair font-bold text-charcoal text-center mb-2">
                                    Choose Your Treatment{selectedServiceIds.length > 0 ? "s" : ""}
                                </h2>
                                <p className="text-center text-xs text-charcoal/40 mb-8">
                                    Select one or more services, then continue
                                </p>

                                {loadingServices ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold/30 border-t-gold" />
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="text-center py-20 text-charcoal/50">
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
                                                            <div className="w-6 h-[2px] bg-gold rounded-full" />
                                                            <h3 className="text-xs font-bold text-charcoal/40 uppercase tracking-[0.15em]">
                                                                {cat.name}
                                                            </h3>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {cat.services.map((service) => {
                                                            const isSelected = selectedServiceIds.includes(service.id);
                                                            const selectionIndex = selectedServiceIds.indexOf(service.id);
                                                            return (
                                                                <motion.button
                                                                    key={service.id}
                                                                    onClick={() => handleServiceToggle(service.id)}
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className={`text-left p-5 rounded-2xl border-2 transition-all ${
                                                                        isSelected
                                                                            ? "border-gold bg-blush/50 shadow-md"
                                                                            : "border-dusty-rose/20 bg-porcelain hover:border-dusty-rose/40 hover:shadow-sm"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-3 mb-1.5">
                                                                        <div className="flex items-start gap-2.5">
                                                                            <div className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                                                                                isSelected
                                                                                    ? "bg-gold border-gold"
                                                                                    : "border-charcoal/20 bg-porcelain"
                                                                            }`}>
                                                                                {isSelected && (
                                                                                    <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                )}
                                                                            </div>
                                                                            <h4 className="font-semibold text-charcoal text-[15px] leading-tight">
                                                                                {service.name}
                                                                            </h4>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            {isSelected && (
                                                                                <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">
                                                                                    #{selectionIndex + 1}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[11px] font-medium text-charcoal/50 bg-dusty-rose/20 px-2 py-0.5 rounded-full">
                                                                                {service.duration} min
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {service.description && (
                                                                        <p className="text-xs text-charcoal/50 line-clamp-1 mb-2.5 pl-7">
                                                                            {service.description}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center justify-between pl-7">
                                                                        <span className="text-lg font-bold text-charcoal font-playfair">
                                                                            €{service.price}
                                                                        </span>
                                                                        <span className={`text-xs font-semibold transition-colors ${
                                                                            isSelected ? "text-gold" : "text-charcoal/30"
                                                                        }`}>
                                                                            {isSelected ? "Selected ✓" : "+ Add"}
                                                                        </span>
                                                                    </div>
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Continue button */}
                                        <AnimatePresence>
                                            {selectedServiceIds.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    className="sticky bottom-4 pt-4"
                                                >
                                                    <button
                                                        onClick={handleServicesContinue}
                                                        className="w-full py-4 bg-charcoal text-porcelain rounded-xl font-bold text-[15px] hover:bg-charcoal/90 transition-all shadow-lg hover:shadow-xl"
                                                    >
                                                        <span className="flex items-center justify-center gap-2">
                                                            Continue with {selectedServiceIds.length} service{selectedServiceIds.length > 1 ? "s" : ""}
                                                            <span className="text-porcelain/50">·</span>
                                                            <span className="text-porcelain/80">€{totalPrice}</span>
                                                            <span className="text-porcelain/50">·</span>
                                                            <span className="text-porcelain/60 text-sm">{totalDuration} min</span>
                                                        </span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
                                        className="p-2 -ml-2 rounded-full hover:bg-blush transition-colors text-charcoal/40 hover:text-charcoal"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h2 className="text-xl font-playfair font-bold text-charcoal mx-auto pr-7">
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
                                        className="p-2 -ml-2 rounded-full hover:bg-blush transition-colors text-charcoal/40 hover:text-charcoal"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h2 className="text-xl font-playfair font-bold text-charcoal mx-auto pr-7">
                                        Choose a Time
                                    </h2>
                                </div>

                                <p className="text-center text-sm text-charcoal/50 mb-8">
                                    {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                                    {selectedServices.length > 0 && (
                                        <span className="text-charcoal/30"> · {totalDuration} min total</span>
                                    )}
                                </p>

                                {loadingSlots ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className="h-12 rounded-xl bg-dusty-rose/20 animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {daySlots.map((time) => {
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
                                                                ? "bg-porcelain border border-dusty-rose/30 text-charcoal hover:border-gold hover:shadow-md cursor-pointer"
                                                                : "bg-blush-light border border-dusty-rose/15 text-charcoal/20 cursor-not-allowed line-through decoration-dusty-rose/20"
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
                                                <div className="w-12 h-12 bg-blush rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-6 h-6 text-charcoal/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-charcoal/50 mb-2">No available times for this date.</p>
                                                <button
                                                    onClick={goBack}
                                                    className="text-gold text-sm font-medium hover:underline"
                                                >
                                                    ← Try another date
                                                </button>
                                            </div>
                                        )}

                                        {availableSlots.length > 0 && availableSlots.length <= 4 && (
                                            <p className="text-center text-xs text-gold-dark mt-4 font-medium">
                                                Limited availability — book soon!
                                            </p>
                                        )}

                                        {/* Legend */}
                                        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-dusty-rose/20">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-porcelain border border-dusty-rose/30" />
                                                <span className="text-[10px] text-charcoal/40">Available</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-blush-light border border-dusty-rose/15" />
                                                <span className="text-[10px] text-charcoal/40">Unavailable</span>
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
                                        className="p-2 -ml-2 rounded-full hover:bg-blush transition-colors text-charcoal/40 hover:text-charcoal"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h2 className="text-xl font-playfair font-bold text-charcoal mx-auto pr-7">
                                        Your Details
                                    </h2>
                                </div>

                                {/* Booking Summary Card */}
                                <div className="bg-blush/50 rounded-2xl p-5 mb-8 border border-dusty-rose/30">
                                    <div className="space-y-3">
                                        {selectedServices.map((service, i) => (
                                            <div key={service.id} className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-charcoal text-sm">
                                                        {selectedServices.length > 1 && (
                                                            <span className="text-gold text-xs mr-1.5">#{i + 1}</span>
                                                        )}
                                                        {service.name}
                                                    </p>
                                                    <p className="text-charcoal/50 text-xs mt-0.5">
                                                        {getServiceTime(i)} · {service.duration} min
                                                    </p>
                                                </div>
                                                <span className="text-charcoal font-bold font-playfair">
                                                    €{service.price}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-dusty-rose/30 mt-3 pt-3 flex items-center justify-between">
                                        <p className="text-charcoal/50 text-xs">
                                            {selectedDate && format(selectedDate, "EEEE, MMMM d")} · {totalDuration} min total
                                        </p>
                                        <span className="text-xl font-bold font-playfair text-charcoal">
                                            €{totalPrice}
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
                                        <label className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider pl-1">
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
                                            <label className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider pl-1">
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
                                            <label className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider pl-1">
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
                                        <label className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider pl-1">
                                            Notes <span className="text-charcoal/30 normal-case">(optional)</span>
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-blush-light border border-dusty-rose/30 outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 transition-all h-24 resize-none text-charcoal placeholder:text-charcoal/30"
                                            placeholder="Any special requests, allergies, or notes?"
                                            maxLength={500}
                                        />
                                        {notes.length > 400 && (
                                            <p className="text-xs text-charcoal/30 text-right">{notes.length}/500</p>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 bg-charcoal text-porcelain rounded-xl font-bold text-[15px] hover:bg-charcoal/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mt-2"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-porcelain/30 border-t-porcelain" />
                                                Confirming booking...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                Confirm Booking
                                                <span className="text-porcelain/50">·</span>
                                                <span className="text-porcelain/80">€{totalPrice}</span>
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

                                <h2 className="text-2xl font-playfair font-bold text-charcoal mb-2">
                                    Booking Confirmed!
                                </h2>
                                <p className="text-charcoal/50 text-sm mb-8">
                                    A confirmation email has been sent to{" "}
                                    <span className="font-medium text-charcoal">{email}</span>
                                </p>

                                <div className="bg-porcelain border border-dusty-rose/30 rounded-2xl p-6 max-w-sm mx-auto mb-8 shadow-sm">
                                    {selectedServices.map((service, i) => (
                                        <div key={service.id} className="flex justify-between text-sm mb-1">
                                            <span className="text-charcoal">{service.name}</span>
                                            <span className="text-charcoal/50">€{service.price}</span>
                                        </div>
                                    ))}
                                    {selectedServices.length > 1 && (
                                        <div className="border-t border-dusty-rose/20 mt-2 pt-2 flex justify-between">
                                            <span className="font-bold text-charcoal text-sm">Total</span>
                                            <span className="font-bold text-charcoal">€{totalPrice}</span>
                                        </div>
                                    )}
                                    <p className="text-charcoal/50 text-sm mt-3 mb-4">
                                        {totalDuration} minutes · €{totalPrice}
                                    </p>
                                    <div className="flex items-center justify-center gap-3 py-3 bg-blush/50 rounded-xl text-sm font-semibold text-charcoal">
                                        <span>{selectedDate && format(selectedDate, "EEE, MMM d, yyyy")}</span>
                                        <span className="text-charcoal/20">|</span>
                                        <span>{selectedTime}</span>
                                    </div>
                                    <p className="text-xs text-charcoal/40 mt-3">Booked for {name}</p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={() => router.push("/")}
                                        className="px-8 py-3 bg-charcoal text-porcelain rounded-xl font-semibold hover:bg-charcoal/90 transition-colors"
                                    >
                                        Return Home
                                    </button>
                                    <button
                                        onClick={() => {
                                            setStep("service");
                                            setSelectedServiceIds([]);
                                            setSelectedDate(null);
                                            setSelectedTime(null);
                                            setName("");
                                            setEmail("");
                                            setPhone("");
                                            setNotes("");
                                            setErrors({});
                                            setTouched({});
                                        }}
                                        className="px-8 py-3 bg-porcelain text-charcoal rounded-xl font-semibold border border-dusty-rose/30 hover:bg-blush transition-colors"
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
                <div className="min-h-screen bg-gradient-to-b from-blush/30 to-porcelain flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-gold/30 border-t-gold" />
                </div>
            }
        >
            <BookingContent />
        </Suspense>
    );
}
