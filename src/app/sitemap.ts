import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = SITE_URL;

    // Use a stable build date rather than "now" so lastModified doesn't churn.
    const buildDate = new Date("2026-02-28");

    return [
        {
            url: baseUrl,
            lastModified: buildDate,
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/services`,
            lastModified: buildDate,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/book`,
            lastModified: buildDate,
            changeFrequency: "monthly",
            priority: 0.8,
        },
    ];
}
