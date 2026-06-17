import { db } from "@/db";
import { categories, services } from "@/db/schema";
import ServicesList from "@/components/ServicesList";
import ServicesHero from "@/components/ServicesHero";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Storitve",
    description: "Odkrijte celoten meni premium lepotnih storitev — nega obraza, podaljševanje trepalnic, manikura, masaže in več v Lepotilnici by Karin v Ljubljani.",
    openGraph: {
        title: "Storitve — Lepotilnica by Karin",
        description: "Celoten meni premium lepotnih storitev v Ljubljani.",
        url: "/services",
    },
    alternates: {
        canonical: "/services",
    },
};

export default async function ServicesPage() {
    // Server-side fetching
    const allCategories = await db.select().from(categories).orderBy(categories.createdAt);
    const allServices = await db.select().from(services).orderBy(services.createdAt);

    const categoriesWithServices = allCategories.map((cat) => ({
        ...cat,
        services: allServices.filter((s) => s.categoryId === cat.id),
    }));

    return (
        <main className="min-h-screen bg-porcelain pt-32 pb-20">
            {/* Hero Section - Client Component for animations */}
            <ServicesHero />

            {/* Services List - Client Component for animations */}
            <ServicesList categories={categoriesWithServices} />

            {/* Call to Action - Static or separate component */}
            <ServicesCTA />
        </main>
    );
}

// Simple Client Components for Hero and CTA to keep page.tsx a Server Component
import Link from "next/link";

function ServicesCTA() {
    return (
        <section className="container mx-auto px-4 max-w-7xl mt-32">
            <div className="relative overflow-hidden bg-charcoal text-porcelain p-10 md:p-16 rounded-3xl">
                <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none"
                    style={{ background: "var(--glow-gold)" }} />
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-4 leading-tight">
                        Ste pripravljeni na razvajanje?
                    </h2>
                    <p className="text-porcelain/50 text-lg mb-8 font-light">
                        Rezervirajte svoj termin še danes in nam prepustite skrb za vas.
                    </p>
                    <Link
                        href="/book"
                        className="inline-flex items-center gap-2 px-10 py-4 bg-gold text-charcoal rounded-full font-bold hover:bg-gold-light transition-colors"
                    >
                        Rezerviraj termin
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}
