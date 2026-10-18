import { db } from "@/db";
import { categories, services } from "@/db/schema";
import type { Category, Service } from "@/db/schema";

/**
 * Short-lived cache for the service catalogue.
 *
 * `/` and `/services` are rendered per request, and each render used to query
 * the database for the full catalogue — 43 rows and ~6KB, measured at ~58ms
 * per call against the production Turso instance. That is paid on every single
 * page view, for data that changes when Karin edits a price, which is rarely.
 *
 * Why a plain in-process cache rather than ISR: OpenNext on Cloudflare needs an
 * incremental cache binding (R2 or KV) before `revalidate` persists anything,
 * and none is configured. Caching the *data* instead needs no infrastructure
 * and leaves the rendering model untouched.
 *
 * What this does and does not promise:
 *  - Module scope lives as long as the isolate, so a warm isolate serves the
 *    catalogue with no database round-trip at all.
 *  - `invalidateCatalogue()` only clears the isolate it runs in. An admin edit
 *    is therefore visible immediately to that isolate and within TTL_MS
 *    everywhere else. For a price list that is the right trade; anything
 *    stronger needs a shared store.
 *  - Concurrent misses are coalesced. Without that, a burst of traffic into a
 *    cold isolate fires one identical query per request — exactly what the
 *    load test produced.
 */
const TTL_MS = 60_000;

export interface Catalogue {
    categories: Category[];
    services: Service[];
}

let cached: { at: number; data: Catalogue } | null = null;
let inFlight: Promise<Catalogue> | null = null;

async function load(): Promise<Catalogue> {
    const [allCategories, allServices] = await Promise.all([
        db.select().from(categories).orderBy(categories.createdAt),
        db.select().from(services).orderBy(services.createdAt),
    ]);
    return { categories: allCategories, services: allServices };
}

export async function getCatalogue(): Promise<Catalogue> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
    // A second caller arriving mid-flight waits on the same query rather than
    // issuing its own.
    if (inFlight) return inFlight;

    inFlight = load()
        .then((data) => {
            cached = { at: Date.now(), data };
            return data;
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/** Drop the cached catalogue in this isolate. Call after any admin mutation. */
export function invalidateCatalogue(): void {
    cached = null;
}

/** Categories with their services nested, the shape both pages render. */
export async function getCatalogueByCategory() {
    const { categories: cats, services: svcs } = await getCatalogue();
    return cats.map((cat) => ({
        ...cat,
        services: svcs.filter((s) => s.categoryId === cat.id),
    }));
}
