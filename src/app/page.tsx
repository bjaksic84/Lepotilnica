import Hero from "@/components/Hero";
import HomeContent from "@/components/HomeContent";
import ContactSection from "@/components/ContactSection";
import { getCatalogue } from "@/lib/catalogue";
import { SITE_URL } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { jsonLdScript } from "@/lib/json-ld";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Served from the in-process catalogue cache — see src/lib/catalogue.ts.
  // A warm isolate renders this page without touching the database.
  const { services: allServices } = await getCatalogue();
  const popularServices = allServices
    .filter((s) => s.isPopular)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      duration: s.duration,
      isPopular: s.isPopular,
    }));

  // The FAQ markup lives here rather than in the root layout because this is
  // the only page that renders the questions as visible content — Google
  // requires the two to match before it will award an FAQ rich result.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domov", item: SITE_URL },
    ],
  };

  return (
    <main className="min-h-screen bg-porcelain">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(SITE_URL)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <Hero />
      <HomeContent popularServices={popularServices} />
      <ContactSection />
    </main>
  );
}
