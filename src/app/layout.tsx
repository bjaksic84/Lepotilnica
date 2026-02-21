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
  ],
  authors: [{ name: "Lepotilnica by Karin" }],
  creator: "Lepotilnica by Karin",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
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
  },
  icons: {
    icon: "/logo-3.png",
    apple: "/logo-3.png",
    shortcut: "/logo-3.png",
  },
};

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";

// JSON-LD Structured Data for Local Business SEO
function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: "Lepotilnica by Karin",
    description:
      "Premium beauty salon offering expert facials, lash extensions, brow styling, and more in Ljubljana, Slovenia.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    logo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/logo.png`,
    image: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/og-image.svg`,
    telephone: "+386 1 234 5678",
    email: "info@lepotilnica.si",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Mestni trg 1",
      addressLocality: "Ljubljana",
      addressCountry: "SI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "46.0511",
      longitude: "14.5051",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "17:00",
      },
    ],
    priceRange: "€€",
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
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
