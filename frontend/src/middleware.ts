import { NextResponse, type NextRequest } from "next/server";

/** Send signed-out visitors to /login. The backend still verifies the token on every API call. */
export function middleware(req: NextRequest) {
  if (!req.cookies.has("orderops_token")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!login|api|health|_next|favicon.ico).*)"],
};
