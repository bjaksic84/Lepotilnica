"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/#about", label: "About" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 20);
    });

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
                    scrolled
                        ? "bg-porcelain/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(232,213,213,0.5)] py-3"
                        : "bg-transparent py-5"
                }`}
            >
                <div className="container mx-auto flex justify-between items-center px-4">
                    <Link href="/" className="flex items-center gap-3 group">
                        {/* Logo */}
                        <Image
                            src="/logo.png"
                            alt="Lepotilnica by Karin"
                            width={56}
                            height={56}
                            className="h-12 w-auto object-contain"
                            priority
                        />
                        <div className="flex flex-col">
                            <span className="font-playfair font-bold text-lg tracking-tight text-charcoal leading-tight">
                                Lepotilnica
                            </span>
                            <span className="text-[10px] text-gold uppercase tracking-[0.2em] font-semibold leading-tight">
                                by Karin
                            </span>
                        </div>
                    </Link>

                    <div className="hidden md:flex space-x-8 items-center font-medium text-charcoal/60 text-sm tracking-wide uppercase">
                        {NAV_LINKS.map((link) => {
                            const isActive = link.href === "/"
                                ? pathname === "/"
                                : pathname.startsWith(link.href.replace("/#", "/"));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`transition-colors relative group ${
                                        isActive ? "text-charcoal" : "hover:text-charcoal"
                                    }`}
                                >
                                    {link.label}
                                    <span
                                        className={`absolute -bottom-1 left-0 h-px bg-gold transition-all duration-300 ${
                                            isActive ? "w-full" : "w-0 group-hover:w-full"
                                        }`}
                                    />
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/book"
                            className={`hidden md:inline-flex px-6 py-2.5 rounded-full font-medium transition-all transform hover:scale-[1.03] shadow-md text-sm tracking-wide ${
                                scrolled
                                    ? "bg-charcoal text-porcelain hover:bg-charcoal/90"
                                    : "bg-porcelain text-charcoal hover:bg-blush"
                            }`}
                        >
                            Book Now
                        </Link>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 text-charcoal/70 hover:bg-blush rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
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
                        className="fixed inset-x-0 top-[64px] z-40 md:hidden bg-porcelain/95 backdrop-blur-xl border-b border-dusty-rose/30 shadow-lg"
                    >
                        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
                            {NAV_LINKS.map((link) => {
                                const isActive = link.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(link.href.replace("/#", "/"));
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`font-medium py-2 transition-colors ${
                                            isActive ? "text-gold" : "text-charcoal hover:text-gold"
                                        }`}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <Link
                                href="/book"
                                className="btn-primary text-center mt-2"
                                onClick={() => setMobileOpen(false)}
                            >
                                Book Now
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
