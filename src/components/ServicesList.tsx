"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Service, Category } from "@/db/schema";

type CategoryWithServices = Category & {
    services: Service[];
};

// Map service names to placeholder image paths
// Replace these with actual photos from the salon owner
function getServiceImage(serviceName: string): string {
    // Look for custom images in /public/services/ — e.g., /services/lash-extensions.jpg
    const slug = serviceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/services/${slug}.jpg`;
}

// Soft gradient fallback colors for services without images
const gradients = [
    "from-pink-100 to-rose-50",
    "from-amber-50 to-yellow-100",
    "from-violet-50 to-purple-100",
    "from-sky-50 to-blue-100",
    "from-emerald-50 to-teal-100",
    "from-orange-50 to-amber-100",
];

export default function ServicesList({ categories }: { categories: CategoryWithServices[] }) {
    return (
        <section className="container mx-auto px-4 max-w-7xl space-y-24">
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
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-[2px] bg-yellow-500 rounded-full" />
                                <span className="text-yellow-600 text-xs font-bold uppercase tracking-[0.2em]">Category</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-playfair font-bold text-gray-900 mb-3">
                                {category.name}
                            </h2>
                            {category.description && (
                                <p className="text-gray-500 text-lg font-light max-w-3xl leading-relaxed">
                                    {category.description}
                                </p>
                            )}
                        </div>

                        {/* Services Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {category.services.map((service, sIndex) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: sIndex * 0.08 }}
                                    whileHover={{ y: -6 }}
                                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
                                >
                                    {/* Image area — placeholder until salon owner provides photos */}
                                    <div className={`relative h-48 bg-gradient-to-br ${gradients[sIndex % gradients.length]} overflow-hidden`}>
                                        <Image
                                            src={getServiceImage(service.name)}
                                            alt={`${service.name} — beauty treatment at Lepotilnica by Karin`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            onError={(e) => {
                                                // Hide broken image, gradient fallback shows through
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        {/* Overlay gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Placeholder content when no image */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-6xl font-playfair text-white/10 font-bold select-none">
                                                {service.name.charAt(0)}
                                            </span>
                                        </div>

                                        {service.isPopular && (
                                            <span className="absolute top-3 right-3 px-3 py-1 bg-yellow-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                                Popular
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-xl font-playfair font-bold text-gray-900 group-hover:text-yellow-700 transition-colors mb-2">
                                            {service.name}
                                        </h3>

                                        {service.description && (
                                            <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
                                                {service.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 mt-auto">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {service.duration} minutes
                                        </div>

                                        <div className="flex items-end justify-between pt-4 border-t border-gray-100">
                                            <div>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">
                                                    From
                                                </span>
                                                <span className="text-2xl font-playfair font-bold text-gray-900">
                                                    €{service.price}
                                                </span>
                                            </div>
                                            <Link
                                                href={`/book?service=${service.id}`}
                                                className="w-11 h-11 bg-gray-900 rounded-full flex items-center justify-center text-white group-hover:bg-yellow-500 transition-colors shadow-lg"
                                                aria-label={`Book ${service.name}`}
                                            >
                                                <svg
                                                    className="w-4 h-4 -rotate-45"
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
