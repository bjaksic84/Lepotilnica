import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page Not Found",
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <main className="min-h-screen bg-porcelain flex items-center justify-center px-4">
            <div className="text-center max-w-lg">
                <span className="text-gold font-semibold tracking-[0.15em] uppercase text-xs block mb-6">
                    Error 404
                </span>
                <h1 className="text-6xl md:text-8xl font-playfair font-bold text-charcoal mb-4">
                    404
                </h1>
                <h2 className="text-2xl md:text-3xl font-playfair text-charcoal/70 mb-6">
                    Page Not Found
                </h2>
                <p className="text-charcoal/50 text-lg leading-relaxed mb-10">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let us help you find what you need.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-8 py-3 bg-charcoal text-porcelain rounded-full font-medium hover:bg-charcoal/90 transition-all shadow-md"
                    >
                        Back to Home
                    </Link>
                    <Link
                        href="/services"
                        className="px-8 py-3 border border-dusty-rose/40 text-charcoal rounded-full font-medium hover:bg-blush transition-all"
                    >
                        View Services
                    </Link>
                    <Link
                        href="/book"
                        className="px-8 py-3 bg-gold text-charcoal rounded-full font-medium hover:bg-gold-light transition-all shadow-md"
                    >
                        Book Appointment
                    </Link>
                </div>
            </div>
        </main>
    );
}
