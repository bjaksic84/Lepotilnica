"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Section config ─────────────────────────────────────
   The dashboard's Calendar / Bookings / Analytics live as tabs on /admin
   (driven by ?tab=), while Services and Logs are their own routes. The drawer
   unifies all five into one nav.

   This is chrome only — it renders the fixed top bar + drawer as a SIBLING of
   the page content (not a wrapper), so page content keeps rendering on the
   server while only this chrome defers to the client (it reads the search
   params for the active-tab highlight). */

type Section = {
    key: string;
    label: string;
    href: string;
    path: string; // pathname this section lives on
    tab?: string; // for the /admin tabs, which ?tab= value
    icon: React.ReactNode;
};

const icon = (d: string) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
);

const SECTIONS: Section[] = [
    { key: "calendar", label: "Calendar", href: "/admin?tab=calendar", path: "/admin", tab: "calendar", icon: icon("M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z") },
    { key: "list", label: "Bookings", href: "/admin?tab=list", path: "/admin", tab: "list", icon: icon("M4 6h16M4 10h16M4 14h16M4 18h16") },
    { key: "stats", label: "Analytics", href: "/admin?tab=stats", path: "/admin", tab: "stats", icon: icon("M3 3v18h18M8 17V9m5 8V5m5 12v-6") },
    { key: "services", label: "Services", href: "/admin/services", path: "/admin/services", icon: icon("M9.879 7.519A3 3 0 106.5 12h11a3 3 0 10-3.379-4.481M6.5 12l11 0M8 20l3-8m5 8l-3-8") },
    { key: "logs", label: "Logs", href: "/admin/logs", path: "/admin/logs", icon: icon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z") },
];

export default function AdminChrome() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const currentTab = searchParams.get("tab") || "calendar";

    const isActive = (s: Section) => {
        if (pathname !== s.path) return false;
        if (s.tab) return currentTab === s.tab;
        return true;
    };

    // Lock body scroll + allow Esc to close while the drawer is open.
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            // Even if the request fails, send them to the login screen.
        }
        router.push("/admin/login");
    };

    // The login screen gets no dashboard chrome.
    if (pathname === "/admin/login") return null;

    return (
        <>
            {/* ── Top bar (fixed; pages carry pt-24 to clear it) ── */}
            <header className="fixed top-0 inset-x-0 z-40 h-16 bg-white border-b border-gray-100 shadow-sm">
                <div className="h-full container mx-auto max-w-7xl px-4 flex items-center justify-between">
                    <Link href="/admin?tab=calendar" className="flex items-baseline gap-2">
                        <span className="font-playfair text-xl font-bold text-gray-900">Lepotilnica</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-600">Admin</span>
                    </Link>
                    <button
                        onClick={() => setOpen(true)}
                        aria-label="Odpri meni"
                        aria-expanded={open}
                        className="p-2.5 -mr-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ── Drawer ── */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 360, damping: 38 }}
                            className="fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col"
                        >
                            <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100">
                                <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Menu</span>
                                <button
                                    onClick={() => setOpen(false)}
                                    aria-label="Zapri meni"
                                    className="p-2 -mr-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                                {SECTIONS.map((s) => {
                                    const active = isActive(s);
                                    return (
                                        <Link
                                            key={s.key}
                                            href={s.href}
                                            onClick={() => setOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                                                active
                                                    ? "bg-gray-900 text-white shadow-sm"
                                                    : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                        >
                                            <span className={active ? "text-yellow-400" : "text-gray-400"}>{s.icon}</span>
                                            {s.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="p-3 border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                                >
                                    <span className="text-gray-400">
                                        {icon("M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1")}
                                    </span>
                                    {loggingOut ? "Odjava ..." : "Logout"}
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
