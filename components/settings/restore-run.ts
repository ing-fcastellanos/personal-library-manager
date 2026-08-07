import type { Backup } from "./backup";
import type { CleanupSnapshot } from "./restore";
import type { RestoreEntityType, RestoreOutcome } from "./restore-summary";

/**
 * Orchestration for restoring a backup (#93, design.md). Client-side loop
 * against the existing per-entity endpoints — same shape as the CSV import
 * (`components/books/import/persist.ts`), not a Firestore `batch()` (that
 * pattern only exists in this repo for cascade-nulling, never for creation).
 *
 * Every `create*` repository mints a new Firestore auto-id — none accept a
 * caller-supplied id — so every restored entity gets a NEW id, and every
 * outgoing cross-reference (`bookId`, `shelfId`, `copyId`, `readerId`,
 * `volumes[].bookId`) is rewritten via `idMap` before the entity that
 * references it is created. Readers are the one exception: they're matched
 * by email and updated in place (no `POST /api/readers` exists — readers are
 * provisioned outside the app, ADR-0012 closed membership).
 */

export interface RestoreIdMap {
  readers: Map<string, string>;
  shelves: Map<string, string>;
  books: Map<string, string>;
  copies: Map<string, string>;
}

function newIdMap(): RestoreIdMap {
  return {
    readers: new Map(),
    shelves: new Map(),
    books: new Map(),
    copies: new Map(),
  };
}

interface WriteResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<WriteResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "network" };
  }
}

async function patchJson(url: string, body: unknown): Promise<WriteResult> {
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: "network" };
  }
}

async function deleteReq(url: string): Promise<WriteResult> {
  try {
    const res = await fetch(url, { method: "DELETE" });
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: "network" };
  }
}

export interface CreateRunResult {
  outcomes: RestoreOutcome[];
  idMap: RestoreIdMap;
}

/** Total number of entities the create phase will process (for progress totals). */
export function createTotal(backup: Backup): number {
  return (
    backup.readers.length +
    backup.shelves.length +
    backup.books.length +
    backup.copies.length +
    backup.series.length +
    backup.readingEvents.length +
    backup.wishlistItems.length +
    backup.loans.length
  );
}

/**
 * Creates every entity from the backup, in dependency order, remapping ids as
 * it goes. Never deletes anything — a failure here only ever produces a
 * `"failed"` outcome, it's the caller's job to decide whether to retry or run
 * cleanup (`creationSucceeded()` from `restore-summary.ts`).
 */
