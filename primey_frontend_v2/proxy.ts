import { NextResponse, type NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  // Primey auth/workspace routing is handled by AuthProvider and route guards.
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/system/:path*", "/company/:path*"],
};
