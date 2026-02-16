"use client";

import { motion } from "framer-motion";

export default function ServicesHero() {
    return (
        <section className="relative overflow-hidden mb-20">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-50/50 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 -z-10" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-50/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 -z-10" />

            <div className="container mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="text-yellow-600 font-bold tracking-widest uppercase mb-4 text-sm block">
                        Our Complete Menu
                    </span>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-playfair font-bold text-gray-900 mb-6">
                        Premium Services
                    </h1>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mx-auto rounded-full" />
                    <p className="mt-8 text-gray-600 text-lg md:text-xl max-w-3xl mx-auto font-light leading-relaxed">
                        Discover our curated collection of beauty and wellness treatments, each designed to deliver exceptional results and ultimate relaxation.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
