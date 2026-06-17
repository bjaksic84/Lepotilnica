"use client";

import Image from "next/image";
import Link from "next/link";

const QUICK_LINKS = [
    { label: "Storitve", href: "/services" },
    { label: "Rezerviraj", href: "/book" },
    { label: "Naša zgodba", href: "/#about" },
];

const HOURS = [
    { day: "Pon — Čet", time: "9:00 — 20:00" },
    { day: "Petek", time: "9:00 — 18:00" },
    { day: "Sobota", time: "10:00 — 18:00" },
    { day: "Nedelja", time: "Zaprto", closed: true },
];

export default function Footer() {
    return (
        <footer className="bg-charcoal text-porcelain/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

            <div className="container mx-auto px-4 py-16 max-w-5xl flex flex-col items-center text-center">
                {/* ── Brand ── */}
                <Link href="/" className="inline-flex flex-col items-center gap-3 mb-5 group">
                    <div className="bg-porcelain/95 rounded-xl p-2">
                        <Image
                            src="/logo.png"
                            alt="Lepotilnica by Karin"
                            width={56}
                            height={56}
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                    <span className="font-playfair text-xl text-porcelain leading-tight">
                        Lepotilnica <span className="text-gold">by Karin</span>
                    </span>
                </Link>
                <p className="text-sm leading-relaxed text-porcelain/40 max-w-md mb-8">
                    Sodobna estetika in strokovna nega v osrčju Ljubljane.
                </p>

                <Link
                    href="/book"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-charcoal rounded-full text-sm font-semibold hover:bg-gold-light transition-colors mb-12"
                >
                    Rezerviraj termin
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>

                <div className="w-full h-px bg-porcelain/10 mb-12" />

                {/* ── Info: contact · hours · links ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 w-full text-center">
                    {/* Contact */}
                    <div className="flex flex-col items-center">
                        <h4 className="text-porcelain text-xs font-bold uppercase tracking-[0.15em] mb-5">Obiščite nas</h4>
                        <ul className="space-y-3 text-sm">
                            <li>Poljanski nasip 6<br />1000 Ljubljana</li>
                            <li><a href="tel:+38640774429" className="hover:text-gold transition-colors">+386 40 774 429</a></li>
                            <li><a href="mailto:info@lepotilnica.si" className="hover:text-gold transition-colors">info@lepotilnica.si</a></li>
                        </ul>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                        <h4 className="text-porcelain text-xs font-bold uppercase tracking-[0.15em] mb-5">Delovni čas</h4>
                        <ul className="space-y-3 text-sm w-full max-w-[220px]">
                            {HOURS.map((h) => (
                                <li key={h.day} className="flex justify-between gap-4">
                                    <span>{h.day}</span>
                                    <span className={h.closed ? "text-porcelain/30" : "text-porcelain font-medium"}>{h.time}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Links */}
                    <div className="flex flex-col items-center">
                        <h4 className="text-porcelain text-xs font-bold uppercase tracking-[0.15em] mb-5">Povezave</h4>
                        <ul className="space-y-3 text-sm">
                            {QUICK_LINKS.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-porcelain/40 hover:text-gold transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* ── Social ── */}
                <div className="flex items-center justify-center gap-3 mt-12">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-porcelain/5 border border-porcelain/10 flex items-center justify-center hover:bg-gold/20 hover:border-gold/30 transition-all group" aria-label="Instagram">
                        <svg className="w-4 h-4 text-porcelain/40 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    </a>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-porcelain/5 border border-porcelain/10 flex items-center justify-center hover:bg-gold/20 hover:border-gold/30 transition-all group" aria-label="Facebook">
                        <svg className="w-4 h-4 text-porcelain/40 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    </a>
                </div>

                {/* ── Bottom bar ── */}
                <div className="w-full border-t border-porcelain/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-porcelain/30">
                        &copy; {new Date().getFullYear()} Lepotilnica by Karin. Vse pravice pridržane.
                    </p>
                    <p className="text-xs text-porcelain/20">Skrbno ustvarjeno v Ljubljani</p>
                </div>
            </div>
        </footer>
    );
}
