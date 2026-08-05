import { formatReadingDate } from "@/components/reading/history";
import type { AuditAction } from "@/lib/types/audit-log";

/**
 * Pure formatting helpers for the activity views (#40): a past-tense verb per
 * action, and a coarse relative time ("hace 5 min" / "hace 3 h" / "ayer" /
 * falling back to a date for anything older).
 */

const VERBS: Record<AuditAction, string> = {
  create: "agregó",
  update: "editó",
  delete: "borró",
};

export function actionVerb(action: AuditAction): string {
  return VERBS[action];
}

/** Coarse "hace ..." relative time, falling back to a date past a week. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = now.getTime() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return formatReadingDate(iso);
}
