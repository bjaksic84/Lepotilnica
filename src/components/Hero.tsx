"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

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
            </div>
        </section>
    );
}
