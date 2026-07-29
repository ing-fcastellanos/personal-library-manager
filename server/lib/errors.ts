import type { Request, Response } from "express";

/**
 * Logs an internal failure with its request context (method + path) and the error
 * — stack included — to stderr, then sends the generic `500 { error: "internal" }`
 * (#65). The client body never carries internal detail (ADR-0009); the cause goes
 * only to the server log, which on Cloud Run is the log stream (ADR-0001).
 *
 * Use this in every route handler `catch` instead of an inline generic 500, so an
 * internal error can never be answered silently.
 */
export function respondInternal(
  res: Response,
  req: Request,
  err: unknown,
): void {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: "internal" });
}
