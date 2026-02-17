import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
    try {
        // ── Rate limiting ────────────────────────────────────────
        const ip = getClientIp(request);
        const { success: withinLimit } = await authLimiter.check(ip, 5);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many login attempts. Please try again later." },
                { status: 429 }
            );
        }

        const { password } = await request.json();

        // In a real app, use a secure environment variable. 
        // Fallback for demo purposes if env not set.
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

        if (password === ADMIN_PASSWORD) {
            // Set HTTP-only cookie
            (await cookies()).set("admin_session", "true", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 60 * 60 * 24, // 1 day
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
