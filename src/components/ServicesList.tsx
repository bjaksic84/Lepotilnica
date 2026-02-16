"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Service, Category } from "@/db/schema";

type CategoryWithServices = Category & {
    services: Service[];
};

export default function ServicesList({ categories }: { categories: CategoryWithServices[] }) {
    return (
        <section className="container mx-auto px-4 max-w-7xl space-y-20">
            {categories.map((category, catIndex) => {
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
                                            href={`/book?service=${service.id}`}
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
    );
}
