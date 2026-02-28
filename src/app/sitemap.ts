import type { MetadataRoute } from "next";
import { db } from "@/db";
import { services, categories } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://lepotilnica.si";

    // Static pages
    // Use deployment / build date instead of "right now" for stable lastModified
    const buildDate = new Date("2026-02-28");

    const staticPages: MetadataRoute.Sitemap = [
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

    // Dynamic: fetch all service categories for potential future category pages
    try {
        const allCategories = await db.select().from(categories);
        const allServices = await db.select().from(services);

        // If you later add individual service pages, uncomment:
        // const servicePages = allServices.map((service) => ({
        //     url: `${baseUrl}/services/${service.id}`,
        //     lastModified: new Date(service.createdAt),
        //     changeFrequency: "monthly" as const,
        //     priority: 0.6,
        // }));

        return [...staticPages];
    } catch {
        return staticPages;
    }
}
