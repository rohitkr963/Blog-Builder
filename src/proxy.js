import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  const isPublicPage = ["/", "/login", "/signup"].includes(normalizedPath);
  const isPublicApi =
    normalizedPath.startsWith("/api/auth/") ||
    normalizedPath === "/api/health" ||
    ["/api/public/blogs", "/api/public/categories", "/api/public/tags"].includes(normalizedPath);

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (token && JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload.userId === "string") return NextResponse.next();
    } catch {
      // Invalid or expired tokens must sign in again.
    }
  }

  if (normalizedPath.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};