"use client";

import { motion } from "framer-motion";

export default function ServicesHero() {
    return (
        <section className="relative overflow-hidden mb-12">
            <div className="absolute top-[-20%] right-[-5%] w-[520px] h-[520px] rounded-full opacity-35 -z-10"
                style={{ background: "var(--glow-gold)" }} />

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
                </motion.div>
            </div>
        </section>
    );
}
