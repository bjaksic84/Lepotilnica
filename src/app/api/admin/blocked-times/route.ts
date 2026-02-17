import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedTimes } from "@/db/schema";
import { blockedTimeSchema } from "@/lib/validators";
import { and, gte, lte } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        let query = db.select().from(blockedTimes);

        if (startDate && endDate) {
            query = query.where(
                and(
                    gte(blockedTimes.date, startDate),
                    lte(blockedTimes.date, endDate)
                )
            ) as typeof query;
        }

        const result = await query;
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = blockedTimeSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const newBlock = await db.insert(blockedTimes).values(result.data).returning().get();
        await broadcast({ event: "blocked_time_created", data: { ...newBlock } });
        return NextResponse.json(newBlock, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
