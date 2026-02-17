import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";

export async function GET() {
    try {
        const allCategories = await db.select().from(categories).orderBy(categories.createdAt);
        return NextResponse.json(allCategories);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const newCategory = await db.insert(categories).values({
            name,
            description,
        }).returning();

        await broadcast({ event: "category_created", data: { ...newCategory[0] } });
        return NextResponse.json(newCategory[0]);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
