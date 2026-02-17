/**
 * In-memory sliding-window rate limiter.
 * Each limiter tracks requests per IP within a rolling time window.
 *
 * Usage:
 *   const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });
 *   const { success } = await limiter.check(ip, maxRequests);
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

    // Periodic cleanup to prevent memory leaks
    const cleanup = () => {
        const now = Date.now();
        for (const [key, entry] of tokenCache) {
            if (now > entry.resetAt) {
                tokenCache.delete(key);
            }
        }
        // Evict oldest entries if we exceed capacity
        if (tokenCache.size > uniqueTokenPerInterval) {
            const entries = [...tokenCache.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
            const toRemove = entries.slice(0, tokenCache.size - uniqueTokenPerInterval);
            for (const [key] of toRemove) {
                tokenCache.delete(key);
            }
        }
    };

    setInterval(cleanup, interval);

    return {
        check: async (token: string, limit: number) => {
            const now = Date.now();
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

// Pre-configured limiters for different endpoints
// Booking: 5 bookings per 15 minutes per IP
export const bookingLimiter = rateLimit({
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 500,
});

// General API: 60 requests per minute per IP
export const apiLimiter = rateLimit({
    interval: 60 * 1000,
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

/**
 * Helper to extract client IP from request headers (works behind reverse proxies)
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }
    return "127.0.0.1";
}
