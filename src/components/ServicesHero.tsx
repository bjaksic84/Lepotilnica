"use client";

import { motion } from "framer-motion";

export default function ServicesHero() {
    return (
        <section className="relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-40 -z-10"
                style={{ background: "radial-gradient(circle, rgba(232,213,213,0.5) 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-30 -z-10"
                style={{ background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)" }} />

            <div className="container mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="text-gold font-semibold tracking-[0.15em] uppercase mb-4 text-xs block">
                        Our Complete Menu
                    </span>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-playfair font-bold text-charcoal mb-6">
                        Premium Services
                    </h1>
                    <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
                </motion.div>
            </div>
        </section>
    );
}
