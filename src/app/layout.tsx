import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { SITE_URL, SITE_NAME, BUSINESS, SOCIAL_LINKS, OPENING_HOURS, SERVICE_CATEGORIES } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Lepotilnica by Karin | Prestižni kozmetični salon v Ljubljani",
    template: "%s | Lepotilnica by Karin",
  },
  description:
    "Kozmetični salon v Ljubljani — nega obraza, manikura in pedikura, depilacija, laminacija obrvi, masaže in biomicroneedling. Rezervirajte termin na spletu.",
  // Keywords are ignored by Google, but they must not contradict the catalogue:
  // these mirror the real service list in the database.
  keywords: [
    "kozmetični salon Ljubljana",
    "lepotilnica",
    "nega obraza Ljubljana",
    "manikura Ljubljana",
    "BIAB manikura",
    "pedikura Ljubljana",
    "trajno lakiranje Ljubljana",
    "depilacija Ljubljana",
    "brazilska depilacija",
    "laminacija obrvi Ljubljana",
    "oblikovanje obrvi",
    "keratinsko vihanje trepalnic",
    "barvanje trepalnic",
    "biomicroneedling Ljubljana",
    "maderoterapija Ljubljana",
    "presoterapija",
    "masaža Ljubljana",
    "salon lepote Ljubljana",
    "naročanje online kozmetika",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: "Lepotilnica by Karin" }],
  creator: "Lepotilnica by Karin",
  publisher: "Lepotilnica by Karin",
  category: "beauty",
  formatDetection: { telephone: true, address: true, email: true },
  appleWebApp: { capable: true, title: "Lepotilnica", statusBarStyle: "default" },
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "sl_SI",
    siteName: "Lepotilnica by Karin",
    title: "Lepotilnica by Karin | Prestižni kozmetični salon v Ljubljani",
    description:
      "Izkušnja prestižnih lepotnih tretmajev v svetišču elegance. Nega obraza, manikura in pedikura, depilacija, obrvi, masaže in biomicroneedling.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lepotilnica by Karin — Prestižni kozmetični salon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lepotilnica by Karin | Prestižni kozmetični salon",
    description:
      "Izkušnja prestižnih lepotnih tretmajev v svetišču elegance. Rezervirajte na spletu še danes.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";

// JSON-LD Structured Data for Local Business SEO
function JsonLd() {
  const baseUrl = SITE_URL;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": `${baseUrl}/#salon`,
    name: "Lepotilnica by Karin",
    alternateName: "Lepotilnica",
    description:
      "Prestižni kozmetični salon v Ljubljani: nege obraza, manikura in pedikura, depilacija, laminacija in oblikovanje obrvi, tretmaji trepalnic, masaže, biomicroneedling in oblikovanje telesa.",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    image: [
      `${baseUrl}/og-image.png`,
      `${baseUrl}/about-karin.jpeg`,
    ],
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      postalCode: BUSINESS.postalCode,
      addressRegion: BUSINESS.city,
      addressCountry: BUSINESS.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: OPENING_HOURS.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...h.days],
      opens: h.opens,
      closes: h.closes,
    })),
    priceRange: "€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Gotovina, plačilna kartica",
    areaServed: {
      "@type": "City",
      name: "Ljubljana",
      "@id": "https://www.wikidata.org/wiki/Q437",
    },
    // Top-level categories only — these mirror the `categories` table and must
    // stay truthful. /services emits the full per-service OfferCatalog straight
    // from the database; this is the summary that hangs off the salon entity.
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Lepotni tretmaji",
      itemListElement: SERVICE_CATEGORIES.map((name) => ({
        "@type": "OfferCatalog",
        name,
        url: `${baseUrl}/services`,
      })),
    },
    sameAs: [SOCIAL_LINKS.google, SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "Lepotilnica by Karin",
    description: "Prestižni kozmetični salon v Ljubljani — rezervirajte termin prek spleta",
    publisher: { "@id": `${baseUrl}/#salon` },
    inLanguage: "sl-SI",
  };

  // Only site-wide entities belong here. BreadcrumbList and FAQPage are
  // per-page facts and now live on the routes they actually describe —
  // emitting them from the layout put a 3-level breadcrumb and an FAQ on every
  // page, including /book and /admin, and produced two conflicting
  // BreadcrumbList nodes on /services.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(website) }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sl" data-scroll-behavior="smooth">
      <head>
        <JsonLd />
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} antialiased`}>
        <Navbar />
        <PageTransition>{children}</PageTransition>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
