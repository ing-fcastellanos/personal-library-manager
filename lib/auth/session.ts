import { getAdminAuth } from "../firebase/admin";

/**
 * Server-authoritative session cookies (ADR-0011). The Client SDK obtains an ID
 * token at sign-in; the server exchanges it for an httpOnly session cookie.
 */
const COOKIE = "pl_session";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // Firebase max session cookie lifetime

export const sessionCookieName = COOKIE;

export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn: MAX_AGE_MS });
}

/** Verifies the session cookie and checks for revocation. */
export async function verifySessionCookie(cookie: string) {
  return getAdminAuth().verifySessionCookie(cookie, true);
}

export function sessionCookieOptions(dev: boolean) {
  return {
    httpOnly: true,
    secure: !dev,
    sameSite: "lax" as const,
    maxAge: MAX_AGE_MS,
    path: "/",
  };
}
