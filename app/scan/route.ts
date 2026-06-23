import { NextResponse, type NextRequest } from "next/server";

/**
 * QR deep-link resolver (#10, ADR-0006). The printed QR encodes a stable
 * `/scan?action=…&shelf=…` URL; this maps the action to its app route (so
 * internal routes can change without reprinting) and carries the shelf along.
 * The QR never holds a credential — `add`/`finish` are gated downstream (#9).
 *
 * Emits a RELATIVE Location so the browser resolves it against the real origin
 * (correct behind the custom Express server / Cloud Run, where deriving the
 * absolute host from the request is unreliable).
 */
const ACTION_ROUTES: Record<string, string> = {
  dashboard: "/",
  add: "/agregar",
  finish: "/leido",
};

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "";
  const shelf = searchParams.get("shelf");

  const path = ACTION_ROUTES[action] ?? "/";
  const location = shelf ? `${path}?shelf=${encodeURIComponent(shelf)}` : path;

  return new NextResponse(null, {
    status: 307,
    headers: { Location: location },
  });
}
