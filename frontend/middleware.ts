import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "cp26_admin_session";
const ADMIN_LOGIN_PATH = "/aidsadmin";
const ADMIN_DASHBOARD_PATH = "/admin/dashboard";

function withNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === ADMIN_LOGIN_PATH) {
    return withNoStoreHeaders(NextResponse.next());
  }

  if (pathname === ADMIN_DASHBOARD_PATH || pathname.startsWith(`${ADMIN_DASHBOARD_PATH}/`)) {
    const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

    if (!hasSessionCookie) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("next", ADMIN_DASHBOARD_PATH);
      return withNoStoreHeaders(NextResponse.redirect(loginUrl));
    }

    return withNoStoreHeaders(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/aidsadmin", "/admin/dashboard/:path*"]
};
