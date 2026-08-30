/**
 * Canonical site URL — the single source of truth for SEO metadata, the
 * sitemap, robots rules, JSON-LD structured data and transactional email links.
 *
 * NEXT_PUBLIC_* vars are inlined at build time, so NEXT_PUBLIC_BASE_URL must be
 * set in the build environment. The fallback is the production apex domain — not
 * the workers.dev host — so a build with a missing env var can never emit
 * canonical / Open Graph / sitemap URLs that point away from the real domain.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_BASE_URL || "https://lepotilnicabykarin.si"
).replace(/\/+$/, "");

export const SITE_NAME = "Lepotilnica by Karin";

/**
 * Name / Address / Phone — the single source of truth for the salon's contact
 * details. These were previously duplicated between the footer and the JSON-LD
 * and had drifted apart (two different streets, a placeholder phone number).
 * Local search ranking depends on this data being byte-identical everywhere it
 * appears — on the site, in structured data, and on the Google Business Profile
 * — so every consumer must read it from here.
 */
export const BUSINESS = {
    name: SITE_NAME,
    street: "Poljanski nasip 6",
    postalCode: "1000",
    city: "Ljubljana",
    country: "SI",
    /** E.164 form — used for tel: links and structured data. */
    phone: "+38640774429",
    /** Display form — used in visible markup. */
    phoneDisplay: "+386 40 774 429",
    email: "info@lepotilnicabykarin.si",
    /** Exact pin from the Google Business Profile listing — keep the two in sync. */
    geo: { latitude: 46.0515912, longitude: 14.5117449 },
} as const;

export const BUSINESS_ADDRESS_LINE = `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.city}`;

/**
 * Profiles that verifiably belong to the business. Emitted as schema.org
 * `sameAs`, which is how search engines tie the website, the Google Business
 * Profile and the social accounts together into one entity.
 */
export const SOCIAL_LINKS = {
    google:
        "https://www.google.com/maps/place/Lepotilnica+by+Karin,+kozmeti%C4%8Dni+salon/@46.0515921,14.5111012,19z/data=!3m1!4b1!4m6!3m5!1s0x47652d90d155ef2b:0x97cb55495dc192c6!8m2!3d46.0515912!4d14.5117449!16s%2Fg%2F11z29cjr53",
    instagram: "https://www.instagram.com/lepotilnicabykarin",
    facebook: "https://www.facebook.com/p/Lepotilnica-by-Karin-61572537894739/",
} as const;

/**
 * Top-level service categories, mirroring the `categories` table. Used for the
 * salon's summary OfferCatalog in the JSON-LD — the per-service catalogue on
 * /services is read live from the database instead.
 *
 * Keep this in step with the database. The previous hardcoded version had
 * drifted badly: it advertised "podaljševanje trepalnic" (lash extensions),
 * which the salon does not offer, while omitting depilacija, masaže,
 * biomicroneedling and oblikovanje telesa entirely.
 */
export const SERVICE_CATEGORIES = [
    "Nega obraza",
    "Manikura",
    "Pedikura",
    "Depilacija",
    "Obrvi",
    "Trepalnice",
    "Masaža",
    "Biomicroneedling",
    "Oblikovanje telesa",
] as const;

/** Opening hours — mirrored by the footer and the JSON-LD, so they can't drift. */
export const OPENING_HOURS = [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday"], label: "Pon — Čet", opens: "09:00", closes: "20:00" },
    { days: ["Friday"], label: "Petek", opens: "09:00", closes: "18:00" },
    { days: ["Saturday"], label: "Sobota", opens: "10:00", closes: "18:00" },
] as const;
