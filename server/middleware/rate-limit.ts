import rateLimit, { type Options } from "express-rate-limit";

/**
 * Write rate-limiting (#42, design.md) — cheap defense in depth against a
 * runaway or malicious write loop against `/api/*`. `GET`s are never limited
 * (they're intentionally public, ADR-0006). The limit is deliberately
 * generous: restoring a backup (#93) or a long CSV import both fire many
 * sequential writes in a short window in normal, legitimate use, and must
 * never trip this.
 *
 * Exposed as a factory (`createWriteRateLimit`) so tests can build an
 * instance with a tiny `limit` instead of firing 600 real requests.
 */
export function createWriteRateLimit(overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "GET",
    message: { error: "too many requests" },
    ...overrides,
  });
}

export const writeRateLimit = createWriteRateLimit();
