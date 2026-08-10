import { getAdminAuth } from "../firebase/admin";

/**
 * Server-authoritative session cookies (ADR-0011). The Client SDK obtains an ID
 * token at sign-in; the server exchanges it for an httpOnly session cookie.
 */
/**
 * MUST stay `__session`. Firebase Hosting (which fronts Cloud Run since
 * `add-firebase-hosting-proxy`) strips every cookie from a forwarded request
 * except one literally named `__session` — so any other name simply never
 * reaches this server. Verified against production: a request carrying
 * `pl_session=…; csrf=…` arrived with no cookies at all, while `__session=…`
 * came through. Renaming this breaks login silently — the sign-in succeeds,
 * `Set-Cookie` is honored by the browser, and every later request just looks
 * signed-out.
 */
const COOKIE = "__session";
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
