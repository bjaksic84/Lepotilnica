import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getCustomerSummaries } from "@/lib/customer-insight";

// GET /api/admin/customers — One summary per customer (e-mail + phone pair).
// The full booking history is fetched per customer from ./history, so the
// list the Logs page polls every 30 seconds stays small.
export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        return NextResponse.json(await getCustomerSummaries());
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
