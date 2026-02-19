import { db } from "@/db";
import { categories, services } from "@/db/schema";
import ServicesList from "@/components/ServicesList";
import ServicesHero from "@/components/ServicesHero";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Services",
    description: "Browse our complete menu of premium beauty treatments — facials, lash extensions, manicures, massages, and more at Lepotilnica by Karin in Ljubljana.",
    openGraph: {
        title: "Services — Lepotilnica by Karin",
        description: "Browse our complete menu of premium beauty treatments in Ljubljana.",
        url: "https://lepotilnica.si/services",
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
        <section className="container mx-auto px-4 text-center mt-32">
            <div className="glass-panel p-12 rounded-3xl max-w-3xl mx-auto transform transition-all hover:scale-[1.02] duration-500">
                <h2 className="text-4xl font-playfair font-bold text-charcoal mb-4">
                    Ready to Experience Luxury?
                </h2>
                <p className="text-charcoal/50 text-lg mb-8 font-light">
                    Book your appointment today and let us take care of you.
                </p>
                <Link
                    href="/book"
                    className="inline-block px-12 py-4 bg-gold text-charcoal rounded-full font-bold hover:bg-gold-light transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                >
                    Book Appointment
                </Link>
            </div>
        </section>
    );
}
