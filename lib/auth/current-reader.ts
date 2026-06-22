import { cookies } from "next/headers";
import { sessionCookieName, verifySessionCookie } from "./session";
import { findReaderByUid } from "../../services/readers/repository";
import type { Reader } from "../types/reader";

/**
 * Resolve the authenticated reader from the session cookie, for Next RSC / server
 * code (ADR-0011: server is the source of truth). Returns null if unauthenticated.
 */
export async function getCurrentReader(): Promise<Reader | null> {
  const store = await cookies();
  const value = store.get(sessionCookieName)?.value;
  if (!value) return null;
  try {
    const decoded = await verifySessionCookie(value);
    return await findReaderByUid(decoded.uid);
  } catch {
    return null;
  }
}
