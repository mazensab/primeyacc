import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/reset-password",
    "/system/:path*",
    "/company/:path*",
  ],
};
