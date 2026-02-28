import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
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
    default: "Lepotilnica by Karin | Premium Beauty Salon in Ljubljana",
    template: "%s | Lepotilnica by Karin",
  },
  description:
    "Discover premium beauty treatments at Lepotilnica by Karin — Ljubljana's exclusive beauty salon. Expert facials, lash extensions, brow styling, and more. Book your appointment online.",
  keywords: [
    "beauty salon Ljubljana",
    "kozmetični salon Ljubljana",
    "lepotilnica",
    "facial treatments",
    "lash extensions",
    "brow styling",
    "beauty treatments Slovenia",
    "Karin beauty",
    "online booking beauty salon",
    "kozmetika Ljubljana",
    "nega obraza Ljubljana",
    "podaljšanje trepalnic Ljubljana",
    "manikura Ljubljana",
    "pedikura Ljubljana",
    "lepotni salon",
    "naročanje online kozmetika",
    "beauty salon Slovenia",
    "salon lepote Ljubljana",
    "trajno lakiranje",
  ],
  authors: [{ name: "Lepotilnica by Karin" }],
  creator: "Lepotilnica by Karin",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "sl_SI",
    siteName: "Lepotilnica by Karin",
    title: "Lepotilnica by Karin | Premium Beauty Salon in Ljubljana",
    description:
      "Experience premium beauty treatments in a sanctuary of elegance. Expert facials, lash extensions, brow styling, and more.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Lepotilnica by Karin — Premium Beauty Salon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lepotilnica by Karin | Premium Beauty Salon",
    description:
      "Experience premium beauty treatments in a sanctuary of elegance. Book online today.",
    images: ["/og-image.svg"],
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
    languages: {
      "sl-SI": "/",
      "x-default": "/",
    },
  },
};

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";

// JSON-LD Structured Data for Local Business SEO
function JsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://lepotilnica.si";

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": `${baseUrl}/#salon`,
    name: "Lepotilnica by Karin",
    alternateName: "Lepotilnica",
    description:
      "Premium beauty salon offering expert facials, lash extensions, brow styling, and more in Ljubljana, Slovenia.",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    image: [
      `${baseUrl}/og-image.svg`,
      `${baseUrl}/about-karin.jpeg`,
    ],
    telephone: "+386 1 234 5678",
    email: "info@lepotilnica.si",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Mestni trg 1",
      addressLocality: "Ljubljana",
      postalCode: "1000",
      addressRegion: "Ljubljana",
      addressCountry: "SI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 46.0511,
      longitude: 14.5051,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "09:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "10:00",
        closes: "18:00",
      },
    ],
    priceRange: "€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Credit Card",
    areaServed: {
      "@type": "City",
      name: "Ljubljana",
      "@id": "https://www.wikidata.org/wiki/Q437",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Beauty Treatments",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Facial Treatments",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Premium Facial Treatment",
                description: "Expert facial treatments for radiant, healthy skin",
              },
            },
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Lash & Brow",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Lash Extensions",
                description: "Professional lash extension application",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Brow Styling",
                description: "Expert brow shaping and styling",
              },
            },
          ],
        },
      ],
    },
    sameAs: [],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "Lepotilnica by Karin",
    description: "Premium beauty salon in Ljubljana — book your appointment online",
    publisher: { "@id": `${baseUrl}/#salon` },
    inLanguage: "sl-SI",
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Domov",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Storitve",
        item: `${baseUrl}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Rezervacija",
        item: `${baseUrl}/book`,
      },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Kako rezerviram termin v Lepotilnici?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Termin lahko rezervirate enostavno preko naše spletne strani na strani 'Rezervacija'. Izberite želeno storitev, datum in čas, ter potrdite rezervacijo.",
        },
      },
      {
        "@type": "Question",
        name: "Kje se nahaja Lepotilnica by Karin?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nahajamo se na Mestni trg 1, 1000 Ljubljana, Slovenija. Smo v samem srcu Ljubljane.",
        },
      },
      {
        "@type": "Question",
        name: "Kakšne storitve ponujate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ponujamo širok nabor lepotnih storitev, vključno z negami obraza, podaljševanjem trepalnic, oblikovanjem obrvi, manikuro, pedikuro in še več.",
        },
      },
      {
        "@type": "Question",
        name: "Ali lahko odpovem termin?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da, termin lahko odpoveste preko povezave v potrditvenem e-mailu, ki ga prejmete po uspešni rezervaciji.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
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
