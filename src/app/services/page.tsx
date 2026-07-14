import { db } from "@/db";
import { categories, services } from "@/db/schema";
import ServicesList from "@/components/ServicesList";
import ServicesHero from "@/components/ServicesHero";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
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

export default async function ServicesPage({
    searchParams,
}: {
    searchParams: Promise<{ selected?: string }>;
}) {
    // Server-side fetching
    const allCategories = await db.select().from(categories).orderBy(categories.createdAt);
    const allServices = await db.select().from(services).orderBy(services.createdAt);

    const categoriesWithServices = allCategories.map((cat) => ({
        ...cat,
        services: allServices.filter((s) => s.categoryId === cat.id),
    }));

    // Counts for the hero subtitle — derived from real data, never hardcoded
    const categoriesWithAny = categoriesWithServices.filter((c) => c.services.length > 0);
    const categoryCount = categoriesWithAny.length;
    const serviceCount = allServices.length;

    // Restore the user's selection when returning from the booking flow
    // (/services?selected=1,2). Filter to IDs that still exist.
    const { selected } = await searchParams;
    const validIds = new Set(allServices.map((s) => s.id));
    const initialSelectedIds = (selected ?? "")
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n) && validIds.has(n));

    // Structured data (JSON-LD) built from the real catalogue — lets search
    // engines surface each service with its price as a rich result.
    const offers = categoriesWithServices.flatMap((cat) =>
        cat.services.map((s) => ({ service: s, categoryName: cat.name }))
    );
    const offerCatalogJsonLd = {
        "@context": "https://schema.org",
        "@type": "OfferCatalog",
        "@id": `${SITE_URL}/services#catalog`,
        name: `Storitve — ${SITE_NAME}`,
        url: `${SITE_URL}/services`,
        numberOfItems: offers.length,
        itemListElement: offers.map(({ service, categoryName }, i) => ({
            "@type": "Offer",
            position: i + 1,
            price: service.price,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/services`,
            itemOffered: {
                "@type": "Service",
                name: service.name,
                serviceType: categoryName,
                ...(service.description ? { description: service.description } : {}),
                provider: { "@type": "BeautySalon", "@id": `${SITE_URL}/#salon`, name: SITE_NAME },
            },
        })),
    };
    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Domov", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Storitve", item: `${SITE_URL}/services` },
        ],
    };

    return (
        <main className="min-h-screen bg-porcelain pt-32 pb-20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(offerCatalogJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
            />

            {/* Hero Section - Client Component for animations */}
            <ServicesHero categoryCount={categoryCount} serviceCount={serviceCount} />

            {/* Services List - Client Component for animations */}
            <ServicesList categories={categoriesWithServices} initialSelectedIds={initialSelectedIds} />

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
