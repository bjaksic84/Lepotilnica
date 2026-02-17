import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define paths that are protected
    const isProtectedPath = path.startsWith('/admin') && !path.startsWith('/admin/login');

    if (isProtectedPath) {
        const adminSession = request.cookies.get('admin_session');

        if (!adminSession) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    const response = NextResponse.next();

    // ── Security headers ──────────────────────────────────────────────
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    // Prevent MIME-type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    // Referrer policy – send origin only to cross-origin destinations
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // XSS protection (legacy browsers)
    response.headers.set('X-XSS-Protection', '1; mode=block');
    // Disable browser DNS prefetching to prevent info leakage
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    // Permissions policy – restrict powerful browser features
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
    );
    // Strict Transport Security – enforce HTTPS for 1 year
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
    );
    // Content Security Policy
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: ws: https:; frame-ancestors 'none';"
    );

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all paths except static files and _next internals
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
