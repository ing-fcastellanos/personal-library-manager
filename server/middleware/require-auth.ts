import type { Request, Response, NextFunction } from "express";
import { sessionCookieName, verifySessionCookie } from "../../lib/auth/session";
import { findReaderByUid } from "../../services/readers/repository";
import type { Reader } from "../../lib/types/reader";

/** Express Request augmented with the authenticated reader. */
export interface AuthedRequest extends Request {
  reader?: Reader;
}

/**
 * Rejects with 401 unless the request carries a valid session cookie for a known
 * reader (ADR-0011). Attaches the reader to `req.reader` on success.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const cookie = (req.cookies ?? {})[sessionCookieName] as string | undefined;
  if (!cookie) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  try {
    const decoded = await verifySessionCookie(cookie);
    const reader = await findReaderByUid(decoded.uid);
    if (!reader) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    (req as AuthedRequest).reader = reader;
    next();
  } catch {
    res.status(401).json({ error: "unauthenticated" });
  }
}
