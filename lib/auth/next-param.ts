/**
 * Builds the `next` redirect param from the current location, preserving the
 * full path AND query string (#10) so a scanned `?shelf=` survives sign-in.
 * Called from client event handlers (reads `window.location`).
 */
export function buildNextParam(): string {
  if (typeof window === "undefined") return "";
  return encodeURIComponent(window.location.pathname + window.location.search);
}
