import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = SITE_URL;

    return {
        rules: [
            {
                userAgent: "*",
                // The policy pages are listed explicitly as well as being covered
                // by `allow: "/"`. They are linked from the footer, the booking
                // form's consent line and every transactional e-mail, so they
                // must stay publicly readable — an over-broad disallow added
                // later would otherwise silently make the terms a customer has
                // just agreed to uncrawlable.
                allow: ["/", "/pogoji", "/zasebnost"],
                disallow: ["/admin/", "/api/", "/cancel/"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
