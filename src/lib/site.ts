/** The domain the site is actually served from, and the only valid canonical. */
const PRODUCTION_URL = "https://lepotilnicabykarin.si";

/**
 * Canonical site URL — the single source of truth for SEO metadata, the
 * sitemap, robots rules, JSON-LD structured data and transactional email links.
 *
 * NEXT_PUBLIC_* vars are inlined at build time, so NEXT_PUBLIC_BASE_URL has to
 * be right in the *build* environment — setting it at runtime does nothing.
 * A stale `NEXT_PUBLIC_BASE_URL=…workers.dev` left over in the Cloudflare
 * Workers Builds settings silently overrode this and shipped a production build
 * whose canonicals all pointed at the retired host, so a `*.workers.dev` value
 * is now explicitly rejected rather than trusted: that host no longer serves
 * the site (`workers_dev: false`), which makes it never a legitimate base URL.
 * Any other override is still honoured for local dev and previews.
 */
function resolveSiteUrl(): string {
    const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (!configured) return PRODUCTION_URL;
    if (/\.workers\.dev$/i.test(configured.replace(/\/+$/, ""))) return PRODUCTION_URL;
    return configured;
}

export const SITE_URL = resolveSiteUrl().replace(/\/+$/, "");

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
    street: "Poljanski nasip 8",
    postalCode: "1000",
    city: "Ljubljana",
    country: "SI",
    /** E.164 form — used for tel: links and structured data. */
    phone: "+38640774429",
    /** Display form — used in visible markup. */
    phoneDisplay: "+386 40 774 429",
    email: "info@lepotilnicabykarin.si",
    /**
     * Pin for the street address above.
     *
     * This previously held 46.0515912 / 14.5117449, which was the pin for the
     * old address at Poljanski nasip 6 — it reverse-geocodes to the Netherlands
     * Embassy building, 27 m west of the salon. The coordinates below resolve
     * to Poljanski nasip 8, the Spar building the salon is actually in.
     *
     * The Google Business Profile listing has since been corrected to match, so
     * the site and the profile now agree — which is what local search ranking
     * depends on. Note the place URL in SOCIAL_LINKS.google below still spells
     * out the old coordinates; that is Google's own permalink and the listing
     * it points at is current, so it is left alone.
     */
    geo: { latitude: 46.0515692, longitude: 14.5120902 },
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
 * Google's identifier for the salon's own Maps listing. It is the second half
 * of the `!1s0x47652d90d155ef2b:0x97cb55495dc192c6` feature id in
 * SOCIAL_LINKS.google above, converted from hex to decimal.
 *
 * Used to point the embedded map at the business rather than at the street.
 * Google's keyless embed takes a query, and asking it for the address alone
 * resolves to the address alone — so the "Odprite v Zemljevidih" button that
 * Google renders *inside* the iframe opened "Poljanski nasip 8" rather than
 * Lepotilnica. We cannot set that button's link ourselves (it is Google's
 * markup, cross-origin), but it inherits whatever the embed resolved to, so
 * naming the listing here fixes it.
 *
 * Querying by business name also resolves correctly, but that is a text search
 * which could drift if a similarly-named salon opens nearby. A CID names this
 * one listing and nothing else.
 */
export const GOOGLE_MAPS_CID = "10937929893593322182";

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

/**
 * Opening hours, in the two forms the site needs.
 *
 * The salon works "po dogovoru" (by arrangement), so there is no fixed counter
 * time to advertise — that is what visitors are told. Search engines, however,
 * cannot represent "by arrangement", and omitting the hours entirely costs the
 * Google Business Profile its opening-hours panel. `OPENING_HOURS` therefore
 * carries the window the online booking system actually accepts (the same
 * PUBLIC_OPEN/PUBLIC_CLOSE as src/lib/schedule.ts), which is a truthful
 * statement of when an appointment can be had, while `OPENING_HOURS_DISPLAY`
 * is what the footer shows. Keep both in step with the booking schedule.
 */
export const OPENING_HOURS = [
    {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        label: "Pon — Sob",
        opens: "07:30",
        closes: "19:30",
    },
] as const;

/** Human-facing hours, as the salon states them. */
export const OPENING_HOURS_DISPLAY = [
    { day: "Pon — Sob", time: "Po dogovoru", closed: false },
    { day: "Nedelja in prazniki", time: "Zaprto", closed: true },
] as const;

/**
 * Window in which the website itself accepts self-service bookings. Two forms:
 * the dash reads correctly in the footer's hours table, but badly inside a
 * sentence ("med 7.30 — 19.30"), which is where the prose form is used.
 */
export const ONLINE_BOOKING_WINDOW = "7.30 — 19.30";
export const ONLINE_BOOKING_WINDOW_PROSE = "7.30 in 19.30";
