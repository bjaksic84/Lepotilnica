import { NextResponse } from "next/server";
import { db } from "@/db";
import { customerNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/admin/customers/notes — Add an admin note for a customer
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerEmail, note } = body;

        if (!customerEmail || !note || !note.trim()) {
            return NextResponse.json(
                { error: "customerEmail and note are required" },
                { status: 400 }
            );
        }

        const [inserted] = await db
            .insert(customerNotes)
            .values({
                customerEmail: customerEmail.toLowerCase(),
                note: note.trim(),
                author: "admin",
            })
            .returning();

        return NextResponse.json(inserted, { status: 201 });
    } catch (error) {
        console.error("Failed to add note:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/admin/customers/notes — Delete an admin note
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        await db.delete(customerNotes).where(eq(customerNotes.id, Number(id)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete note:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
