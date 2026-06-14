// Middleware guards /admin/* routes.
// Presence-only check: if the access_token cookie is absent, redirect to /login.
// The backend enforces real JWT validation on every API call — this is just a
// UX guard to prevent unauthenticated users from seeing the admin UI at all.

import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token");
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
