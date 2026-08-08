import type { RequestHandler } from "express";

/**
 * Redirects requests that hit the raw Cloud Run host straight to the
 * canonical custom domain (`CANONICAL_HOST`) — so a stale bookmark, an old
 * magic-link (`continueUrl` is baked from whatever origin the link was
 * requested from), or a manually-typed `*.run.app` URL all converge on one
 * origin. Cookies are host-scoped: a session set on one origin doesn't apply
 * on the other, so mixing them silently looks like "login doesn't stick".
 *
 * Reads `X-Forwarded-Host` first, since Firebase Hosting's rewrite to Cloud
 * Run forwards the original public host there; falls back to `Host`. Only
 * redirects when the resolved host is actually the raw `*.run.app` domain —
 * never for localhost/emulator/an already-canonical/unrecognized host — so a
 * misconfigured `CANONICAL_HOST` can't create a redirect loop or block dev.
 */
export function createCanonicalHostRedirect(
  canonicalHost: string | undefined,
): RequestHandler {
  return (req, res, next) => {
    if (!canonicalHost) {
      next();
      return;
    }
    const forwarded = req.headers["x-forwarded-host"];
    const rawHost =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) ??
      req.headers.host ??
      "";
    const hostname = rawHost.split(",")[0].trim().split(":")[0];
    if (
      hostname &&
      hostname !== canonicalHost &&
      hostname.endsWith(".run.app")
    ) {
      res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
      return;
    }
    next();
  };
}
