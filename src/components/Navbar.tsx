"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 20);
    });

    return (
        <motion.nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-4 border-b border-white/20' : 'bg-transparent py-6'}`}
        >
            <div className="container mx-auto flex justify-between items-center px-4">
                <Link href="/" className="font-playfair font-bold text-2xl tracking-tighter text-gray-900 flex items-center gap-2">
                    {/* Logo Icon Logic could go here */}
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                    Lepotilnica <span className="text-yellow-600 font-light">by Karin</span>
                </Link>

                <div className="hidden md:flex space-x-8 items-center font-medium text-gray-600 text-sm tracking-wide uppercase">
                    <Link href="/" className="hover:text-yellow-600 transition-colors">Home</Link>
                    <Link href="#services" className="hover:text-yellow-600 transition-colors">Services</Link>
                    <Link href="#about" className="hover:text-yellow-600 transition-colors">About</Link>
                </div>

                <Link
                    href="/book"
                    className={`px-6 py-2.5 rounded-full font-medium transition-all transform hover:scale-105 shadow-md text-sm tracking-wide ${scrolled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
                >
                    Book Now
                </Link>
            </div>
        </motion.nav>
    );
}
