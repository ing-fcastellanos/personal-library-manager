import type { ErrorRequestHandler } from "express";

/**
 * Central API error backstop (#65). Mounted after the `/api` routers, it catches
 * anything a route handler's own `catch` misses — a synchronous throw, an
 * `express.json` body-parse error (which Express routes here, not to the handler),
 * or an uncaught rejection surfaced to Express — logs it with the request context,
 * and responds the generic `500 { error: "internal" }`.
 *
 * Scoped to `/api` (mounted with that path prefix), so it never intercepts the
 * Next.js web routes, which have their own error handling. If the response was
 * already started, it delegates to Express's default handler to close the socket.
 */
export const apiErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "internal" });
};
