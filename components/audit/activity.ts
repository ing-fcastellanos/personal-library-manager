import type { AuditLogEntry } from "@/lib/types/audit-log";

async function listOrEmpty(url: string): Promise<AuditLogEntry[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** Merges entry lists and sorts most-recent-first. */
export function mergeActivity(lists: AuditLogEntry[][]): AuditLogEntry[] {
  return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * A book's "Actividad" (#40, design D5): the household's mental model is
 * "what happened to this book," which includes its copies and reading events
 * too — not just edits to the book document itself. One query per already-loaded
 * copy/event id (household scale — see design.md Risks) merged by `createdAt`.
 */
export async function fetchBookActivity(
  bookId: string,
  copyIds: readonly string[],
  eventIds: readonly string[],
): Promise<AuditLogEntry[]> {
  const urls = [
    `/api/audit-log?entityType=book&entityId=${bookId}`,
    ...copyIds.map((id) => `/api/audit-log?entityType=copy&entityId=${id}`),
    ...eventIds.map(
      (id) => `/api/audit-log?entityType=readingEvent&entityId=${id}`,
    ),
  ];
  const lists = await Promise.all(urls.map(listOrEmpty));
  return mergeActivity(lists);
}
