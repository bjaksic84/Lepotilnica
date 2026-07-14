/**
 * Signed admin session tokens (HMAC-SHA256 over an expiry claim).
 *
 * Runs in both the middleware and the API route handlers, so it uses only Web
 * Crypto / TextEncoder / btoa — no Node-only APIs. The cookie value is
 * `${payload}.${signature}`; verification recomputes the HMAC (constant-time via
 * crypto.subtle.verify) and rejects anything expired or tampered with.
 *
 * Replaces the previous scheme where the cookie was the static string "true"
 * and the middleware only checked the cookie's *presence* — which was trivially
 * forgeable by sending `Cookie: admin_session=anything`.
 */

const SESSION_TTL_MS = 60 * 60 * 24 * 1000; // 1 day — matches the cookie maxAge.

const encoder = new TextEncoder();

/**
 * Key material for signing. Prefers a dedicated SESSION_SECRET; falls back to
 * ADMIN_PASSWORD so the app keeps working if only the password is configured
 * (the production password is a strong, high-entropy value). Returns null when
 * neither is set, which makes auth fail closed.
 */
function getSecret(): string | null {
    // Bracket access on purpose: it is NOT matched by Next's build-time
    // `process.env.IDENT` inlining, so it stays a runtime lookup and resolves
    // against the values OpenNext copies into process.env on each request —
    // in the middleware (edge) bundle as well as the route handlers.
    return process.env["SESSION_SECRET"] || process.env["ADMIN_PASSWORD"] || null;
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
    const padded =
        input.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (input.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

/** Mint a signed session token, or null if the server isn't configured. */
export async function createSessionToken(): Promise<string | null> {
    const secret = getSecret();
    if (!secret) return null;
    const payload = toBase64Url(
        encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }))
    );
    const key = await importKey(secret);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

/** True only for an unexpired token whose signature verifies against the secret. */
export async function verifySessionToken(
    token: string | undefined | null
): Promise<boolean> {
    if (!token) return false;
    const secret = getSecret();
    if (!secret) return false;
    try {
        const [payload, sig] = token.split(".");
        if (!payload || !sig) return false;
        const key = await importKey(secret);
        // Wrap in a fresh Uint8Array so the buffer generic is ArrayBuffer (not
        // ArrayBufferLike), which is what crypto.subtle's BufferSource expects.
        const ok = await crypto.subtle.verify(
            "HMAC",
            key,
            new Uint8Array(fromBase64Url(sig)),
            encoder.encode(payload)
        );
        if (!ok) return false;
        const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
        return typeof claims.exp === "number" && Date.now() < claims.exp;
    } catch {
        return false;
    }
}
