import {
    BUSINESS,
    BUSINESS_ADDRESS_LINE,
    GOOGLE_MAPS_CID,
    OPENING_HOURS_DISPLAY,
    ONLINE_BOOKING_WINDOW,
    SITE_NAME,
} from "@/lib/site";

/**
 * Location block with an embedded map.
 *
 * The map is Google's keyless `output=embed` endpoint — no API key, no billing
 * account and no per-load quota, unlike Maps JavaScript API or Embed API.
 *
 * It is addressed by CID, the id of the salon's own Google listing, rather
 * than by address. Google renders its own "Odprite v Zemljevidih" button
 * inside the iframe, and that button opens whatever the embed resolved to —
 * so while this asked for "Poljanski nasip 8, 1000 Ljubljana" it opened the
 * street address rather than the salon, next to our own button that opened the
 * salon correctly. The button's link is Google's cross-origin markup and
 * cannot be set from here; changing what the embed resolves to is what fixes
 * it. See GOOGLE_MAPS_CID in src/lib/site.ts.
 *
 * `loading="lazy"` matters here: the embed pulls in a substantial amount of
 * Google's own JavaScript, and this section is far below the fold.
 */
const MAP_EMBED_SRC = `https://www.google.com/maps?cid=${GOOGLE_MAPS_CID}&output=embed&hl=sl&z=16`;
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${SITE_NAME}, ${BUSINESS_ADDRESS_LINE}`
)}`;

export default function LocationMap() {
    return (
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="flex flex-col justify-center">
                <span className="eyebrow">Kje nas najdete</span>
                <h3 className="mt-5 font-playfair text-3xl font-bold leading-tight text-charcoal sm:text-4xl">
                    {BUSINESS.street},
                    <br />
                    <span className="italic font-normal text-rose">{BUSINESS.city}.</span>
                </h3>

                <p className="mt-6 max-w-md text-pretty font-light leading-relaxed text-charcoal/60">
                    Nekaj minut peš od Zmajskega mostu in Ljubljanice. Do salona pridete tudi
                    z mestnim avtobusom.
                </p>

                <div className="gold-line my-8 max-w-md" />

                <dl className="max-w-md space-y-4">
                    <div className="flex justify-between gap-4">
                        <dt className="eyebrow pt-1">Naslov</dt>
                        <dd className="text-right text-sm text-charcoal">
                            {BUSINESS.street}
                            <br />
                            {BUSINESS.postalCode} {BUSINESS.city}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="eyebrow pt-1">Odprto</dt>
                        <dd className="text-right text-sm text-charcoal">
                            {OPENING_HOURS_DISPLAY.map((h) => (
                                <span key={h.day} className="block">
                                    {h.day}:{" "}
                                    <span className={h.closed ? "text-charcoal/40" : ""}>
                                        {h.time}
                                    </span>
                                </span>
                            ))}
                            <span className="mt-1 block text-xs text-charcoal/40">
                                Spletno naročanje {ONLINE_BOOKING_WINDOW}
                            </span>
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="eyebrow pt-1">Telefon</dt>
                        <dd className="text-right text-sm">
                            <a
                                href={`tel:${BUSINESS.phone}`}
                                className="text-charcoal transition-colors hover:text-gold-dark"
                            >
                                {BUSINESS.phoneDisplay}
                            </a>
                        </dd>
                    </div>
                </dl>

                <div className="mt-9">
                    <a
                        href={MAP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group btn-capsule btn-capsule-dark"
                    >
                        <span className="relative z-10">Odprite v zemljevidih</span>
                        <span className="btn-capsule-icon bg-porcelain/15 text-porcelain">
                            <svg
                                className="h-[15px] w-[15px] transition-transform duration-200 ease-swift group-hover:-translate-y-[3px] group-hover:translate-x-[3px]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M7 17 17 7M9 7h8v8" />
                            </svg>
                        </span>
                    </a>
                </div>
            </div>

            <div className="shell h-full">
                <div className="core relative h-full min-h-[340px] lg:min-h-[460px]">
                    <iframe
                        title={`Lokacija salona ${SITE_NAME} na zemljevidu`}
                        src={MAP_EMBED_SRC}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0 h-full w-full grayscale-[0.35] saturate-[0.85] transition-[filter] duration-700 ease-silk hover:grayscale-0 hover:saturate-100"
                        style={{ border: 0 }}
                    />
                </div>
            </div>
        </div>
    );
}
