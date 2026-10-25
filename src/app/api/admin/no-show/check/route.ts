import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getBlacklistStatus } from "@/lib/blacklist";

// GET /api/admin/no-show/check?email=...&phone=... — Is this customer
// (e-mail + phone) blacklisted?
export async function GET(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");
        const phone = searchParams.get("phone");

        if (!email) {
            return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
        }

        const status = await getBlacklistStatus(email, phone);
        return NextResponse.json({
            isBlacklisted: status.blacklisted,
            noShowCount: status.activeNoShows,
            manual: status.manual,
        });
    } catch (error) {
        console.error("Blacklist check error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
