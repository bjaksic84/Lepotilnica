import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Rate limiting.
 *
 * In production on Cloudflare Workers the authoritative limiter is the native
 * Rate Limiting binding (configured in wrangler.jsonc). It is enforced at the
 * edge and shared across requests — unlike the in-memory limiter below, whose
 * counters live inside a single Worker isolate and reset whenever the isolate
 * recycles, making it useless as a real control on Workers.
 *
 * The in-memory limiter is kept only as a fallback for environments where the
 * binding is not present (e.g. `next dev`). Use `enforceRateLimit()`, which
 * prefers the binding and transparently falls back.
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
export async function enforceRateLimit(
    binding: string,
    token: string,
    fallbackLimiter: RateLimiter,
    fallbackLimit: number
): Promise<boolean> {
    try {
        const env = getCloudflareContext().env as unknown as Record<string, CfRateLimit | undefined>;
        const limiter = env?.[binding];
        if (limiter && typeof limiter.limit === "function") {
            const { success } = await limiter.limit({ key: token });
            return success;
        }
    } catch {
        // getCloudflareContext() throws outside the Workers runtime (e.g. next dev).
        // Fall through to the in-memory limiter.
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
