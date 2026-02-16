import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedTimes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const numId = parseInt(id);

        await db.delete(blockedTimes).where(eq(blockedTimes.id, numId));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
