"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-porcelain">
            {/* ── Aurora Mesh Background ── */}
            <div className="absolute inset-0 z-0">
                {/* Base warm gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-porcelain via-blush-light to-porcelain" />
                {/* Floating aurora orbs */}
                <motion.div
                    className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full opacity-40"
                    style={{
                        background: "radial-gradient(circle, rgba(232,213,213,0.6) 0%, transparent 70%)",
                    }}
                    animate={{
                        x: [0, 80, 0],
                        y: [0, 40, 0],
                        scale: [1, 1.08, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute top-[15%] right-[-15%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full opacity-30"
                    style={{
                        background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
                    }}
                    animate={{
                        x: [0, -70, 0],
                        y: [0, -40, 0],
                        scale: [1, 1.12, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-[-10%] left-[15%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full opacity-35"
                    style={{
                        background: "radial-gradient(circle, rgba(242,230,230,0.5) 0%, transparent 65%)",
                    }}
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -35, 0],
                        scale: [1, 1.06, 1],
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Soft champagne glow in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[100px]"
                    style={{ background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)" }}
                />
            </div>

            {/* Glass Panel Content */}
            <div className="relative z-10 px-4 max-w-5xl mx-auto w-full pt-20 md:pt-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-center p-6 sm:p-8 md:p-16 rounded-3xl"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6"
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full border border-gold/30 bg-blush/50 text-gold-dark text-xs font-semibold tracking-[0.15em] uppercase backdrop-blur-sm">
                            Est. 2025
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-playfair font-bold text-charcoal mb-6 md:mb-8 leading-[1.1] tracking-tight"
                    >
                        Discover Your <br />
                        <span className="text-gold-gradient">
                            True Radiance
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                        className="text-base sm:text-lg md:text-xl text-charcoal/60 mb-10 md:mb-12 font-light max-w-2xl mx-auto leading-relaxed"
                    >
                        Experience premium beauty treatments in a sanctuary of elegance.
                        Where advanced techniques meet timeless relaxation.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center"
                    >
                        <Link href="/book" className="btn-primary">
                            Book Appointment
                        </Link>
                        <Link href="#services" className="btn-secondary">
                            View Services
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-8 md:bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
            >
                <span className="text-[10px] uppercase tracking-[0.2em] text-charcoal/30 font-medium">Scroll</span>
                <div className="w-px h-10 bg-gradient-to-b from-gold/40 to-transparent" />
            </motion.div>
        </section>
    );
}
