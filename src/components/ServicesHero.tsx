"use client";

import { motion } from "framer-motion";

// Slovenian plural helper: [1, 2, 3–4, 5+/0]
function sloPlural(n: number, forms: [string, string, string, string]): string {
    const m = n % 100;
    if (m === 1) return forms[0];
    if (m === 2) return forms[1];
    if (m === 3 || m === 4) return forms[2];
    return forms[3];
}

export default function ServicesHero({
    categoryCount,
    serviceCount,
}: {
    categoryCount: number;
    serviceCount: number;
}) {
    const catLabel = sloPlural(categoryCount, [
        "kategorija",
        "kategoriji",
        "kategorije",
        "kategorij",
    ]);

    // Round services down to the nearest ten for a "50+" marketing feel;
    // fall back to the exact (pluralized) count for small catalogues.
    const serviceLabel =
        serviceCount >= 10
            ? `${Math.floor(serviceCount / 10) * 10}+ skrbno zasnovanih tretmajev`
            : `${serviceCount} ${sloPlural(serviceCount, [
                  "skrbno zasnovan tretma",
                  "skrbno zasnovana tretmaja",
                  "skrbno zasnovani tretmaji",
                  "skrbno zasnovanih tretmajev",
              ])}`;

    return (
        <section className="relative overflow-hidden mb-8 md:mb-10">
            {/* Animated aurora glow */}
            <div
                className="absolute inset-[-40%] -z-10 pointer-events-none animate-aurora-1"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(232,213,213,0.55), transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(212,175,55,0.14), transparent 50%), radial-gradient(ellipse 70% 50% at 50% 80%, rgba(242,230,230,0.5), transparent 60%)",
                }}
            />

            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-3xl"
                >
                    <span className="inline-flex items-center gap-3 text-gold-dark text-xs font-semibold tracking-[0.2em] uppercase mb-6">
                        <span className="w-8 h-px bg-gold/60" />
                        Naš celoten meni
                    </span>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-playfair font-bold text-charcoal leading-[1.05]">
                        Premium storitve
                    </h1>
                    {serviceCount > 0 && (
                        <p className="mt-4 text-charcoal/50 text-lg font-light max-w-xl leading-relaxed">
                            {categoryCount} {catLabel} · {serviceLabel} v osrčju Ljubljane.
                        </p>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
