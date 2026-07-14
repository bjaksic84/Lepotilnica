import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";
import { createSessionToken } from "@/lib/session";

export async function POST(request: Request) {
    try {
        // ── Rate limiting ────────────────────────────────────────
        const ip = getClientIp(request);
        const withinLimit = await enforceRateLimit("AUTH_RATE_LIMITER", ip, authLimiter, 5);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many login attempts. Please try again later." },
                { status: 429 }
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

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
