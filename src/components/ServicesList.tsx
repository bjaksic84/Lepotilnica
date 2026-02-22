"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Service, Category } from "@/db/schema";

type CategoryWithServices = Category & {
    services: Service[];
};

function getServiceImage(serviceName: string): string {
    const slug = serviceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/services/${slug}.jpg`;
}

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
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-px bg-gold" />
                            <span className="text-gold text-xs font-semibold uppercase tracking-[0.2em]">Kategorija</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-playfair font-bold text-charcoal mb-3">
                            {category.name}
                        </h2>
                        {category.description && (
                            <p className="text-charcoal/50 text-lg font-light max-w-5xl leading-relaxed">
                                {category.description}
                            </p>
                        )}
                    </div>

                    {/* Services Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    className={`bg-porcelain rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col ${
                                        isSelected
                                            ? "border-gold ring-2 ring-gold/20"
                                            : "border-dusty-rose/30"
                                    }`}
                                >
                                    {/* Image area */}
                                    <div className={`relative h-48 bg-gradient-to-br ${gradients[sIndex % gradients.length]} overflow-hidden`}>
                                        <Image
                                            src={getServiceImage(service.name)}
                                            alt={`${service.name} — beauty treatment at Lepotilnica by Karin`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-xl font-playfair font-bold text-charcoal group-hover:text-gold-dark transition-colors mb-2">
                                            {service.name}
                                        </h3>

                                        {service.description && (
                                            <p className="text-charcoal/50 text-sm leading-relaxed mb-4 line-clamp-2">
                                                {service.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2 text-xs text-charcoal/40 mb-6 mt-auto">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {service.duration} min
                                        </div>

                                        <div className="flex items-end justify-between pt-4 border-t border-dusty-rose/30">
                                            <div>
                                                <span className="text-[10px] text-charcoal/40 uppercase tracking-widest font-semibold block">
                                                    Za
                                                </span>
                                                <span className="text-2xl font-playfair font-bold text-charcoal">
                                                    €{service.price}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => toggleService(service.id)}
                                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                                    isSelected
                                                        ? "bg-gold text-charcoal hover:bg-gold-light"
                                                        : "bg-charcoal text-porcelain group-hover:bg-gold"
                                                }`}
                                                aria-label={isSelected ? `Remove ${service.name}` : `Add ${service.name}`}
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
        </>
    );
}
