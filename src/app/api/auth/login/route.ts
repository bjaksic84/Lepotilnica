import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";
import {
    clearFailedLogins,
    getLockoutState,
    recordFailedLogin,
} from "@/lib/login-attempts";
import { createSessionToken } from "@/lib/session";

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);

        // ── Coarse shield ────────────────────────────────────────
        // Cheap and keyed at the edge, but approximate — it lets plenty
        // through, so it is not the control that matters here.
        const withinLimit = await enforceRateLimit("AUTH_RATE_LIMITER", ip, authLimiter, 5);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many login attempts. Please try again later." },
                { status: 429 }
            );
        }

        // ── The real lockout ─────────────────────────────────────
        // Counted exactly, in the database. Fails CLOSED: if we cannot read the
        // attempt count we cannot know whether this IP is being brute-forced,
        // and refusing costs nothing real — the dashboard behind this login
        // needs the same database to do anything at all.
        let lockout;
        try {
            lockout = await getLockoutState(ip);
        } catch (err) {
            console.error("[Auth] Could not read login attempts; refusing to authenticate:", err);
            return NextResponse.json(
                { error: "Login is temporarily unavailable. Please try again shortly." },
                { status: 503 }
            );
        }

        if (lockout.lockedOut) {
            return NextResponse.json(
                { error: "Too many failed login attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(lockout.retryAfterSeconds) } }
            );
        }

        const { password } = await request.json();

        // No insecure default: fail closed if the password isn't configured.
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
        if (!ADMIN_PASSWORD) {
            console.error("[Auth] ADMIN_PASSWORD is not configured");
            return NextResponse.json({ error: "Server error" }, { status: 500 });
        }

        if (typeof password === "string" && password === ADMIN_PASSWORD) {
            // Mint a signed, expiring session token (see src/lib/session.ts).
            const token = await createSessionToken();
            if (!token) {
                console.error("[Auth] Unable to mint session token (no signing secret)");
                return NextResponse.json({ error: "Server error" }, { status: 500 });
            }

            (await cookies()).set("admin_session", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 60 * 60 * 24, // 1 day
            });

            // Clean slate for the next login. Never let this break a
            // successful authentication — the worst case is that an earlier
            // fumbled attempt keeps counting until it ages out on its own.
            try {
                await clearFailedLogins(ip);
            } catch (err) {
                console.error("[Auth] Could not clear login attempts:", err);
            }

            return NextResponse.json({ success: true });
        }

        // Record before answering, so the count is already up to date when the
        // next attempt arrives. Wrapped because an unrecorded failure must
        // still be answered with 401 rather than a 500 that reveals the write
        // failed — but it is logged loudly, because silently failing to record
        // is exactly how a lockout stops being a lockout.
        try {
            await recordFailedLogin(ip);
        } catch (err) {
            console.error("[Auth] FAILED TO RECORD a failed login attempt:", err);
        }

        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
