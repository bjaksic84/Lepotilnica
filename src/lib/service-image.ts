/**
 * Mapping between a service's name and its photograph.
 *
 * Previously duplicated verbatim in HomeContent and ServicesList, and both
 * copies dropped Slovenian diacritics instead of folding them: the old rule
 * lowercased, replaced whitespace with hyphens and then deleted anything
 * outside `[a-z0-9-]`, so `č`, `š` and `ž` vanished rather than becoming
 * `c`, `s` and `z`:
 *
 *     "Masaža z vročimi kamni"  →  masaa-z-vroimi-kamni
 *     "Klasična manikura"       →  klasina-manikura
 *
 * Nobody would name a file that, which is a large part of why only 3 of 53
 * services have a picture. Normalising to NFD and stripping the combining
 * marks folds the accent off the base letter instead, giving the predictable
 * `masaza-z-vrocimi-kamni`. The three filenames that already exist contain no
 * diacritics, so they resolve identically under both rules.
 */
export function getServiceSlug(name: string): string {
    return name
        .toLowerCase()
        // Decompose "č" into "c" + combining caron, then drop the caron.
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        // "đ" is atomic — it has no decomposition, so it needs mapping by hand.
        .replace(/đ/g, "d")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/** Path to a service's photo under `public/`. */
export function getServiceImage(serviceName: string): string {
    return `/services/${getServiceSlug(serviceName)}.jpeg`;
}

/**
 * Per-service crop adjustments, keyed by slug, for photos whose subject is not
 * in the middle of the frame.
 */
export const SERVICE_IMAGE_POSITIONS: Record<string, string> = {
    "pedikura-s-permanentnim-lakiranjem": "center 80%",
};

/** Crop position for a service, defaulting to centred. */
export function getServiceImagePosition(serviceName: string): string {
    return SERVICE_IMAGE_POSITIONS[getServiceSlug(serviceName)] ?? "center";
}
