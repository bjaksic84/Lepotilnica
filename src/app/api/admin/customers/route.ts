import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getCustomerSummaries } from "@/lib/customer-insight";
import { anonymiseCustomer, createCustomer, updateCustomer } from "@/lib/customer-admin";
import { editCustomerSchema, newCustomerSchema } from "@/lib/validators";

// GET /api/admin/customers — One summary per customer (e-mail + phone pair).
// The full booking history is fetched per customer from ./history, so the
// list the Logs page polls every 30 seconds stays small.
export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        return NextResponse.json(await getCustomerSummaries());
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const validationError = (fieldErrors: Record<string, string[] | undefined>) =>
    NextResponse.json({ error: "Validation failed", details: fieldErrors }, { status: 400 });

// POST /api/admin/customers — Add a customer who has not booked yet.
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const parsed = newCustomerSchema.safeParse(await request.json());
        if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
        const { customerName, customerEmail, customerPhone, note } = parsed.data;

        const result = await createCustomer({ name: customerName, email: customerEmail, phone: customerPhone }, note);
        if (!result.ok) {
            return NextResponse.json(
                { error: `${result.existing.name} already has this e-mail and phone.`, key: result.existing.key },
                { status: 409 }
            );
        }
        return NextResponse.json({ key: result.key }, { status: 201 });
    } catch (error) {
        console.error("Failed to create customer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT /api/admin/customers — Change a customer's name, e-mail or phone. A
// clash with another customer comes back as 409 until `merge` confirms it.
export async function PUT(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const parsed = editCustomerSchema.safeParse(await request.json());
        if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
        const { key, customerName, customerEmail, customerPhone, merge } = parsed.data;

        const result = await updateCustomer(key, { name: customerName, email: customerEmail, phone: customerPhone }, { merge });
        if (result.ok) return NextResponse.json({ key: result.key, merged: result.merged });
        if (result.reason === "not_found") {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        const { existing } = result;
        return NextResponse.json(
            {
                error: `${existing.name} already has this e-mail and phone.`,
                conflict: { key: existing.key, name: existing.name, visits: existing.visits, upcoming: existing.upcoming },
            },
            { status: 409 }
        );
    } catch (error) {
        console.error("Failed to update customer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/admin/customers?key=… — Delete a customer by anonymising them:
// their bookings stay, without name, contact details or notes.
export async function DELETE(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const key = new URL(request.url).searchParams.get("key");
        if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

        const result = await anonymiseCustomer(key);
        if (result.ok) return NextResponse.json(result);
        if (result.reason === "not_found") {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        return NextResponse.json(
            {
                error: `This customer still has ${result.upcoming} upcoming booking${result.upcoming === 1 ? "" : "s"}. Cancel ${result.upcoming === 1 ? "it" : "them"} first, so nobody loses an appointment without being told.`,
                upcoming: result.upcoming,
            },
            { status: 409 }
        );
    } catch (error) {
        console.error("Failed to delete customer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
