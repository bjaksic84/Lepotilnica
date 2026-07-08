"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Service, Category } from "@/db/schema";
import { syncServiceSelection } from "@/lib/booking-storage";

type CategoryWithServices = Category & {
    services: Service[];
};

function getServiceImage(serviceName: string): string {
    const slug = serviceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/services/${slug}.jpeg`;
}

function getServiceSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Per-service image crop adjustments
const imagePositions: Record<string, string> = {
    "pedikura-s-permanentnim-lakiranjem": "center 80%",
};

// Slovenian plural helper for the selection counter: [1, 2, 3–4, 5+/0]
function selectedLabel(n: number): string {
    const m = n % 100;
    if (m === 1) return "izbrana";
    return "izbranih";
}

export default function ServicesList({
    categories,
    initialSelectedIds = [],
}: {
    categories: CategoryWithServices[];
    // Pre-selected services when the user returns from the booking flow
    // (back arrow on booking step 2 sends them here as /services?selected=1,2).
    initialSelectedIds?: number[];
}) {
    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
    const [modalService, setModalService] = useState<Service | null>(null);
    const [activeCat, setActiveCat] = useState<number | null>(null);

    const visibleCategories = useMemo(
        () => categories.filter((c) => c.services.length > 0),
        [categories]
    );

    const allServices = useMemo(
        () => visibleCategories.flatMap((c) => c.services),
        [visibleCategories]
    );

    const selectedServices = useMemo(
        () => selectedIds.map((id) => allServices.find((s) => s.id === id)).filter(Boolean) as Service[],
        [selectedIds, allServices]
    );

    const totalPrice = useMemo(
        () => selectedServices.reduce((sum, s) => sum + s.price, 0),
        [selectedServices]
    );

    const totalDuration = useMemo(
        () => selectedServices.reduce((sum, s) => sum + s.duration, 0),
        [selectedServices]
    );

    const toggleService = useCallback((id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }, []);

    // Keep the URL's ?selected= param in sync with the live selection, so a manual
    // refresh restores exactly what's selected now — and a manual removal actually
    // sticks. Uses history.replaceState to avoid a server round-trip on each toggle.
    //
    // Also mirror the selection into the shared booking store so re-entering the
    // flow via the navbar "Rezerviraj" (which carries no params) reflects the
    // latest selection instead of a stale snapshot. We skip the initial render
    // when it starts empty, so opening /services with no ?selected doesn't clobber
    // an unrelated in-progress booking.
    const prevSyncedIds = useRef<number[] | null>(null);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (selectedIds.length > 0) params.set("selected", selectedIds.join(","));
        else params.delete("selected");
        const qs = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);

        const prev = prevSyncedIds.current;
        prevSyncedIds.current = selectedIds;
        // Only write an empty selection when the user actually cleared a
        // previously non-empty one — so opening /services with nothing selected
        // never clobbers an unrelated in-progress booking (and dev StrictMode's
        // double-invoke stays a no-op).
        const wasNonEmpty = prev !== null && prev.length > 0;
        if (selectedIds.length === 0 && !wasNonEmpty) return;
        syncServiceSelection(selectedIds);
    }, [selectedIds]);

    const scrollToCategory = useCallback((catId: number) => {
        const el = document.getElementById(`category-${catId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    // ── Scroll-spy: highlight the category currently in view ──
    const navRef = useRef<HTMLDivElement>(null);
    const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    useEffect(() => {
        if (visibleCategories.length < 2) return;
        const setActive = () => {
            let current = visibleCategories[0].id;
            for (const cat of visibleCategories) {
                const el = document.getElementById(`category-${cat.id}`);
                if (el && el.getBoundingClientRect().top - 160 <= 0) current = cat.id;
            }
            setActiveCat(current);
        };
        setActive();
        window.addEventListener("scroll", setActive, { passive: true });
        return () => window.removeEventListener("scroll", setActive);
    }, [visibleCategories]);

    // Keep the active pill scrolled into view within the horizontal nav
    useEffect(() => {
        if (activeCat == null) return;
        const pill = pillRefs.current.get(activeCat);
        const nav = navRef.current;
        if (!pill || !nav) return;
        const pl = pill.offsetLeft;
        const pr = pl + pill.offsetWidth;
        if (pl < nav.scrollLeft || pr > nav.scrollLeft + nav.clientWidth) {
            nav.scrollTo({ left: Math.max(0, pl - 20), behavior: "smooth" });
        }
    }, [activeCat]);

    return (
        <>
            {/* ── Sticky Category Navigation ── */}
            {visibleCategories.length > 1 && (
                <div className="sticky top-[68px] z-30 -mt-2 mb-8 bg-porcelain/85 backdrop-blur-md border-y border-dusty-rose/40">
                    <div
                        ref={navRef}
                        className="menuscroll flex gap-2 overflow-x-auto container mx-auto max-w-7xl px-4 py-3.5"
                    >
                        {visibleCategories.map((cat) => {
                            const isActive = activeCat === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    ref={(el) => {
                                        if (el) pillRefs.current.set(cat.id, el);
                                        else pillRefs.current.delete(cat.id);
                                    }}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className={`flex-none px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
                                        isActive
                                            ? "bg-charcoal text-porcelain border-charcoal shadow-sm"
                                            : "bg-porcelain text-charcoal border-dusty-rose/60 hover:border-gold/50 hover:text-gold-dark"
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Category Sections ── */}
            <section className="container mx-auto px-4 max-w-7xl">
                {visibleCategories.map((category, catIndex) => (
                    <motion.div
                        key={category.id}
                        id={`category-${category.id}`}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.6 }}
                        className="grid md:grid-cols-[280px_1fr] gap-6 md:gap-11 items-start py-8 md:py-12 border-b border-dusty-rose/40 scroll-mt-[150px]"
                    >
                        {/* Category header — sticky on desktop */}
                        <div className="md:sticky md:top-[150px]">
                            <div className="font-playfair font-bold leading-none text-gold/25 text-5xl md:text-6xl">
                                {String(catIndex + 1).padStart(2, "0")}
                            </div>
                            <div className="w-8 h-0.5 bg-gold my-3 md:my-4" />
                            <h2 className="text-3xl md:text-4xl font-playfair font-bold text-charcoal mb-3 leading-[1.05]">
                                {category.name}
                            </h2>
                            {category.description && (
                                <p className="text-charcoal/55 text-sm font-light leading-relaxed mb-4 max-w-md">
                                    {category.description}
                                </p>
                            )}
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
                                {category.services.length} storitev
                            </div>
                        </div>

                        {/* Service rows */}
                        <div>
                            {category.services.map((service) => {
                                const isSelected = selectedIds.includes(service.id);
                                return (
                                    <div
                                        key={service.id}
                                        onClick={() => setModalService(service)}
                                        className="group flex items-center gap-1.5 px-2 md:px-3 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-dusty-rose/20"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[15px] md:text-base text-charcoal group-hover:text-gold-dark transition-colors">
                                                    {service.name}
                                                </span>
                                                {service.isPopular && (
                                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-gold-dark border border-gold/50 px-1.5 py-0.5 rounded-full">
                                                        Popularno
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-charcoal/40 mt-1.5">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {service.duration} min
                                            </div>
                                        </div>

                                        {/* Dotted leader — desktop only */}
                                        <span className="hidden md:block flex-1 border-b border-dotted border-charcoal/25 translate-y-[6px] mx-2" />

                                        <span className="font-playfair font-bold text-lg md:text-xl text-charcoal whitespace-nowrap">
                                            €{service.price}
                                        </span>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleService(service.id); }}
                                            className={`ml-2 w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all shadow-sm hover:scale-110 ${
                                                isSelected
                                                    ? "bg-gold text-charcoal"
                                                    : "bg-charcoal text-porcelain group-hover:bg-gold group-hover:text-charcoal"
                                            }`}
                                            aria-label={isSelected ? `Odstrani ${service.name}` : `Dodaj ${service.name}`}
                                        >
                                            {isSelected ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* ── Floating Selection Bar ── */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto mx-auto w-fit max-w-[calc(100vw-32px)] flex items-center gap-3 sm:gap-4 bg-charcoal text-porcelain rounded-full pl-5 pr-2 py-2 shadow-2xl border border-gold/30">
                            <span className="text-sm font-semibold truncate">
                                {selectedIds.length} {selectedLabel(selectedIds.length)} · €{totalPrice} · {totalDuration} min
                            </span>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-sm text-porcelain/60 hover:text-porcelain transition-colors shrink-0"
                            >
                                Počisti
                            </button>
                            <Link
                                href={`/book?services=${selectedIds.join(",")}`}
                                className="shrink-0 px-5 py-2.5 bg-gold text-charcoal rounded-full font-bold text-sm hover:bg-gold-light transition-all shadow-lg whitespace-nowrap"
                            >
                                Rezerviraj →
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Service Detail Modal ── */}
            <AnimatePresence>
                {modalService && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm"
                        onClick={() => setModalService(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="bg-porcelain rounded-2xl overflow-hidden max-w-md w-full shadow-2xl border border-dusty-rose/30"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal image */}
                            <div className="relative h-52 bg-gradient-to-br from-dusty-rose/40 to-blush overflow-hidden">
                                <Image
                                    src={getServiceImage(modalService.name)}
                                    alt={`${modalService.name} — lepotni tretma v Lepotilnici by Karin`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 400px"
                                    style={{ objectPosition: imagePositions[getServiceSlug(modalService.name)] || "center" }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-7xl font-playfair text-white/10 font-bold select-none">
                                        {modalService.name.charAt(0)}
                                    </span>
                                </div>
                                {modalService.isPopular && (
                                    <span className="absolute top-3 right-3 px-3 py-1 bg-gold text-charcoal text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                        Popularno
                                    </span>
                                )}
                                <button
                                    onClick={() => setModalService(null)}
                                    className="absolute top-3 left-3 w-8 h-8 bg-charcoal/60 backdrop-blur-sm rounded-full flex items-center justify-center text-porcelain hover:bg-charcoal/80 transition-colors"
                                    aria-label="Zapri"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal content */}
                            <div className="p-6">
                                <h3 className="text-2xl font-playfair font-bold text-charcoal mb-2">
                                    {modalService.name}
                                </h3>

                                {modalService.description && (
                                    <p className="text-charcoal/60 text-sm leading-relaxed mb-4">
                                        {modalService.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-sm text-charcoal/50 mb-6">
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {modalService.duration} min
                                    </div>
                                    <div className="text-xl font-playfair font-bold text-charcoal">
                                        €{modalService.price}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        toggleService(modalService.id);
                                        setModalService(null);
                                    }}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                                        selectedIds.includes(modalService.id)
                                            ? "bg-gold text-charcoal hover:bg-gold-light"
                                            : "bg-charcoal text-porcelain hover:bg-charcoal/90"
                                    }`}
                                >
                                    {selectedIds.includes(modalService.id) ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Odstrani iz izbora
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Dodaj v izbor
                                        </span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
