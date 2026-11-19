import { NextResponse } from "next/server";

/**
 * Cookie names to clear on logout.
 * Keep the one your login actually sets (check DevTools > Application > Cookies).
 * Extra names are harmless: clearing a cookie that does not exist does nothing.
 */
const AUTH_COOKIES = [
  "token",
  "access_token",
  "refresh_token",
  "auth_token",
  "session"
];

export async function POST() {
  const res = NextResponse.json({ ok: true });

  for (const name of AUTH_COOKIES) {
    res.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
  }

  // Never let a browser or proxy cache this response
  res.headers.set("Cache-Control", "no-store");

  return res;
}