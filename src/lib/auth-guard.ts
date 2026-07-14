import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

/**
 * Defense-in-depth admin check for /api/admin/* route handlers. The middleware
 * already gates these paths, but each handler re-verifies the signed session
 * cookie independently so that a routing/matcher change (or a future middleware
 * bypass) can never silently expose customer data. Returns a 401 response to
 * short-circuit the handler, or null when the caller is authenticated.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
    const token = (await cookies()).get("admin_session")?.value;
    if (!(await verifySessionToken(token))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}
