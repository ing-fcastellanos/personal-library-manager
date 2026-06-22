import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * PIN hashing + verification (ADR-0012). The PIN is a device-switch unlock, never
 * an identity credential. Stored as `scrypt$<salt>$<hash>` in reader.pinHash.
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const computed = scryptSync(pin, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(computed, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- In-memory rate limit (per instance; ADR-0012 notes moving to Firestore if abused).
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function isLocked(key: string): boolean {
  const entry = attempts.get(key);
  return Boolean(entry && entry.lockedUntil > Date.now());
}

export function recordFailure(key: string): void {
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

export function recordSuccess(key: string): void {
  attempts.delete(key);
}
