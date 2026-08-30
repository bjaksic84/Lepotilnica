import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Lepotilnica by Karin",
        short_name: "Lepotilnica",
        description:
            "Prestižni kozmetični salon v Ljubljani — nega obraza, manikura, pedikura, depilacija, obrvi, masaže in biomicroneedling. Rezervirajte prek spleta.",
        start_url: "/",
        display: "standalone",
        background_color: "#F9F5F2",
        theme_color: "#D4AF37",
        orientation: "portrait",
        lang: "sl",
        id: "/",
        categories: ["beauty", "health", "lifestyle"],
        // These previously pointed at /logo-3.png (actually 130x113) and
        // /logo.png (303x178) while declaring 192x192 and 512x512. Neither was
        // square or the declared size, which fails installability — a browser
        // that trusts the manifest ends up with a stretched icon. The files
        // below are generated at exactly the sizes they claim.
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            // Maskable variants keep the logo inside the safe zone so Android's
            // circular/squircle crop doesn't cut off the wordmark.
            {
                src: "/icons/icon-192-maskable.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icons/icon-512-maskable.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
