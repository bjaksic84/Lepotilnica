import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Rate limiting.
 *
 * In production on Cloudflare Workers the limiter is the native Rate Limiting
 * binding (configured in wrangler.jsonc). The in-memory limiter below is kept
 * only as a fallback for environments where the binding is not present (e.g.
 * `next dev`); its counters live inside a single Worker isolate and reset
 * whenever the isolate recycles, so it is not a real control on Workers. Use
 * `enforceRateLimit()`, which prefers the binding and falls back.
 *
 * KNOWN LIMITATION — the binding is approximate, not a quota.
 *
 * Cloudflare documents it as permissive and eventually consistent, and
 * explicitly "not intended for use as an accurate accounting system". The
 * counter is cached on the individual machine serving the request and
 * reconciled asynchronously with a per-location store, so a real client can
 * run well past the configured limit before anything is refused.
 *
 * Measured against this Worker, with AUTH_RATE_LIMITER set to 8 per 60s:
 *
 *   20 requests at 1/second   ->  0 refused
 *   30 requests back-to-back  ->  0 refused
 *   14 requests, logged       ->  limit() returned success:true every time
 *
 * The same binding refuses correctly under `opennextjs-cloudflare preview`
 * (the 9th request, exactly as configured), because one local server is one
 * location and one machine, so the count there is exact. Passing locally
 * therefore says nothing about production. See
 * https://github.com/cloudflare/workers-sdk/issues/16097
 *
 * Consequence: treat these limits as coarse throttling that trims casual
 * abuse, and do NOT rely on them where exact counting matters. Admin login is
 * single-factor, so brute-force protection there needs an exact mechanism
 * (a Durable Object, or an attempt counter in the database) rather than this.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitConfig {
    /** Time window in milliseconds */
    interval: number;
    /** Max unique IPs tracked (prevents memory bloat) */
    uniqueTokenPerInterval?: number;
}

interface RateLimiter {
    check: (token: string, limit: number) => Promise<{ success: boolean; remaining: number }>;
}

export function rateLimit(config: RateLimitConfig): RateLimiter {
    const { interval, uniqueTokenPerInterval = 500 } = config;
    const tokenCache = new Map<string, RateLimitEntry>();

    // Opportunistic cleanup — runs inline only when the cache grows past
    // capacity. We deliberately avoid a background `setInterval`: long-lived
    // timers don't fit the Workers request/response model and this limiter is
    // only a local-dev fallback anyway.
    const evictIfNeeded = (now: number) => {
        if (tokenCache.size <= uniqueTokenPerInterval) return;
        for (const [key, entry] of tokenCache) {
            if (now > entry.resetAt) tokenCache.delete(key);
        }
        if (tokenCache.size > uniqueTokenPerInterval) {
            const entries = [...tokenCache.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
            for (const [key] of entries.slice(0, tokenCache.size - uniqueTokenPerInterval)) {
                tokenCache.delete(key);
            }
        }
    };

    return {
        check: async (token: string, limit: number) => {
            const now = Date.now();
            evictIfNeeded(now);
            const entry = tokenCache.get(token);

            if (!entry || now > entry.resetAt) {
                tokenCache.set(token, { count: 1, resetAt: now + interval });
                return { success: true, remaining: limit - 1 };
            }

            if (entry.count >= limit) {
                return { success: false, remaining: 0 };
            }

            entry.count++;
            return { success: true, remaining: limit - entry.count };
        },
    };
}

// Pre-configured in-memory fallback limiters (dev only — see enforceRateLimit).
// Booking: 5 bookings per 15 minutes per IP
export const bookingLimiter = rateLimit({
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 500,
});

// Auth/login: 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 500,
});

// Cancellation: 10 requests per 15 minutes per IP
export const cancelLimiter = rateLimit({
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 500,
});

// Website enquiry form: 3 messages per 15 minutes per IP
export const contactLimiter = rateLimit({
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 500,
});

/** Shape of a Cloudflare Rate Limiting binding (`env.<NAME>.limit(...)`). */
interface CfRateLimit {
    limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Enforce a rate limit for `token` (typically the client IP). Prefers the
 * Cloudflare native Rate Limiting binding named `binding`; if that binding is
 * unavailable (local dev, or the Workers context can't be resolved) it falls
 * back to the in-memory `fallbackLimiter`. Returns true when the request is
 * within the limit.
 */
/**
 * One log line per distinct problem per isolate. Without this the diagnostics
 * below would print on every single request to a rate-limited route.
 */
const reported = new Set<string>();
function reportOnce(key: string, message: string): void {
    if (reported.has(key)) return;
    reported.add(key);
    console.error(message);
}

export async function enforceRateLimit(
    binding: string,
    token: string,
    fallbackLimiter: RateLimiter,
    fallbackLimit: number
): Promise<boolean> {
    // This used to swallow every failure with a bare `catch {}`, which hid a
    // live hole: the bindings were attached to the Worker, the limiter was
    // never consulted, and all four routes ran with no effective limit at all.
    // Nothing surfaced, because falling back looks identical to succeeding.
    // Degrading to the in-memory limiter is a real loss of protection on
    // Workers — its counters live in one isolate — so every path that gets
    // there now says so out loud.
    try {
        const env = getCloudflareContext().env as unknown as Record<string, CfRateLimit | undefined>;
        const limiter = env?.[binding];
        if (limiter && typeof limiter.limit === "function") {
            const { success } = await limiter.limit({ key: token });
            return success;
        }
        reportOnce(
            `missing:${binding}`,
            `[RateLimit] Binding ${binding} is not present on env — falling back to the ` +
                `per-isolate limiter, which does not actually limit on Workers. ` +
                `env keys: ${env ? Object.keys(env).join(", ") || "(none)" : "(env is " + String(env) + ")"}`
        );
    } catch (err) {
        // getCloudflareContext() throws outside the Workers runtime (e.g. next
        // dev), which is expected and benign. In the deployed Worker it is not.
        reportOnce(
            `threw:${binding}`,
            `[RateLimit] Could not resolve the Workers context for ${binding}: ` +
                `${err instanceof Error ? err.message : String(err)} — falling back to the ` +
                `per-isolate limiter, which does not actually limit on Workers.`
        );
    }
    const { success } = await fallbackLimiter.check(token, fallbackLimit);
    return success;
}

/**
 * Extract the client IP. On Cloudflare the edge always sets `CF-Connecting-IP`
 * and it cannot be spoofed by the client, so it is the only trustworthy source
 * for rate-limit keys. The x-forwarded-for / x-real-ip fallbacks are for local
 * dev only and are client-controllable — never rely on them for security.
 */
export function getClientIp(request: Request): string {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();

    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    return "127.0.0.1";
}
