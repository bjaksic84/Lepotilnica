import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getCustomerHistory } from "@/lib/customer-insight";

// GET /api/admin/customers/history?key=<email|phone> — Every booking of one
// customer, split into upcoming, past and cancelled, plus Karin's notes.
export async function GET(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const key = new URL(request.url).searchParams.get("key");
        if (!key) {
            return NextResponse.json({ error: "key is required" }, { status: 400 });
        }

        const history = await getCustomerHistory(key);
        if (!history) {
            return NextResponse.json({ error: "Invalid customer key" }, { status: 400 });
        }
        return NextResponse.json(history);
    } catch (error) {
        console.error("Failed to fetch customer history:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
