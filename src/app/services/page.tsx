"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Category = {
    id: number;
    name: string;
    description: string | null;
};

type Service = {
    id: number;
    categoryId: number;
    name: string;
    description: string | null;
    price: number;
    duration: number;
    isPopular: boolean;
};

type CategoryWithServices = {
    id: number;
    name: string;
    description: string | null;
    services: Service[];
};

export default function ServicesPage() {
    const [categoriesWithServices, setCategoriesWithServices] = useState<CategoryWithServices[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/services")
            .then((res) => res.json())
            .then((data) => {
                setCategoriesWithServices(data);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white pt-32 pb-20">
            {/* Hero Section */}
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
                        <h1 className="text-6xl md:text-7xl font-playfair font-bold text-gray-900 mb-6">
                            Premium Services
                        </h1>
                        <div className="w-24 h-1.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mx-auto rounded-full" />
                        <p className="mt-8 text-gray-600 text-xl max-w-3xl mx-auto font-light leading-relaxed">
                            Discover our curated collection of beauty and wellness treatments, each designed to deliver exceptional results and ultimate relaxation.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Services by Category */}
            <section className="container mx-auto px-4 max-w-7xl space-y-20">
                {categoriesWithServices.map((category, catIndex) => {
                    if (category.services.length === 0) return null;

                    return (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: catIndex * 0.1 }}
                        >
                            {/* Category Header */}
                            <div className="mb-10">
                                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-gray-900 mb-3">
                                    {category.name}
                                </h2>
                                {category.description && (
                                    <p className="text-gray-600 text-lg font-light max-w-3xl">
                                        {category.description}
                                    </p>
                                )}
                                <div className="w-16 h-1 bg-yellow-500 mt-4 rounded-full" />
                            </div>

                            {/* Services Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {category.services.map((service, sIndex) => (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: sIndex * 0.1 }}
                                        whileHover={{ y: -8 }}
                                        className="glass-card p-8 rounded-[2rem] group flex flex-col"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <h3 className="text-2xl font-playfair font-bold text-gray-900 group-hover:text-yellow-700 transition-colors">
                                                {service.name}
                                            </h3>
                                            {service.isPopular && (
                                                <span className="shrink-0 px-3 py-1 bg-yellow-500 text-white text-xs font-bold uppercase tracking-wide rounded-full shadow-md mt-1">
                                                    Popular
                                                </span>
                                            )}
                                        </div>

                                        {service.description && (
                                            <p className="text-gray-600 mb-6 leading-relaxed font-light">
                                                {service.description}
                                            </p>
                                        )}

                                        <div className="flex items-end justify-between border-t border-gray-100 pt-6 mt-auto">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">
                                                    From
                                                </span>
                                                <span className="text-3xl font-playfair font-bold text-gray-900">
                                                    €{service.price}
                                                </span>
                                                <span className="text-xs text-gray-400 mt-1">
                                                    {service.duration} minutes
                                                </span>
                                            </div>
                                            <Link
                                                href="/book"
                                                className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white group-hover:bg-yellow-500 transition-colors shadow-lg"
                                            >
                                                <svg
                                                    className="w-5 h-5 -rotate-45"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                                                    />
                                                </svg>
                                            </Link>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </section>

            {/* Call to Action */}
            <section className="container mx-auto px-4 text-center mt-32">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="glass-panel p-12 rounded-3xl max-w-3xl mx-auto"
                >
                    <h2 className="text-4xl font-playfair font-bold text-gray-900 mb-4">
                        Ready to Experience Luxury?
                    </h2>
                    <p className="text-gray-600 text-lg mb-8 font-light">
                        Book your appointment today and let us take care of you.
                    </p>
                    <Link
                        href="/book"
                        className="inline-block px-12 py-4 bg-yellow-500 text-gray-900 rounded-full font-bold hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                    >
                        Book Appointment
                    </Link>
                </motion.div>
            </section>
        </main>
    );
}
