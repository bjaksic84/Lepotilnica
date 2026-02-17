"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 20);
    });

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3 border-b border-gray-100' : 'bg-transparent py-5'}`}
            >
                <div className="container mx-auto flex justify-between items-center px-4">
                    <Link href="/" className="flex items-center gap-3 group">
                        {/* Logo placeholder — replace /logo.png with your actual logo */}
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-900 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                            <Image
                                src="/logo.png"
                                alt="Lepotilnica by Karin"
                                width={40}
                                height={40}
                                className="object-cover"
                                onError={(e) => {
                                    // Fallback if logo.png doesn't exist yet
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            <span className="hidden absolute inset-0 flex items-center justify-center text-white font-playfair text-lg font-bold">L</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-playfair font-bold text-lg tracking-tight text-gray-900 leading-tight">
                                Lepotilnica
                            </span>
                            <span className="text-[10px] text-yellow-600 uppercase tracking-[0.2em] font-bold leading-tight">
                                by Karin
                            </span>
                        </div>
                    </Link>

                    <div className="hidden md:flex space-x-8 items-center font-medium text-gray-600 text-sm tracking-wide uppercase">
                        <Link href="/" className="hover:text-gray-900 transition-colors relative group">
                            Home
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link href="/services" className="hover:text-gray-900 transition-colors relative group">
                            Services
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link href="/#about" className="hover:text-gray-900 transition-colors relative group">
                            About
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/book"
                            className={`hidden md:inline-flex px-6 py-2.5 rounded-full font-medium transition-all transform hover:scale-105 shadow-md text-sm tracking-wide ${scrolled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
                        >
                            Book Now
                        </Link>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed inset-x-0 top-[60px] z-40 md:hidden bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-lg"
                    >
                        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
                            <Link href="/" className="text-gray-900 font-medium py-2 hover:text-yellow-600 transition-colors" onClick={() => setMobileOpen(false)}>Home</Link>
                            <Link href="/services" className="text-gray-900 font-medium py-2 hover:text-yellow-600 transition-colors" onClick={() => setMobileOpen(false)}>Services</Link>
                            <Link href="/#about" className="text-gray-900 font-medium py-2 hover:text-yellow-600 transition-colors" onClick={() => setMobileOpen(false)}>About</Link>
                            <Link href="/book" className="btn-primary text-center mt-2" onClick={() => setMobileOpen(false)}>Book Now</Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
