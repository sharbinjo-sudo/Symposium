import { NextResponse, type NextRequest } from "next/server";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const ADMIN_SESSION_COOKIE = "cp26_admin_session";
const REGISTRATION_CLOSED_PATH = "/registration-closed";

/**
 * Registration deadline in ISO-8601 (IST).
 * Reads from NEXT_PUBLIC_REGISTRATION_DEADLINE env var with a safe fallback.
 */
const REGISTRATION_DEADLINE = process.env.NEXT_PUBLIC_REGISTRATION_DEADLINE ?? "2026-09-11T00:00:00+05:30";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function withSecurityHeaders(response: NextResponse) {
  // Prevent browsers from MIME-sniffing the response away from the declared content type
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Prevent the page from being embedded in an iframe on other origins
  response.headers.set("X-Frame-Options", "DENY");
  // Control how much referrer information is sent with requests
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict browser features (camera, microphone, geolocation, etc.)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
  );
  // Prevent cached versions of sensitive pages
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Content Security Policy: restricts resource loading to trusted origins.
  // Relaxes style-src to allow inline styles and Google Fonts.
  // Allows data: URIs for images used by the UI.
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.emailjs.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  return response;
}

function isRegistrationClosed(): boolean {
  const deadline = new Date(REGISTRATION_DEADLINE);
  if (Number.isNaN(deadline.getTime())) return false;
  return Date.now() > deadline.getTime();
}

/** Returns true for admin, API, asset, and special paths that must always work. */
function isAlwaysAllowed(pathname: string): boolean {
  // ---- Admin pages ---------------------------------------------------------
  if (
    pathname === "/aidsadmin" ||
    pathname === "/adminlogin" ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/dashboard")
  ) {
    return true;
  }

  // ---- API & internals -----------------------------------------------------
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/static/")) return true;

  // ---- The closed page itself ----------------------------------------------
  if (pathname === REGISTRATION_CLOSED_PATH) return true;

  // ---- Static file extensions (images, robots.txt, etc.) -------------------
  if (pathname.includes(".")) return true;

  return false;
}

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                 */
/* -------------------------------------------------------------------------- */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ====================================================================
  // 1. Admin pages — ALWAYS allowed, completely skip registration gate
  // ====================================================================

  // /aidsadmin — admin panel (no auth required)
  if (pathname === "/aidsadmin") {
    return withSecurityHeaders(NextResponse.next());
  }

  // /adminlogin — alias for admin login
  if (pathname === "/adminlogin") {
    return withSecurityHeaders(NextResponse.next());
  }

  // /admin/login — admin login
  if (pathname === "/admin/login") {
    return withSecurityHeaders(NextResponse.next());
  }

  // /admin/dashboard — requires session cookie
  if (pathname.startsWith("/admin/dashboard")) {
    const hasSession = Boolean(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    );
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/aidsadmin";
      url.searchParams.set("next", "/admin/dashboard");
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // ====================================================================
  // 2. Registration closed gate — only affects PUBLIC pages
  // ====================================================================

  if (isRegistrationClosed() && !isAlwaysAllowed(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = REGISTRATION_CLOSED_PATH;
    url.search = "";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  // ====================================================================
  // 3. Everything else — pass through with security headers
  // ====================================================================

  return withSecurityHeaders(NextResponse.next());
}

/* -------------------------------------------------------------------------- */
/*  Matcher                                                                   */
/* -------------------------------------------------------------------------- */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
