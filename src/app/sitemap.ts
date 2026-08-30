import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { db } from "@/db";
import { services } from "@/db/schema";

/**
 * `lastModified` is derived from the catalogue rather than hardcoded — a frozen
 * date tells crawlers nothing has changed and discourages re-crawling, which is
 * worse than omitting the field. Falls back to the current date if the table is
 * empty or unreachable, so a database blip can't fail the whole sitemap.
 */
async function latestCatalogueChange(): Promise<Date> {
    try {
        const rows = await db.select({ createdAt: services.createdAt }).from(services);
        const timestamps = rows
            .map((r) => new Date(r.createdAt).getTime())
            .filter((t) => Number.isFinite(t));

        if (timestamps.length > 0) return new Date(Math.max(...timestamps));
    } catch {
        // Fall through to "now" — the sitemap must still render.
    }
    return new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SITE_URL;
    const catalogueUpdated = await latestCatalogueChange();

    return [
        {
            url: baseUrl,
            lastModified: catalogueUpdated,
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/services`,
            lastModified: catalogueUpdated,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/book`,
            lastModified: catalogueUpdated,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/zasebnost`,
            lastModified: catalogueUpdated,
            changeFrequency: "yearly",
            priority: 0.2,
        },
    ];
}
