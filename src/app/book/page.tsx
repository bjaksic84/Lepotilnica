"use client";

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { sl } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import BookingCalendar from "@/components/BookingCalendar";
import { multiBookingSchema } from "@/lib/validators";
import { generateSlotsForDateStr, timeToMinutes, minutesToTime } from "@/lib/schedule";
import {
    type Step,
    type SavedProgress,
    sameIdSet,
    readProgress,
    writeProgress,
    clearProgress,
} from "@/lib/booking-storage";

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

/* ─── Constants ──────────────────────────────────────── */

const STEP_CONFIG: { key: Step; label: string }[] = [
    { key: "service", label: "Storitev" },
    { key: "date", label: "Datum" },
    { key: "time", label: "Ura" },
    { key: "details", label: "Podatki" },
];

// Full linear order used for navigation math.
const STEP_ORDER: Step[] = ["service", "date", "time", "details", "confirmation"];

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

    // Pre-selected service(s) from URL
    // ?services=X,Y,Z  → skip to date step (from services page)
    // ?service=X        → stay on service step with it pre-checked (from landing page)
    const { preServiceIds, skipServiceStep } = useMemo(() => {
        const multi = searchParams.get("services");
        if (multi) {
            const ids = multi.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
            return { preServiceIds: ids, skipServiceStep: ids.length > 0 };
        }
        const single = searchParams.get("service");
        if (single && !isNaN(Number(single))) {
            return { preServiceIds: [Number(single)], skipServiceStep: false };
        }
        return { preServiceIds: [] as number[], skipServiceStep: false };
    }, [searchParams]);

    /* ── State ──────────────── */
    const [step, setStep] = useState<Step>(skipServiceStep ? "date" : "service");
    const [direction, setDirection] = useState(0);
    // Whether the flow started from the services page (no in-flow service step).
    // Seeded from the URL but may be restored from saved progress.
    const [fromServices, setFromServices] = useState(skipServiceStep);
    // Gate the flow until we've attempted to restore saved progress (avoids flashes).
    const [hydrated, setHydrated] = useState(false);

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

    // Step-1 category quick-jump (mirrors the services page pills)
    const bookNavRef = useRef<HTMLDivElement>(null);
    const bookPillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const [activeBookCat, setActiveBookCat] = useState<number | null>(null);

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);

    /* ── Computed ───────────── */
    const allServices = useMemo(
        () => categories.flatMap((c) => c.services),
        [categories]
    );
    // Categories that actually have services — drives the step-1 quick-jump nav.
    const visibleBookCategories = useMemo(
        () => categories.filter((c) => c.services.length > 0),
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

    // Slots we actually render on the time step: drop already-passed times for
    // today, so the grid only ever contains slots the legend describes
    // (Prosto / Zasedeno) — no ambiguous struck-through "past" tiles.
    const visibleSlots = useMemo(() => {
        if (!selectedDate) return [];
        if (!isSameDay(selectedDate, new Date())) return daySlots;
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        return daySlots.filter((t) => timeToMinutes(t) > nowMin);
    }, [daySlots, selectedDate]);

    // How many of the visible slots are actually bookable (rest are Zasedeno).
    const bookableVisibleCount = useMemo(
        () => visibleSlots.filter((t) => availableSlots.includes(t)).length,
        [visibleSlots, availableSlots]
    );

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

    // Dynamic step sequence (skip service step only if came from services page with valid selections)
    const stepSequence: Step[] = useMemo(() => {
        if (
            fromServices &&
            selectedServiceIds.length > 0 &&
            selectedServiceIds.every((id) => allServices.some((s) => s.id === id))
        ) {
            return ["date", "time", "details"];
        }
        return ["service", "date", "time", "details"];
    }, [fromServices, selectedServiceIds, allServices]);

    /* ── Effects ────────────── */

    // Fetch services
    useEffect(() => {
        fetch("/api/services")
            .then((r) => r.json())
            .then((data: Category[]) => setCategories(data))
            .catch(console.error)
            .finally(() => setLoadingServices(false));
    }, []);

    // Validate selected services once the catalogue loads.
    // Covers both URL params and restored progress — drops any stale IDs.
    useEffect(() => {
        if (loadingServices || allServices.length === 0 || selectedServiceIds.length === 0) return;
        const validIds = selectedServiceIds.filter((id) =>
            allServices.some((s) => s.id === id)
        );
        if (validIds.length === 0) {
            setSelectedServiceIds([]);
            setFromServices(false);
            setStep("service");
        } else if (validIds.length !== selectedServiceIds.length) {
            setSelectedServiceIds(validIds);
        }
    }, [loadingServices, allServices, selectedServiceIds]);

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

    // Restore saved progress on mount (client-only, so no hydration mismatch).
    useEffect(() => {
        try {
            const fresh = readProgress();

            const hasServicesParam = !!searchParams.get("services");
            const hasSingleParam = !!searchParams.get("service");

            // Apply saved progress when it's the same booking continuing:
            // - `?services=` present → only if it matches the saved selection
            // - no service params → restore in full
            const shouldApply =
                !!fresh &&
                ((hasServicesParam && sameIdSet(fresh.selectedServiceIds, preServiceIds)) ||
                    (!hasServicesParam && !hasSingleParam));

            if (shouldApply && fresh) {
                if (Array.isArray(fresh.selectedServiceIds)) {
                    setSelectedServiceIds(fresh.selectedServiceIds);
                }

                // Drop a saved date that's now in the past (and its time).
                let restoredDate: Date | null = null;
                if (fresh.selectedDate) {
                    const parsed = new Date(`${fresh.selectedDate}T00:00:00`);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (!isNaN(parsed.getTime()) && parsed >= today) restoredDate = parsed;
                }
                setSelectedDate(restoredDate);
                setSelectedTime(restoredDate ? fresh.selectedTime ?? null : null);

                if (typeof fresh.name === "string") setName(fresh.name);
                if (typeof fresh.email === "string") setEmail(fresh.email);
                if (typeof fresh.phone === "string") setPhone(fresh.phone);
                if (typeof fresh.notes === "string") setNotes(fresh.notes);

                const restoredFromServices =
                    typeof fresh.fromServices === "boolean" ? fresh.fromServices : skipServiceStep;
                setFromServices(restoredFromServices);

                // Land on the furthest step the restored data supports, but never past
                // where the user had actually progressed (nor straight to confirmation).
                const hasServices = (fresh.selectedServiceIds?.length ?? 0) > 0;
                let reachable: Step;
                if (!hasServices) reachable = restoredFromServices ? "date" : "service";
                else if (!restoredDate) reachable = "date";
                else if (!fresh.selectedTime) reachable = "time";
                else reachable = "details";

                const savedPos = fresh.step ? STEP_ORDER.indexOf(fresh.step) : 0;
                const reachablePos = STEP_ORDER.indexOf(reachable);
                let targetPos = Math.min(savedPos >= 0 ? savedPos : 0, reachablePos);
                if (STEP_ORDER[targetPos] === "confirmation") targetPos = STEP_ORDER.indexOf("details");
                let target = STEP_ORDER[targetPos];
                if (restoredFromServices && target === "service") target = "date";
                setStep(target);
            }
        } catch {
            // Corrupt/unavailable storage — start fresh.
        }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist progress whenever it changes (post-hydration, excluding the terminal step).
    useEffect(() => {
        if (!hydrated || step === "confirmation") return;
        const payload: SavedProgress = {
            selectedServiceIds,
            selectedDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
            selectedTime,
            name,
            email,
            phone,
            notes,
            step,
            fromServices,
        };
        writeProgress(payload);
    }, [hydrated, selectedServiceIds, selectedDate, selectedTime, name, email, phone, notes, step, fromServices]);

    // Each step is its own screen, but the steps swap in place (no route change),
    // so the window keeps whatever scroll position the previous step left behind
    // — e.g. selecting a service low in the long step-1 list dropped users near
    // the bottom of step 2. Reset to the top on every step change so each step
    // always starts at its beginning.
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
    }, [step]);

    const clearSavedProgress = useCallback(() => {
        clearProgress();
    }, []);

    const scrollToBookCategory = useCallback((catId: number) => {
        const el = document.getElementById(`book-cat-${catId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    // Scroll-spy: highlight the category currently in view on the service step.
    useEffect(() => {
        if (step !== "service" || visibleBookCategories.length < 2) return;
        const setActive = () => {
            let current = visibleBookCategories[0].id;
            for (const cat of visibleBookCategories) {
                const el = document.getElementById(`book-cat-${cat.id}`);
                if (el && el.getBoundingClientRect().top - 200 <= 0) current = cat.id;
            }
            setActiveBookCat(current);
        };
        setActive();
        window.addEventListener("scroll", setActive, { passive: true });
        return () => window.removeEventListener("scroll", setActive);
    }, [step, visibleBookCategories]);

    // Keep the active pill within view in the horizontal nav.
    useEffect(() => {
        if (activeBookCat == null) return;
        const pill = bookPillRefs.current.get(activeBookCat);
        const nav = bookNavRef.current;
        if (!pill || !nav) return;
        const pl = pill.offsetLeft;
        const pr = pl + pill.offsetWidth;
        if (pl < nav.scrollLeft || pr > nav.scrollLeft + nav.clientWidth) {
            nav.scrollTo({ left: Math.max(0, pl - 20), behavior: "smooth" });
        }
    }, [activeBookCat]);

    /* ── Navigation ─────────── */
    const goTo = (target: Step) => {
        const curr = STEP_ORDER.indexOf(step);
        const next = STEP_ORDER.indexOf(target);
        setDirection(next > curr ? 1 : -1);
        setStep(target);
    };

    // Return to the services page, keeping the current selection highlighted there.
    const backToServices = () => {
        const qs = selectedServiceIds.length ? `?selected=${selectedServiceIds.join(",")}` : "";
        router.push(`/services${qs}`);
    };

    const goBack = () => {
        const idx = stepSequence.indexOf(step);
        if (idx > 0) {
            goTo(stepSequence[idx - 1]);
            return;
        }
        // At the first in-flow step: if we came from the services page, go back there.
        if (fromServices) backToServices();
    };

    // Whether an earlier step can be reached directly (for progress bar / summary chips).
    const canJump = (target: Step) => {
        if (target === step) return false;
        if (target === "service" && fromServices) return true; // proxy for the services page
        const ti = stepSequence.indexOf(target);
        const ci = stepSequence.indexOf(step);
        return ti !== -1 && ci !== -1 && ti < ci;
    };

    const jumpToStep = (target: Step) => {
        if (!canJump(target)) return;
        if (target === "service" && fromServices) {
            backToServices();
            return;
        }
        goTo(target);
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
                if (!value.trim()) next.name = "Ime in priimek sta obvezna";
                else if (value.trim().length < 2) next.name = "Ime mora vsebovati vsaj 2 znaka";
                else if (!/^[a-zA-Z\u00C0-\u017E\s\-'.]+$/.test(value.trim()))
                    next.name = "Ime lahko vsebuje samo črke, presledke in vezaje";
                else delete next.name;
                break;
            case "email":
                if (!value.trim()) next.email = "E-pošta je obvezna";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
                    next.email = "Vnesite veljaven e-poštni naslov";
                else delete next.email;
                break;
            case "phone": {
                const digits = value.replace(/\D/g, "");
                if (!value.trim()) next.phone = "Telefonska številka je obvezna";
                else if (digits.length < 8) next.phone = "Telefonska številka je prekratka";
                else if (digits.length > 15) next.phone = "Telefonska številka je predolga";
                else if (!/^\+?[\d\s\-()]+$/.test(value.trim()))
                    next.phone = "Vnesite veljavno telefonsko številko";
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
                clearSavedProgress();
                goTo("confirmation");
            } else {
                const data = await res.json();
                setErrors({ form: data.error || "Prišlo je do napake. Prosimo, poskusite znova." });
            }
        } catch {
            setErrors({ form: "Napaka omrežja. Prosimo, preverite povezavo in poskusite znova." });
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

    // Hold rendering until saved progress has been restored, to avoid a step flash.
    if (!hydrated) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blush/30 to-porcelain flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gold/30 border-t-gold" />
            </div>
        );
    }

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
                        Rezervirajte svoj termin
                    </h1>
                    <p className="text-charcoal/50 text-sm">
                        {step === "confirmation"
                            ? "Vaša rezervacija je potrjena!"
                            : "Sledite spodnjim korakom za rezervacijo termina"}
                    </p>
                </motion.div>

                {/* ── Progress Bar ── */}
                {step !== "confirmation" && (
                    <div className="flex items-center justify-center mb-10">
                        {STEP_CONFIG.map((s, i) => {
                            const done = isStepDone(s.key);
                            const current = step === s.key;
                            const clickable = canJump(s.key);
                            return (
                                <div key={s.key} className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => jumpToStep(s.key)}
                                        disabled={!clickable}
                                        aria-label={clickable ? `Nazaj na korak: ${s.label}` : s.label}
                                        className={`group flex flex-col items-center gap-1.5 ${
                                            clickable ? "cursor-pointer" : "cursor-default"
                                        }`}
                                    >
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
                                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-transparent transition-shadow ${
                                                clickable ? "group-hover:ring-gold/40" : ""
                                            }`}
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
                                            className={`text-[10px] font-semibold tracking-wide uppercase transition-colors ${
                                                current
                                                    ? "text-charcoal"
                                                    : done
                                                        ? "text-green-600"
                                                        : "text-charcoal/40"
                                            } ${clickable ? "group-hover:text-gold-dark" : ""}`}
                                        >
                                            {s.label}
                                        </span>
                                    </button>
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
                            <button
                                type="button"
                                onClick={() => jumpToStep("service")}
                                disabled={!canJump("service")}
                                title={canJump("service") ? "Uredi izbrane storitve" : undefined}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-porcelain rounded-full text-xs font-medium text-charcoal border border-dusty-rose/30 shadow-sm transition-colors ${
                                    canJump("service") ? "cursor-pointer hover:border-gold/50 hover:text-gold-dark" : "cursor-default"
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                {selectedServices.length === 1
                                    ? `${selectedServices[0].name} · €${selectedServices[0].price}`
                                    : selectedServices.length === 2 || selectedServices.length === 3 || selectedServices.length === 4 ? `${selectedServices.length} storitve · €${totalPrice}` : `${selectedServices.length} storitev · €${totalPrice}`
                                }
                            </button>
                        )}
                        {selectedDate && step !== "date" && (
                            <button
                                type="button"
                                onClick={() => jumpToStep("date")}
                                disabled={!canJump("date")}
                                title={canJump("date") ? "Spremeni datum" : undefined}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-porcelain rounded-full text-xs font-medium text-charcoal border border-dusty-rose/30 shadow-sm transition-colors ${
                                    canJump("date") ? "cursor-pointer hover:border-gold/50 hover:text-gold-dark" : "cursor-default"
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-dusty-rose" />
                                {format(selectedDate, "EEE, d. MMM", { locale: sl })}
                            </button>
                        )}
                        {selectedTime && step !== "time" && step !== "date" && (
                            <button
                                type="button"
                                onClick={() => jumpToStep("time")}
                                disabled={!canJump("time")}
                                title={canJump("time") ? "Spremeni uro" : undefined}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-porcelain rounded-full text-xs font-medium text-charcoal border border-dusty-rose/30 shadow-sm transition-colors ${
                                    canJump("time") ? "cursor-pointer hover:border-gold/50 hover:text-gold-dark" : "cursor-default"
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-charcoal/40" />
                                {selectedTime}
                            </button>
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
                                    Izberite storitve
                                </h2>
                                <p className="text-center text-xs text-charcoal/40 mb-8">
                                    Izberite eno ali več storitev in nadaljujte
                                </p>

                                {loadingServices ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold/30 border-t-gold" />
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="text-center py-20 text-charcoal/50">
                                        <p>Trenutno ni na voljo nobenih storitev.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {visibleBookCategories.length > 1 && (
                                            <div className="sticky top-[72px] z-30 -mx-4 px-4 bg-porcelain/85 backdrop-blur-md border-y border-dusty-rose/30">
                                                <div
                                                    ref={bookNavRef}
                                                    className="menuscroll flex gap-2 overflow-x-auto py-3"
                                                >
                                                    {visibleBookCategories.map((cat) => {
                                                        const isActive = activeBookCat === cat.id;
                                                        return (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                ref={(el) => {
                                                                    if (el) bookPillRefs.current.set(cat.id, el);
                                                                    else bookPillRefs.current.delete(cat.id);
                                                                }}
                                                                onClick={() => scrollToBookCategory(cat.id)}
                                                                className={`flex-none px-3.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
                                                                    isActive
                                                                        ? "bg-charcoal text-porcelain border-charcoal shadow-sm"
                                                                        : "bg-porcelain text-charcoal border-dusty-rose/50 hover:border-gold/50 hover:text-gold-dark"
                                                                }`}
                                                            >
                                                                {cat.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {visibleBookCategories.map((cat) => {
                                            return (
                                                <div key={cat.id} id={`book-cat-${cat.id}`} className="scroll-mt-[132px]">
                                                    {visibleBookCategories.length > 1 && (
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
                                                                            {isSelected ? "Izbrano ✓" : "+ Dodaj"}
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
                                                            {selectedServiceIds.length === 1
                                                                ? `Nadaljuj z ${selectedServiceIds.length} storitvijo`
                                                                : `Nadaljuj z ${selectedServiceIds.length} storitvami`}
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
                                        Izberite datum
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
                                        Izberite uro
                                    </h2>
                                </div>

                                <p className="text-center text-sm text-charcoal/50 mb-8 capitalize">
                                    {selectedDate && format(selectedDate, "EEEE, d. MMMM yyyy", { locale: sl })}
                                    {selectedServices.length > 0 && (
                                        <span className="text-charcoal/30 normal-case"> · {totalDuration} min skupaj</span>
                                    )}
                                </p>

                                {loadingSlots ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className="h-12 rounded-xl bg-dusty-rose/20 animate-pulse" />
                                        ))}
                                    </div>
                                ) : visibleSlots.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-12 h-12 bg-blush rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-6 h-6 text-charcoal/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-charcoal/50 mb-2">Za današnji dan ni več prostih terminov.</p>
                                        <button
                                            onClick={goBack}
                                            className="text-gold text-sm font-medium hover:underline"
                                        >
                                            ← Izberite drug datum
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {visibleSlots.map((time) => {
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

                                        {bookableVisibleCount === 0 && (
                                            <div className="text-center py-12 mt-4">
                                                <div className="w-12 h-12 bg-blush rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-6 h-6 text-charcoal/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-charcoal/50 mb-2">Za ta datum ni prostih terminov.</p>
                                                <button
                                                    onClick={goBack}
                                                    className="text-gold text-sm font-medium hover:underline"
                                                >
                                                    ← Izberite drug datum
                                                </button>
                                            </div>
                                        )}

                                        {bookableVisibleCount > 0 && bookableVisibleCount <= 4 && (
                                            <p className="text-center text-xs text-gold-dark mt-4 font-medium">
                                                Zadnji prosti termini — rezervirajte kmalu!
                                            </p>
                                        )}

                                        {/* Legend */}
                                        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-dusty-rose/20">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-porcelain border border-dusty-rose/30" />
                                                <span className="text-[10px] text-charcoal/40">Prosto</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded bg-blush-light border border-dusty-rose/15" />
                                                <span className="text-[10px] text-charcoal/40">Zasedeno</span>
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
                                        Vaši podatki
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
                                        <p className="text-charcoal/50 text-xs capitalize">
                                            {selectedDate && format(selectedDate, "EEEE, d. MMMM", { locale: sl })} <span className="normal-case">· {totalDuration} min skupaj</span>
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
                                            Ime in priimek
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
                                            placeholder="Vaše ime in priimek"
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
                                                E-pošta
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
                                                placeholder="vas@email.com"
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
                                                Telefon
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
                                            Opombe <span className="text-charcoal/30 normal-case">(neobvezno)</span>
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-blush-light border border-dusty-rose/30 outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 transition-all h-24 resize-none text-charcoal placeholder:text-charcoal/30"
                                            placeholder="Morebitne posebne zahteve, alergije ali opombe?"
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
                                                Potrjujem rezervacijo...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                Potrdi rezervacijo
                                                <span className="text-porcelain/50">·</span>
                                                <span className="text-porcelain/80">€{totalPrice}</span>
                                            </span>
                                        )}
                                    </button>

                                    {/* GDPR Art. 13 requires that the purpose of the
                                        collection is disclosed at the point of collection,
                                        not only buried in the footer. */}
                                    <p className="text-xs text-charcoal/40 text-center leading-relaxed pt-1">
                                        Z oddajo rezervacije se strinjate, da vaše ime, e-pošto in telefonsko
                                        številko uporabimo za potrditev in izvedbo termina. Več v{" "}
                                        <Link
                                            href="/zasebnost"
                                            className="text-charcoal/60 underline underline-offset-2 hover:text-gold-dark transition-colors"
                                        >
                                            politiki zasebnosti
                                        </Link>
                                        .
                                    </p>
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
                                    Rezervacija potrjena!
                                </h2>
                                <p className="text-charcoal/50 text-sm mb-8">
                                    Potrditveno sporočilo je bilo poslano na{" "}
                                    <span className="font-medium text-charcoal">{email}</span>
                                </p>

                                <div className="bg-porcelain border border-dusty-rose/30 rounded-2xl p-6 max-w-sm mx-auto mb-8 shadow-sm">
                                    {selectedServices.map((service) => (
                                        <div key={service.id} className="flex justify-between text-sm mb-1">
                                            <span className="text-charcoal">{service.name}</span>
                                            <span className="text-charcoal/50">€{service.price}</span>
                                        </div>
                                    ))}
                                    {selectedServices.length > 1 && (
                                        <div className="border-t border-dusty-rose/20 mt-2 pt-2 flex justify-between">
                                            <span className="font-bold text-charcoal text-sm">Skupaj</span>
                                            <span className="font-bold text-charcoal">€{totalPrice}</span>
                                        </div>
                                    )}
                                    <p className="text-charcoal/50 text-sm mt-3 mb-4">
                                        {totalDuration} minut · €{totalPrice}
                                    </p>
                                    <div className="flex items-center justify-center gap-3 py-3 bg-blush/50 rounded-xl text-sm font-semibold text-charcoal">
                                        <span>{selectedDate && format(selectedDate, "EEE, d. MMM yyyy", { locale: sl })}</span>
                                        <span className="text-charcoal/20">|</span>
                                        <span>{selectedTime}</span>
                                    </div>
                                    <p className="text-xs text-charcoal/40 mt-3">Rezervirano za {name}</p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <button
                                        onClick={() => router.push("/")}
                                        className="px-8 py-3 bg-charcoal text-porcelain rounded-xl font-semibold hover:bg-charcoal/90 transition-colors"
                                    >
                                        Vrnitev na prvo stran
                                    </button>
                                    <button
                                        onClick={() => {
                                            clearSavedProgress();
                                            setFromServices(false);
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
                                        Nova rezervacija
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
