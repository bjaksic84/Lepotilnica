import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";

export const metadata: Metadata = {
    title: "Rezerviraj termin",
    description:
        "Rezervirajte svoj lepotni tretma prek spleta v Lepotilnici by Karin v Ljubljani. Izbirajte med nego obraza, manikuro, pedikuro, depilacijo, obrvmi in masažami. Takojšna potrditev.",
    openGraph: {
        title: "Rezerviraj termin — Lepotilnica by Karin",
        description:
            "Rezervirajte naslednji lepotni tretma prek spleta. Enostavna rezervacija, takojšna potrditev.",
        url: "/book",
    },
    alternates: {
        canonical: "/book",
    },
};

const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
        { "@type": "ListItem", position: 1, name: "Domov", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Rezervacija", item: `${SITE_URL}/book` },
    ],
};

export default function BookLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
            />
            {children}
        </>
    );
}
