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
    default: "Lepotilnica by Karin | Prestižni kozmetični salon v Ljubljani",
    template: "%s | Lepotilnica by Karin",
  },
  description:
    "Odkrijte prestižne lepotne tretmaje v Lepotilnici by Karin — ekskluzivnem kozmetičnem salonu v Ljubljani. Strokovna nega obraza, podaljševanje trepalnic, oblikovanje obrvi in več. Rezervirajte svoj termin na spletu.",
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
    title: "Lepotilnica by Karin | Prestižni kozmetični salon v Ljubljani",
    description:
      "Izkušnja prestižnih lepotnih tretmajev v svetišču elegance. Strokovna nega obraza, podaljševanje trepalnic, oblikovanje obrvi in več.",
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
      "Prestižni kozmetični salon, ki nudi strokovne nege obraza, podaljševanje trepalnic, oblikovanje obrvi in še več v Ljubljani, Slovenija.",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    image: [
      `${baseUrl}/og-image.png`,
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
    paymentAccepted: "Gotovina, plačilna kartica",
    areaServed: {
      "@type": "City",
      name: "Ljubljana",
      "@id": "https://www.wikidata.org/wiki/Q437",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Lepotni tretmaji",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Nega obraza",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Vrhunska nega obraza",
                description: "Strokovne negovalne terapije za sijočo in zdravo kožo",
              },
            },
          ],
        },
        {
          "@type": "OfferCatalog",
          name: "Trepalnice in obrvi",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Podaljševanje trepalnic",
                description: "Strokovna aplikacija podaljškov trepalnic",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Oblikovanje obrvi",
                description: "Strokovno oblikovanje in urejanje obrvi",
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
    description: "Prestižni kozmetični salon v Ljubljani — rezervirajte termin prek spleta",
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
