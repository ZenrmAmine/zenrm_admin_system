import { NextResponse, type NextRequest } from "next/server";

import { ZENRM_SESSION_COOKIE } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ZENRM_SESSION_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isDashboardRoute && !token) {
    return NextResponse.redirect(new URL("/auth/v2/login", request.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard/events", request.url));
  }

  if (pathname === "/" && !token) {
    return NextResponse.redirect(new URL("/auth/v2/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/dashboard/:path*"],
};
