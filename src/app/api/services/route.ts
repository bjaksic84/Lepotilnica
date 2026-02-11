import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, services } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public endpoint - no auth required
export async function GET() {
    try {
        const allCategories = await db.select().from(categories).orderBy(categories.createdAt);
        const allServices = await db.select().from(services).orderBy(services.createdAt);

        // Group services under their categories
        const result = allCategories.map((cat) => ({
            ...cat,
            services: allServices.filter((s) => s.categoryId === cat.id),
        }));

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }
}