export async function runCreate(
  backup: Backup,
  onProgress: (done: number, total: number) => void,
  initialIdMap?: RestoreIdMap,
): Promise<CreateRunResult> {
  const idMap = initialIdMap ?? newIdMap();
  const outcomes: RestoreOutcome[] = [];
  const total = createTotal(backup);
  let done = 0;
  const tick = () => onProgress(++done, total);
  const push = (o: RestoreOutcome) => {
    outcomes.push(o);
    tick();
  };

  // Readers — update-only, matched by email. Never created, never deleted.
  let existingReaders: { id: string; email?: string | null }[] = [];
  try {
    const res = await fetch("/api/readers");
    if (res.ok) existingReaders = await res.json();
  } catch {
    existingReaders = [];
  }
  const byEmail = new Map(
    existingReaders
      .filter((r): r is { id: string; email: string } => Boolean(r.email))
      .map((r) => [r.email, r]),
  );
  for (const reader of backup.readers) {
    const match = reader.email ? byEmail.get(reader.email) : undefined;
    if (!match) {
      push({
        entityType: "reader",
        label: reader.name,
        result: "skipped",
        oldId: reader.id,
        reason:
          "No hay un lector con ese email en esta biblioteca — los lectores se dan de alta aparte.",
      });
      continue;
    }
    idMap.readers.set(reader.id, match.id);
    const updated = await patchJson(`/api/readers/${match.id}`, {
      name: reader.name,
      avatar: reader.avatar,
      displayColor: reader.displayColor,
      goodreadsUrl: reader.goodreadsUrl,
      preferences: reader.preferences,
    });
    push({
      entityType: "reader",
      label: reader.name,
      result: updated.ok ? "updated" : "failed",
      oldId: reader.id,
      newId: match.id,
      reason: updated.error,
    });
  }

  // Shelves — no dependencies.
  for (const shelf of backup.shelves) {
    const created = await postJson("/api/shelves", {
      name: shelf.name,
      location: shelf.location,
      description: shelf.description,
    });
    if (created.ok && created.id) idMap.shelves.set(shelf.id, created.id);
    push({
      entityType: "shelf",
      label: shelf.name,
      result: created.ok ? "created" : "failed",
      oldId: shelf.id,
      newId: created.id,
      reason: created.error,
    });
  }

  // Books — no dependencies.
  for (const book of backup.books) {
    const created = await postJson("/api/books", {
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors,
      publisher: book.publisher,
      publishedYear: book.publishedYear,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      categories: book.categories,
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
      language: book.language,
      description: book.description,
      workKey: book.workKey,
      source: book.source,
      coverSource: book.coverSource,
    });
    if (created.ok && created.id) idMap.books.set(book.id, created.id);
    push({
      entityType: "book",
      label: book.title,
      result: created.ok ? "created" : "failed",
      oldId: book.id,
      newId: created.id,
      reason: created.error,
    });
  }

  // Copies — depend on books (required) and shelves (optional).
  for (const copy of backup.copies) {
    const newBookId = idMap.books.get(copy.bookId);
    if (!newBookId) {
      push({
        entityType: "copy",
        label: "Ejemplar",
        result: "failed",
        oldId: copy.id,
        reason: "El libro asociado no se pudo restaurar.",
      });
      continue;
    }
    const newShelfId = copy.shelfId
      ? (idMap.shelves.get(copy.shelfId) ?? null)
      : null;
    const created = await postJson("/api/copies", {
      bookId: newBookId,
      shelfId: newShelfId,
      condition: copy.condition,
      acquiredAt: copy.acquiredAt,
      notes: copy.notes,
    });
    if (created.ok && created.id) idMap.copies.set(copy.id, created.id);
    push({
      entityType: "copy",
      label: "Ejemplar",
      result: created.ok ? "created" : "failed",
      oldId: copy.id,
      newId: created.id,
      reason: created.error,
    });
  }

  // Series — volumes reference books optionally; a volume whose book failed
  // to restore becomes a "missing volume" (bookId null), same domain meaning
  // as a volume the household never owned (design.md).
  for (const series of backup.series) {
    const volumes = series.volumes.map((v) => ({
      ...v,
      bookId: v.bookId ? (idMap.books.get(v.bookId) ?? null) : null,
    }));
    const created = await postJson("/api/series", {
      name: series.name,
      volumes,
    });
    push({
      entityType: "series",
      label: series.name,
      result: created.ok ? "created" : "failed",
      oldId: series.id,
      newId: created.id,
      reason: created.error,
    });
  }

  // Reading events — depend on readers + books (required), copies (optional).
  for (const event of backup.readingEvents) {
    const newReaderId = idMap.readers.get(event.readerId);
    const newBookId = idMap.books.get(event.bookId);
    if (!newReaderId || !newBookId) {
      push({
        entityType: "readingEvent",
        label: event.bookTitle,
        result: "failed",
        oldId: event.id,
        reason: !newReaderId
          ? "El lector asociado no se pudo restaurar."
          : "El libro asociado no se pudo restaurar.",
      });
      continue;
    }
    const newCopyId = event.copyId
      ? (idMap.copies.get(event.copyId) ?? null)
      : null;
    const created = await postJson("/api/reading-events", {
      readerId: newReaderId,
      bookId: newBookId,
      copyId: newCopyId,
      status: event.status,
      dateStarted: event.dateStarted,
      dateFinished: event.dateFinished,
      rating: event.rating,
      review: event.review,
    });
    push({
      entityType: "readingEvent",
      label: event.bookTitle,
      result: created.ok ? "created" : "failed",
      oldId: event.id,
      newId: created.id,
      reason: created.error,
    });
  }

  // Wishlist items — depend on readers (required), books (optional).
  for (const item of backup.wishlistItems) {
    const newReaderId = idMap.readers.get(item.readerId);
    if (!newReaderId) {
      push({
        entityType: "wishlistItem",
        label: item.bookTitle,
        result: "failed",
        oldId: item.id,
        reason: "El lector asociado no se pudo restaurar.",
      });
      continue;
    }
    const newBookId = item.bookId
      ? (idMap.books.get(item.bookId) ?? null)
      : null;
    const created = await postJson("/api/wishlist-items", {
      readerId: newReaderId,
      bookId: newBookId,
      status: item.status,
      priority: item.priority,
      addedVia: item.addedVia,
      bookTitle: item.bookTitle,
      bookAuthors: item.bookAuthors,
      isbn13: item.isbn13,
      coverUrl: item.coverUrl,
    });
    push({
      entityType: "wishlistItem",
      label: item.bookTitle,
      result: created.ok ? "created" : "failed",
      oldId: item.id,
      newId: created.id,
      reason: created.error,
    });
  }

  // Loans — depend on copies (required). A closed loan needs a 2nd call
  // (no PATCH exists to create it already returned).
  for (const loan of backup.loans) {
    const newCopyId = idMap.copies.get(loan.copyId);
    if (!newCopyId) {
      push({
        entityType: "loan",
        label: loan.bookTitle,
        result: "failed",
        oldId: loan.id,
        reason: "El ejemplar asociado no se pudo restaurar.",
      });
      continue;
    }
    const created = await postJson("/api/loans", {
      copyId: newCopyId,
      borrowerName: loan.borrowerName,
      loanedAt: loan.loanedAt,
      dueDate: loan.dueDate,
      notes: loan.notes,
    });
    if (!created.ok || !created.id) {
      push({
        entityType: "loan",
        label: loan.bookTitle,
        result: "failed",
        oldId: loan.id,
        reason: created.error,
      });
      continue;
    }
    if (loan.returnedAt) {
      const returned = await postJson(`/api/loans/${created.id}/return`, {
        returnedAt: loan.returnedAt,
      });
      push({
        entityType: "loan",
        label: loan.bookTitle,
        result: returned.ok ? "created" : "failed",
        oldId: loan.id,
        newId: created.id,
        reason: returned.ok
          ? undefined
          : "Se creó el préstamo pero no se pudo marcar como devuelto.",
      });
      continue;
    }
    push({
      entityType: "loan",
      label: loan.bookTitle,
      result: "created",
      oldId: loan.id,
      newId: created.id,
    });
  }

  return { outcomes, idMap };
}

