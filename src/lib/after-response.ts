import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Run background work that must outlive the HTTP response.
 *
 * On Node a floating promise keeps running because the process persists. On
 * Cloudflare Workers it does not: the request context is torn down as soon as
 * the response is returned, and any in-flight I/O that wasn't handed to
 * `ctx.waitUntil()` is cancelled. Booking confirmation e-mails were fired as
 * bare floating promises, so on Workers the request to Resend was killed before
 * it left the isolate — Resend recorded zero send attempts, and no customer
 * ever received a confirmation.
 *
 * `waitUntil` is the fix: it tells the runtime to keep the isolate alive until
 * the promise settles, without delaying the response.
 *
 * Outside Workers (`next dev`, tests) there is no context to register with, so
 * we fall back to awaiting the work. That costs latency but is correct
 * everywhere, and it means a local booking still sends its mail.
 *
 * Rejections are swallowed by design: background work must never turn a
 * successful booking into a 500. Callers should attach their own logging.
 */
export async function runAfterResponse(work: Promise<unknown>): Promise<void> {
    const guarded = Promise.resolve(work).then(
        () => undefined,
        () => undefined,
    );

    try {
        const ctx = getCloudflareContext()?.ctx;
        if (typeof ctx?.waitUntil === "function") {
            ctx.waitUntil(guarded);
            return;
        }
    } catch {
        // No Cloudflare context available — fall through to awaiting.
    }

    await guarded;
}
