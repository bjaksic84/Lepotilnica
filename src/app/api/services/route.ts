import { NextResponse } from "next/server";
import { getCatalogueByCategory } from "@/lib/catalogue";

// Public endpoint - no auth required. The booking flow polls this, so it goes
// through the same in-process cache as the pages rather than re-querying the
// full catalogue on every call.
export async function GET() {
    try {
        return NextResponse.json(await getCatalogueByCategory());
    } catch (error) {
        console.error("Services fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }
}
