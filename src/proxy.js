import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (token && JWT_SECRET) {
    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Invalid or expired tokens must sign in again.
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};