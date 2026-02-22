import { NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { broadcast } from "@/lib/broadcast";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const { categoryId, name, description, price, duration, isPopular } = await req.json();
        const id = parseInt(idStr);

        if (!categoryId || !name || price === undefined || !duration) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const updated = await db.update(services)
            .set({ categoryId, name, description, price, duration, isPopular })
            .where(eq(services.id, id))
            .returning();

        if (updated.length === 0) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        await broadcast({ event: "service_updated", data: { ...updated[0] } });
        return NextResponse.json(updated[0]);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr);

        const deleted = await db.delete(services)
            .where(eq(services.id, id))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        await broadcast({ event: "service_deleted", data: { id } });
        return NextResponse.json({ message: "Service deleted successfully" });
    } catch (error) {
        console.error("[DELETE /api/admin/services/:id]", error);
        return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }
}
