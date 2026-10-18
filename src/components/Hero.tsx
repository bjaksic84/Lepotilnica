"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { RATING_SNAPSHOT } from "@/lib/reviews";
import { ONLINE_BOOKING_WINDOW } from "@/lib/site";

/**
 * Three facts a first-time visitor weighs before booking: is the salon any
 * good, can I get in, and what do they use. Kept as a description list because
 * that is what it is — label/value pairs, not decoration.
 */
function TrustStrip() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            className="mx-auto mt-16 max-w-lg"
        >
            <div className="gold-line" />
            {/* Three columns have to survive a 320px screen, so the label
                tracking and the value size both step down on mobile — at the
                desktop settings "Google ocena" alone overflows its column. */}
            <dl className="grid grid-cols-3 gap-3 pt-6 sm:gap-4">
                <div>
                    <dt className="eyebrow tracking-[0.12em] sm:tracking-[0.28em]">Google ocena</dt>
                    <dd className="mt-2 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1">
                        <span className="font-playfair text-lg leading-none text-charcoal sm:text-xl">
                            {RATING_SNAPSHOT.valueDisplay}
                        </span>
                        <span
                            className="flex gap-[2px] text-gold"
                            role="img"
                            aria-label={`${RATING_SNAPSHOT.valueDisplay} od 5 zvezdic`}
                        >
                            {Array.from({ length: 5 }, (_, i) => (
                                <svg key={i} viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
                                    <path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95L12 2.6Z" />
                                </svg>
                            ))}
                        </span>
                    </dd>
                </div>
                <div>
                    <dt className="eyebrow tracking-[0.12em] sm:tracking-[0.28em]">Naročanje</dt>
                    <dd className="mt-2 whitespace-nowrap font-playfair text-[13px] leading-tight text-charcoal tabular-nums sm:text-base">
                        {ONLINE_BOOKING_WINDOW}
                    </dd>
                </div>
                <div>
                    <dt className="eyebrow tracking-[0.12em] sm:tracking-[0.28em]">Kozmetika</dt>
                    <dd className="mt-2 font-playfair text-sm leading-tight text-charcoal sm:text-base">
                        SKEYNDOR
                    </dd>
                </div>
            </dl>
        </motion.div>
    );
}

export default function Hero() {
    return (
        <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-porcelain">
            {/* ── Faded full-bleed background image (static) ── */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/services/biab-manikura.jpeg"
                    alt=""
                    fill
                    priority
                    // DIAL 3 — softness: blur-[1px] sharper · blur-[3px] hazier
                    className="object-cover blur-[1px] scale-[1.03]"
                    sizes="100vw"
                />
                {/* DIAL 1 — overall wash. Lower % = image MORE visible (/45), higher = more faded (/70) */}
                <div className="absolute inset-0 bg-porcelain/50" />
                {/* DIAL 2 — vertical fade. First value = top, last = solid porcelain bottom (blends into page) */}
                <div className="absolute inset-0 bg-gradient-to-b from-porcelain/65 via-porcelain/35 to-porcelain" />
                {/* Soft champagne glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-40"
                    style={{ background: "var(--glow-gold)" }} />
            </div>

            <div className="relative z-10 container mx-auto px-4 pt-28 pb-20 text-center">
                <motion.span
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="inline-flex items-center gap-3 text-gold-dark text-xs font-semibold tracking-[0.2em] uppercase mb-8"
                >
                    <span className="w-8 h-px bg-gold/60" />
                    Est. 2025 — Ljubljana
                    <span className="w-8 h-px bg-gold/60" />
                </motion.span>

                {/* This h1 is the page's LCP element, so it must NOT animate from
                    opacity:0 — framer-motion server-renders the initial state, and a
                    transparent element is not counted as painted, which pushed LCP out
                    until React had hydrated. Animating only the transform keeps the
                    entrance motion while letting the text count as painted on first
                    paint (transforms also don't contribute to CLS). */}
                <motion.h1
                    initial={{ y: 24 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-playfair text-charcoal mb-8 leading-[1.05] tracking-tight [overflow-wrap:anywhere]"
                >
                    Lepotilnica
                    <span className="block font-bold text-gold-dark">by Karin</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    className="text-base sm:text-lg md:text-xl text-charcoal/70 mb-10 font-light max-w-xl mx-auto leading-relaxed"
                >
                    Profesionalna nega, prilagojena vašim željam in sodobnim trendom.
                    Poskrbimo za vaš brezhiben videz in popolno sprostitev.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6"
                >
                    <Link href="/book" className="btn-primary">
                        Rezerviraj termin
                    </Link>
                    <Link href="#services" className="link-quiet">
                        Naše storitve
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </motion.div>

                <TrustStrip />
            </div>
        </section>
    );
}
