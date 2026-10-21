import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE, cookieOptions } from "@/lib/session";

/**
 * Send signed-out visitors to /login, and renew the session cookie on every request so it only
 * expires after IDLE_TIMEOUT_SECONDS without any. The backend still verifies the token on every API call.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const res = NextResponse.next();
  res.cookies.set(TOKEN_COOKIE, token, cookieOptions);
  return res;
}

export const config = {
  matcher: ["/((?!login|api|health|_next|favicon.ico).*)"],
};
