/** Session settings shared by middleware (edge), server actions and the browser idle timer. */
export const TOKEN_COOKIE = "orderops_token";

/** Sign out after this long without mouse, keyboard, scroll or touch activity. */
export const IDLE_TIMEOUT_SECONDS = 15 * 60;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: IDLE_TIMEOUT_SECONDS, // sliding: middleware renews it on every request; the token itself expires after 12h
  path: "/",
};
