import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { parseCustomerKey } from "@/lib/customer-identity";
import { blacklistCustomer, liftBlacklist } from "@/lib/blacklist";

const postSchema = z.object({
    key: z.string().min(3),
    reason: z.string().max(500, "Razlog je predolg (največ 500 znakov)").optional(),
});

/** POST /api/admin/customers/blacklist — Karin blacklists a customer by hand. */
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const parsed = postSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const pair = parseCustomerKey(parsed.data.key);
        if (!pair) {
            return NextResponse.json({ error: "Invalid customer key" }, { status: 400 });
        }
        return NextResponse.json(await blacklistCustomer(pair.email, pair.phone, parsed.data.reason));
    } catch (error) {
        console.error("Blacklist error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/customers/blacklist?key=… — Lift a blacklist, whether
 * Karin set it or no-shows did. The no-shows so far are forgiven.
 */
export async function DELETE(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const pair = parseCustomerKey(new URL(request.url).searchParams.get("key") ?? "");
        if (!pair) {
            return NextResponse.json({ error: "Invalid customer key" }, { status: 400 });
        }
        return NextResponse.json(await liftBlacklist(pair.email, pair.phone));
    } catch (error) {
        console.error("Lift blacklist error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
