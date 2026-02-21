import { NextResponse } from "next/server";
import { db } from "@/db";
import { noShows } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/admin/no-show/check?email=... — Check if customer is blacklisted
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email")?.toLowerCase();

        if (!email) {
            return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
        }

        const record = await db
            .select()
            .from(noShows)
            .where(eq(noShows.customerEmail, email))
            .get();

        const noShowCount = record?.count || 0;
        const isBlacklisted = noShowCount >= 2;

        return NextResponse.json({
            isBlacklisted,
            noShowCount,
        });
    } catch (error) {
        console.error("Blacklist check error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
