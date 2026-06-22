import { Router, type Request } from "express";
import { randomBytes } from "crypto";
import { getAdminAuth } from "../../lib/firebase/admin";
import {
  createSessionCookie,
  sessionCookieName,
  sessionCookieOptions,
  verifySessionCookie,
} from "../../lib/auth/session";
import {
  findReaderByEmail,
  findReaderByUid,
  getReader,
  assignUid,
  setPinHash,
} from "../../services/readers/repository";
import {
  hashPin,
  verifyPin,
  isLocked,
  recordFailure,
  recordSuccess,
} from "../../lib/auth/pin";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth";
import { toClientReader } from "../../lib/types/reader";

const dev = process.env.NODE_ENV !== "production";
const CSRF_COOKIE = "csrf";
const router = Router();

function cookies(req: Request): Record<string, string> {
  return (req.cookies ?? {}) as Record<string, string>;
}

/** Issues a CSRF token (double-submit) the client echoes on the session exchange. */
router.get("/auth/csrf", (req, res) => {
  const token = cookies(req)[CSRF_COOKIE] ?? randomBytes(16).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: !dev,
    sameSite: "lax",
    path: "/",
  });
  res.json({ csrfToken: token });
});

/** Exchange a Firebase ID token for a session cookie (closed membership). */
router.post("/auth/session", async (req, res) => {
  const idToken = req.body?.idToken as string | undefined;
  const csrfHeader = req.header("x-csrf-token");
  const csrfCookie = cookies(req)[CSRF_COOKIE];
  if (!idToken) {
    res.status(400).json({ error: "missing idToken" });
    return;
  }
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    res.status(403).json({ error: "csrf" });
    return;
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (!decoded.email || decoded.email_verified !== true) {
      res.status(403).json({ error: "email not verified" });
      return;
    }
    const reader = await findReaderByEmail(decoded.email);
    if (!reader) {
      res.status(403).json({ error: "not a member" });
      return;
    }
    if (reader.uid && reader.uid !== decoded.uid) {
      res.status(403).json({ error: "reader already linked" });
      return;
    }
    if (!reader.uid) await assignUid(reader.id, decoded.uid);
    await getAdminAuth().setCustomUserClaims(decoded.uid, {
      readerId: reader.id,
    });
    const cookie = await createSessionCookie(idToken);
    res.cookie(sessionCookieName, cookie, sessionCookieOptions(dev));
    res.json({ reader: toClientReader({ ...reader, uid: decoded.uid }) });
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
});

/** Logout: clear the cookie and revoke refresh tokens. */
router.delete("/auth/session", async (req, res) => {
  const cookie = cookies(req)[sessionCookieName];
  if (cookie) {
    try {
      const decoded = await verifySessionCookie(cookie);
      await getAdminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // ignore — clearing the cookie below is enough
    }
  }
  res.clearCookie(sessionCookieName, { path: "/" });
  res.json({ ok: true });
});

/** Current reader from the session (server is the source of truth). */
router.get("/auth/me", async (req, res) => {
  const cookie = cookies(req)[sessionCookieName];
  if (!cookie) {
    res.json({ reader: null });
    return;
  }
  try {
    const decoded = await verifySessionCookie(cookie);
    const me = await findReaderByUid(decoded.uid);
    res.json({ reader: me ? toClientReader(me) : null });
  } catch {
    res.json({ reader: null });
  }
});

/** Set/change the current reader's PIN (device-switch unlock, ADR-0012). */
router.post("/auth/pin", requireAuth, async (req, res) => {
  const reader = (req as AuthedRequest).reader!;
  const pin = req.body?.pin as string | undefined;
  if (typeof pin !== "string" || pin.length < 4) {
    res.status(400).json({ error: "pin must be at least 4 characters" });
    return;
  }
  await setPinHash(reader.id, hashPin(pin));
  res.json({ ok: true });
});

/** Verify a reader's PIN (rate-limited) — used by the reader-switch flow (#11). */
router.post("/auth/pin/verify", async (req, res) => {
  const readerId = req.body?.readerId as string | undefined;
  const pin = req.body?.pin as string | undefined;
  if (typeof readerId !== "string" || typeof pin !== "string") {
    res.status(400).json({ error: "bad request" });
    return;
  }
  if (isLocked(readerId)) {
    res.status(429).json({ error: "locked" });
    return;
  }
  const reader = await getReader(readerId);
  if (!reader?.pinHash || !verifyPin(pin, reader.pinHash)) {
    recordFailure(readerId);
    res.status(401).json({ ok: false });
    return;
  }
  recordSuccess(readerId);
  res.json({ ok: true });
});

export default router;
