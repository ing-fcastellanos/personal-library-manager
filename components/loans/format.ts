import { formatReadingDate } from "@/components/reading/history";

/**
 * Pure formatting helpers shared by the loans UI (book detail, /prestamos, the
 * lend dialog) — #39, Claude Design handoff "Préstamos".
 */

/** Whole days between two `YYYY-MM-DD` (or ISO) dates, `to` minus `from`. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00`);
  const b = new Date(`${to.slice(0, 10)}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** "Vence el 3 mar" when on time, "Vencido el 3 mar · hace 5 días" when overdue. */
export function dueLabel(
  dueDate: string,
  overdue: boolean,
  today: string,
): string {
  if (!overdue) return `Vence el ${formatReadingDate(dueDate)}`;
  const late = daysBetween(dueDate, today);
  return `Vencido el ${formatReadingDate(dueDate)} · hace ${late} ${
    late === 1 ? "día" : "días"
  }`;
}

/** First-name + last-name initials, uppercased, for an avatar fallback. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
