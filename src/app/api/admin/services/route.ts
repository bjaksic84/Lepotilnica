import { NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get("categoryId");

        let allServices;
        if (categoryId) {
            allServices = await db.select().from(services)
                .where(eq(services.categoryId, parseInt(categoryId)))
                .orderBy(services.createdAt);
        } else {
            allServices = await db.select().from(services).orderBy(services.createdAt);
        }

        return NextResponse.json(allServices);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { categoryId, name, description, price, duration, isPopular } = await req.json();

        if (!categoryId || !name || !price || !duration) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newService = await db.insert(services).values({
            categoryId,
            name,
            description,
            price,
            duration,
            isPopular: isPopular || false,
        }).returning();

        await broadcast({ event: "service_created", data: { ...newService[0] } });
        return NextResponse.json(newService[0]);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
    }
}
