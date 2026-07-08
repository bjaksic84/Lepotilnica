import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    // Clear the admin session cookie.
    (await cookies()).set("admin_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });
    return NextResponse.json({ success: true });
}
