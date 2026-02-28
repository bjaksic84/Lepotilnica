import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Lepotilnica by Karin",
        short_name: "Lepotilnica",
        description:
            "Premium beauty salon in Ljubljana — facials, lash extensions, brow styling & more. Book online.",
        start_url: "/",
        display: "standalone",
        background_color: "#F9F5F2",
        theme_color: "#D4AF37",
        orientation: "portrait",
        categories: ["beauty", "health", "lifestyle"],
        icons: [
            {
                src: "/logo-3.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/logo.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