type CleanupEntityType = Exclude<RestoreEntityType, "reader">;

const CLEANUP_GROUPS: { type: CleanupEntityType; path: string }[] = [
  { type: "loan", path: "loans" },
  { type: "readingEvent", path: "reading-events" },
  { type: "wishlistItem", path: "wishlist-items" },
  { type: "copy", path: "copies" },
  { type: "book", path: "books" },
  { type: "series", path: "series" },
  { type: "shelf", path: "shelves" },
];

function idsByCleanupGroup(
  snapshot: CleanupSnapshot,
): Record<CleanupEntityType, string[]> {
  return {
    loan: snapshot.loans,
    readingEvent: snapshot.readingEvents,
    wishlistItem: snapshot.wishlistItems,
    copy: snapshot.copies,
    book: snapshot.books,
    series: snapshot.series,
    shelf: snapshot.shelves,
  };
}

/** Total number of entities the cleanup phase will delete (for progress totals). */
export function cleanupTotal(snapshot: CleanupSnapshot): number {
  const idsByGroup = idsByCleanupGroup(snapshot);
  return CLEANUP_GROUPS.reduce((n, g) => n + idsByGroup[g.type].length, 0);
}

/**
 * Deletes the pre-restore snapshot, in reverse dependency order, via the
 * existing per-entity DELETE endpoints — never invoked unless the create
 * phase succeeded in full (caller's responsibility, see `creationSucceeded`).
 */
export async function runCleanup(
  snapshot: CleanupSnapshot,
  onProgress: (done: number, total: number) => void,
): Promise<RestoreOutcome[]> {
  const outcomes: RestoreOutcome[] = [];
  const idsByGroup = idsByCleanupGroup(snapshot);
  const total = cleanupTotal(snapshot);
  let done = 0;
  for (const group of CLEANUP_GROUPS) {
    for (const id of idsByGroup[group.type]) {
      const deleted = await deleteReq(`/api/${group.path}/${id}`);
      outcomes.push({
        entityType: group.type,
        label: id,
        result: deleted.ok ? "deleted" : "failed",
        oldId: id,
        reason: deleted.error,
      });
      onProgress(++done, total);
    }
  }
  return outcomes;
}

/** A fresh, empty id map — exposed so a retry can start from an already-populated one. */
export function createIdMap(): RestoreIdMap {
  return newIdMap();
}

/** Narrows a backup down to only the entities that failed in a previous create run. */
export function filterBackupForRetry(
  backup: Backup,
  outcomes: RestoreOutcome[],
): Backup {
  const failedIds = (type: RestoreEntityType) =>
    new Set(
      outcomes
        .filter((o) => o.entityType === type && o.result === "failed")
        .map((o) => o.oldId),
    );
  return {
    exportedAt: backup.exportedAt,
    readers: backup.readers.filter((r) => failedIds("reader").has(r.id)),
    shelves: backup.shelves.filter((s) => failedIds("shelf").has(s.id)),
    books: backup.books.filter((b) => failedIds("book").has(b.id)),
    copies: backup.copies.filter((c) => failedIds("copy").has(c.id)),
    series: backup.series.filter((s) => failedIds("series").has(s.id)),
    readingEvents: backup.readingEvents.filter((e) =>
      failedIds("readingEvent").has(e.id),
    ),
    wishlistItems: backup.wishlistItems.filter((w) =>
      failedIds("wishlistItem").has(w.id),
    ),
    loans: backup.loans.filter((l) => failedIds("loan").has(l.id)),
  };
}

/** Replaces each previously-failed outcome with its retried result, keeping the rest as-is. */
export function mergeRetryOutcomes(
  previous: RestoreOutcome[],
  retried: RestoreOutcome[],
): RestoreOutcome[] {
  const key = (o: RestoreOutcome) => `${o.entityType}:${o.oldId}`;
  const retriedMap = new Map(retried.map((o) => [key(o), o]));
  return previous.map((o) => retriedMap.get(key(o)) ?? o);
}
