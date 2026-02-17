import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const { name, description } = await req.json();
        const id = parseInt(idStr);

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const updated = await db.update(categories)
            .set({ name, description })
            .where(eq(categories.id, id))
            .returning();

        if (updated.length === 0) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        await broadcast({ event: "category_updated", data: { ...updated[0] } });
        return NextResponse.json(updated[0]);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr);

        // First delete all services in this category
        await db.delete(services)
            .where(eq(services.categoryId, id));

        const deleted = await db.delete(categories)
            .where(eq(categories.id, id))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        await broadcast({ event: "category_deleted", data: { id } });
        return NextResponse.json({ message: "Category and its services deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
