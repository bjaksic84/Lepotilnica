/**
 * Customer reviews, transcribed verbatim from the salon's public Google
 * Business Profile.
 *
 * Two deliberate decisions here:
 *
 * 1. **No `Review` / `aggregateRating` JSON-LD.** Google's structured-data
 *    guidelines forbid a site from marking up its own aggregate rating for
 *    itself ("self-serving reviews"); doing it risks a manual action rather
 *    than star snippets. The reviews are shown as ordinary content and the
 *    rating links out to the Google profile, which is where the rating is
 *    actually attested.
 *
 * 2. **Absolute months, not "2 months ago".** The source page stored relative
 *    recency, which silently rots — a review captured as "pred enim tednom" is
 *    not a week old any more. The months below were resolved against the
 *    snapshot date and stay true as time passes.
 *
 * 3. **No review count anywhere in the copy.** It was hardcoded at 27 and was
 *    36 within two months — a number that only ever moves is guaranteed to be
 *    wrong, and an understated one actively undersells the salon. The rating
 *    itself is stable and says the useful thing, so the wording carries that
 *    and lets the Google profile state the total.
 *
 *    Showing a live count would mean the Google Places API: an API key, a
 *    billing account and a cached server-side fetch of `userRatingCount`.
 *    Worth doing if the total becomes a selling point; not worth a paid
 *    dependency before then.
 */
import { SOCIAL_LINKS } from "@/lib/site";

export interface Review {
    /** Reviewer name exactly as it appears on the Google profile. */
    author: string;
    /** Review text, unedited. */
    body: string;
    /** Month the review was posted, e.g. "junij 2026". */
    month: string;
    /** Star rating out of 5. */
    rating: number;
    /** Language of `body` — English reviews get `lang` on the blockquote. */
    lang?: "en";
}

/**
 * Headline rating from the Google Business Profile. Deliberately no `count` —
 * see the note above.
 */
export const RATING_SNAPSHOT = {
    value: 5.0,
    /** Rendered in Slovenian decimal notation. */
    valueDisplay: "5,0",
    /** When the quoted reviews below were transcribed. */
    snapshot: "julij 2026",
    profileUrl: SOCIAL_LINKS.google,
} as const;

export const REVIEWS: Review[] = [
    {
        author: "Živa Dokl",
        month: "julij 2026",
        rating: 5,
        body: "Karin je izjemno prijazna in profesionalna. Salon je čudovito urejen, prijeten in ustvarja sproščeno vzdušje. S pedikuro sem bila več kot zadovoljna, zato se zagotovo še vrnem. Toplo priporočam!",
    },
    {
        author: "Vesna Resnik",
        month: "junij 2026",
        rating: 5,
        body: "Pri nohtih me najbolj zanima ena stvar: da zdržijo. In pri Karin zdržijo. Do naslednjega termina mi še nikoli ni odpadel ali se zlomil niti en noht.",
    },
    {
        author: "Lana Burjak Novak",
        month: "april 2026",
        rating: 5,
        body: "Zelo zadovoljna z obiskom! Salon je urejen, čist in prijeten, osebje pa izjemno prijazno in profesionalno. BIAB manikura je bila natančno in z občutkom narejena.",
    },
    {
        author: "Suzana Somrak",
        month: "maj 2026",
        rating: 5,
        body: "Odlična manikura. Karin pa zelo prijazna, nasmejana in profesionalna. Prav tako nikoli nisem imela težav z kvaliteto, vedno obstojna manikura. Toplo priporočam.",
    },
    {
        author: "Marvin Veit",
        month: "junij 2026",
        rating: 5,
        lang: "en",
        body: "We decided on a whim to visit Karin for a pedicure and were able to get an appointment that very same day. Karin was extremely friendly and professional. We both really enjoyed the pedicure and would definitely come back anytime. Highly recommended!",
    },
    {
        author: "Stella Burr",
        month: "april 2026",
        rating: 5,
        lang: "en",
        body: "Karin is such a lovely person and did an excellent job with my pedicure. She is very friendly and welcoming and highly professional. She is meticulous and pays a lot of attention to detail.",
    },
    {
        author: "Amanda Whitaker",
        month: "junij 2026",
        rating: 5,
        lang: "en",
        body: "I had a wonderful experience here, and my nails look and feel amazing. Karin did a fabulous job. She was super responsive and easy to coordinate with. This is the best place to go to.",
    },
    {
        author: "Tatjana G.",
        month: "maj 2026",
        rating: 5,
        body: "Odlična manikura, prijazna Karin, vse pohvale.",
    },
];

/**
 * The three shown on the homepage. Chosen for variety rather than recency —
 * one on atmosphere, one on how long the work lasts, one on a named service —
 * so the row reads as three different reasons to book rather than three
 * versions of "very nice".
 */
export const FEATURED_REVIEWS: Review[] = [
    REVIEWS[0],
    REVIEWS[1],
    REVIEWS[2],
];
