"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Service, Category } from "@/db/schema";

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

// Warm gradient fallbacks using the new palette
const gradients = [
    "from-dusty-rose/40 to-blush",
    "from-blush to-porcelain",
    "from-dusty-rose/30 to-porcelain",
    "from-blush/60 to-dusty-rose/20",
    "from-porcelain to-blush/40",
    "from-dusty-rose/20 to-blush/50",
];

export default function ServicesList({ categories }: { categories: CategoryWithServices[] }) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [modalService, setModalService] = useState<Service | null>(null);
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

    const toggleDescription = useCallback((catId: number) => {
        setExpandedDescriptions((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    }, []);

    const allServices = useMemo(
        () => categories.flatMap((c) => c.services),
        [categories]
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

    const toggleService = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const scrollToCategory = (catId: number) => {
        const el = document.getElementById(`category-${catId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const visibleCategories = categories.filter((c) => c.services.length > 0);

    return (
        <>
        <section className="container mx-auto px-4 max-w-7xl space-y-8">
            {/* ── Category Navigation Buttons ── */}
            {visibleCategories.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                >
                    {visibleCategories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => scrollToCategory(cat.id)}
                            className="px-5 py-2.5 rounded-full border border-dusty-rose/30 bg-porcelain text-charcoal text-sm font-medium hover:bg-blush hover:border-gold/40 hover:text-gold-dark transition-all shadow-sm hover:shadow-md"
                        >
                            {cat.name}
                        </button>
                    ))}
                </motion.div>
            )}

            {visibleCategories.map((category, catIndex) => (
                <motion.div
                    key={category.id}
                    id={`category-${category.id}`}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: catIndex * 0.1 }}
                    className="scroll-mt-32"
                >
                    {/* Category Header */}
                    <div className="mb-8 md:mb-12">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-px bg-gold" />
                            <span className="text-gold text-xs font-semibold uppercase tracking-[0.2em]">Kategorija</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-playfair font-bold text-charcoal mb-3">
                            {category.name}
                        </h2>
                        {category.description && (
                            <>
                                {/* Desktop: always visible */}
                                <p className="hidden md:block text-charcoal/50 text-lg font-light max-w-5xl leading-relaxed">
                                    {category.description}
                                </p>
                                {/* Mobile: collapsible */}
                                <div className="md:hidden">
                                    <AnimatePresence initial={false}>
                                        {expandedDescriptions.has(category.id) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-charcoal/50 text-sm font-light leading-relaxed pb-2">
                                                    {category.description}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <button
                                        onClick={() => toggleDescription(category.id)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-dark transition-colors mt-1"
                                    >
                                        <span className="w-5 h-5 rounded-full border border-gold/40 flex items-center justify-center">
                                            {expandedDescriptions.has(category.id) ? (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            )}
                                        </span>
                                        {expandedDescriptions.has(category.id) ? "Skrij opis" : "Prikaži opis"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Services Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {category.services.map((service, sIndex) => {
                            const isSelected = selectedIds.includes(service.id);
                            const selectionIndex = selectedIds.indexOf(service.id);
                            return (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: sIndex * 0.08 }}
                                    whileHover={{ y: -6 }}
                                    onClick={() => setModalService(service)}
                                    className={`bg-porcelain rounded-xl md:rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer ${
                                        isSelected
                                            ? "border-gold ring-2 ring-gold/20"
                                            : "border-dusty-rose/30"
                                    }`}
                                >
                                    {/* Image area — hidden on mobile */}
                                    <div className={`relative h-48 bg-gradient-to-br ${gradients[sIndex % gradients.length]} overflow-hidden hidden md:block`}>
                                        <Image
                                            src={getServiceImage(service.name)}
                                            alt={`${service.name} — beauty treatment at Lepotilnica by Karin`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            style={{ objectPosition: imagePositions[getServiceSlug(service.name)] || "center" }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-6xl font-playfair text-charcoal/5 font-bold select-none">
                                                {service.name.charAt(0)}
                                            </span>
                                        </div>

                                        {/* Selection badge */}
                                        {isSelected && (
                                            <span className="absolute top-3 left-3 px-2.5 py-1 bg-gold text-charcoal text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                                #{selectionIndex + 1}
                                            </span>
                                        )}

                                        {service.isPopular && (
                                            <span className="absolute top-3 right-3 px-3 py-1 bg-gold text-charcoal text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                                Popularno
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-3 md:p-6 flex flex-col flex-1">
                                        {/* Mobile-only: selection badge + popular tag */}
                                        <div className="flex items-center gap-1.5 mb-1.5 md:hidden flex-wrap">
                                            {isSelected && (
                                                <span className="px-1.5 py-0.5 bg-gold text-charcoal text-[9px] font-bold uppercase tracking-wider rounded-full flex items-center gap-0.5">
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    #{selectionIndex + 1}
                                                </span>
                                            )}
                                            {service.isPopular && (
                                                <span className="px-1.5 py-0.5 bg-gold text-charcoal text-[9px] font-bold uppercase tracking-wider rounded-full">
                                                    Popularno
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-sm md:text-xl font-playfair font-bold text-charcoal group-hover:text-gold-dark transition-colors mb-1 md:mb-2 line-clamp-2">
                                            {service.name}
                                        </h3>

                                        {service.description && (
                                            <p className="text-charcoal/50 text-xs md:text-sm leading-relaxed mb-2 md:mb-4 line-clamp-1 md:line-clamp-2 hidden md:block">
                                                {service.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-charcoal/40 mb-3 md:mb-6 mt-auto">
                                            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {service.duration} min
                                        </div>

                                        <div className="flex items-end justify-between pt-2 md:pt-4 border-t border-dusty-rose/30">
                                            <div>
                                                <span className="text-[9px] md:text-[10px] text-charcoal/40 uppercase tracking-widest font-semibold block">
                                                    Za
                                                </span>
                                                <span className="text-lg md:text-2xl font-playfair font-bold text-charcoal">
                                                    €{service.price}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleService(service.id); }}
                                                className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                                    isSelected
                                                        ? "bg-gold text-charcoal hover:bg-gold-light"
                                                        : "bg-charcoal text-porcelain group-hover:bg-gold"
                                                }`}
                                                aria-label={isSelected ? `Remove ${service.name}` : `Add ${service.name}`}
                                            >
                                                {isSelected ? (
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            ))}

        </section>

            {/* ── Floating Selection Bar (portal-level, outside section to avoid overflow clipping) ── */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto mx-auto max-w-lg bg-charcoal text-porcelain rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl border border-porcelain/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">
                                        {selectedIds.length} {selectedIds.length === 1 ? "storitev izbrana" : selectedIds.length <= 4 ? "storitve izbrane" : "storitev izbranih"}
                                    </p>
                                    <p className="text-xs text-porcelain/50">
                                        €{totalPrice} · {totalDuration} min
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="p-2 rounded-full hover:bg-porcelain/10 transition-colors text-porcelain/50 hover:text-porcelain shrink-0"
                                    aria-label="Clear selection"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <Link
                                    href={`/book?services=${selectedIds.join(",")}`}
                                    className="shrink-0 px-5 py-2.5 bg-gold text-charcoal rounded-full font-bold text-sm hover:bg-gold-light transition-all shadow-lg whitespace-nowrap"
                                >
                                    Rezerviraj →
                                </Link>
                            </div>
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
                                    alt={`${modalService.name} — beauty treatment at Lepotilnica by Karin`}
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
                                    aria-label="Close"
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
