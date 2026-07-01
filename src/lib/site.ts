/**
 * Canonical site URL — the single source of truth for SEO metadata, the
 * sitemap, robots rules, JSON-LD structured data and transactional email links.
 *
 * NEXT_PUBLIC_* vars are inlined at build time, so NEXT_PUBLIC_BASE_URL must be
 * set in the build environment when serving from a custom domain. It falls back
 * to the live Cloudflare Workers deployment so canonical / Open Graph URLs are
 * always production-correct even if the env var is missing.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_BASE_URL || "https://lepotilnica.jaksicbojan1.workers.dev"
).replace(/\/+$/, "");

export const SITE_NAME = "Lepotilnica by Karin";
