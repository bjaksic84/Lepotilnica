import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-guard";
import { customerNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEmail, normalizePhone } from "@/lib/customer-identity";

// POST /api/admin/customers/notes — Add an admin note for a customer. A
// customer is the e-mail + phone pair, so the note is filed under both.
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const body = await request.json();
        const { customerEmail, customerPhone, note } = body;

        if (typeof customerEmail !== "string" || typeof note !== "string" || !customerEmail.trim() || !note.trim()) {
            return NextResponse.json(
                { error: "customerEmail and note are required" },
                { status: 400 }
            );
        }

        const [inserted] = await db
            .insert(customerNotes)
            .values({
                customerEmail: normalizeEmail(customerEmail),
                customerPhone: typeof customerPhone === "string" ? normalizePhone(customerPhone) || null : null,
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

// PATCH /api/admin/customers/notes — Edit an admin note's text
export async function PATCH(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const { id, note } = await request.json();
        if (!Number.isInteger(id) || typeof note !== "string" || !note.trim()) {
            return NextResponse.json({ error: "id and note are required" }, { status: 400 });
        }

        const updated = await db
            .update(customerNotes)
            .set({ note: note.trim() })
            .where(eq(customerNotes.id, id))
            .returning()
            .get();
        if (!updated) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Failed to edit note:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/admin/customers/notes — Delete an admin note
export async function DELETE(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

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
