/**
 * Builds absolute `/scan?action=...` URLs for the printable action QRs (#31)
 * and, optionally, a shelf-scoped variant (#33). Absolute, not relative — a
 * phone camera has no "current origin" to resolve a relative path against.
 * Action keys match `app/scan/route.ts`'s `ACTION_ROUTES` (#10); this file
 * doesn't route anything, it only encodes the same deep-links that resolver
 * already understands.
 */
export interface ScanAction {
  action: "dashboard" | "add" | "finish";
  label: string;
}

export const SCAN_ACTIONS: ScanAction[] = [
  { action: "dashboard", label: "Ver dashboard" },
  { action: "add", label: "Agregar libro" },
  { action: "finish", label: "Registrar leído" },
];

export function scanUrl(
  action: ScanAction["action"],
  origin: string,
  shelfId?: string,
): string {
  const url = `${origin}/scan?action=${action}`;
  return shelfId ? `${url}&shelf=${encodeURIComponent(shelfId)}` : url;
}
