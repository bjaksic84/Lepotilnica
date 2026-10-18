import { NextResponse } from "next/server";
import { enquirySchema } from "@/lib/validators";
import { sendEnquiry } from "@/lib/email";
import { contactLimiter, getClientIp, enforceRateLimit } from "@/lib/rate-limit";

/**
 * Website enquiry form.
 *
 * Sends Karin an e-mail and writes nothing to the database — an enquiry is not
 * a booking and must never occupy a slot.
 *
 * Note this does NOT use `runAfterResponse`: the visitor is shown a success
 * message, so the send has to have actually succeeded before we answer. The
 * booking routes can defer their e-mail because the booking row is the source
 * of truth either way; here the e-mail *is* the whole transaction.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const withinLimit = await enforceRateLimit("CONTACT_RATE_LIMITER", ip, contactLimiter, 3);
        if (!withinLimit) {
            return NextResponse.json(
                { error: "Preveč poskusov. Poskusite znova čez nekaj minut ali nas pokličite." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const result = enquirySchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Preverite vnesene podatke.",
                    details: result.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        // Honeypot hit. Answer exactly like a success so a bot gets no signal
        // to iterate against, but send nothing.
        if (result.data.website) {
            return NextResponse.json({ success: true });
        }

        const sent = await sendEnquiry({
            name: result.data.name,
            email: result.data.email,
            phone: result.data.phone || undefined,
            topic: result.data.topic || undefined,
            message: result.data.message,
        });

        if (!sent.success) {
            return NextResponse.json(
                { error: "Sporočila ni bilo mogoče poslati. Pokličite nas ali poskusite pozneje." },
                { status: 502 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
