## Context

#39 wants to track lending a physical book to someone: who has it, since when, and its history. This is the **fourth** entity of a shape the codebase has settled three times (`readingEvents`, `wishlistItems`, and now `loans`): a top-level Firestore collection with derived state (no denormalized flags, data-model Decision D) and a book snapshot so lists render without a join (Decision C). The exploration locked the borrower as free text and resolved every open question, so this design mostly records decisions rather than weighing large architectural forks.

## Goals / Non-Goals

**Goals:**

- Lend a copy, mark it returned, keep the full history, and see what's currently out.
- "Prestado" (and "vencido") are always derived from the loans — never a flag on `copy`.
- Surface loan state where the household already looks: the catalog browse (= the shelf view) and the book detail, plus a dedicated `/prestamos` space.

**Non-Goals:**

- Due-date reminders or notifications (#41) — `dueDate` is stored and shown ("vencido"), nothing is pushed.
- A contacts/address-book entity (phone, etc.) — the borrower is a name, matched by a normalized key.
- Loans between household readers, or lending at the book/edition level (you lend a specific `copy`).

## Decisions

**D1 — A separate `loans` collection, superseding the reserved "campo/subcolección en `copy`".**
The reserved shape (a field on `copy` like `loanedTo`) can hold only the *current* loan; #39 requires **history**. A collection keyed by `copyId` gives history for free, and "prestado" derives from it — exactly parallel to how `readingEvents` backs "leído" and `wishlistItems` backs "comprable". So the reserved shape is dropped.

**D2 — Borrower is free text + a normalized `borrowerKey`; autocomplete from past loans; no contacts entity.**
The borrower is outside the household, so it is **not** a `reader`. A `borrowers` collection (phone, etc.) is over-engineering at this scale (out of scope). Instead: `borrowerName` (display) + `borrowerKey = slugify(borrowerName)` derived server-side (reusing `lib/text/slug`, the same trick as `authorKeys`/`titleKey`). The key groups "everything Juan has/had" and dedupes the **autocomplete**, whose source is the distinct `borrowerName`s already in `loans` — no new collection, no `lentBy` (which household member lent it is not tracked).

**D3 — `returnedAt` absence is the "on loan" state; at most one open loan per copy.**
A loan with `returnedAt == null` is open → its copy is "prestado". `returnLoan` sets `returnedAt`; the row stays as history. `createLoan` **rejects** lending a copy that already has an open loan (the invariant) — enforced by an `openLoanForCopy(copyId)` check, mapped to `409` (a copy can't be in two hands). Uniqueness is enforced by query, per the repo convention (no DB constraint).

**D4 — The loan snapshots the book (Decision C); `copyId` is the required live ref.**
`loans` stores `copyId` (required → `copies`) plus a snapshot `{ bookId, bookTitle, bookAuthors, coverUrl }` captured at lend time, so the `/prestamos` list, per-borrower history, and book-detail card render without a `copy → book` join. `bookId` in the snapshot lets the loan link to the book detail without loading the copy.

**D5 — All loan-derived state is computed in memory, like the catalog.**
`services/loans/views.ts` (pure): `openLoans(loans)`, `loansByBorrower(loans)`, `isCopyLoaned(copyId, loans)`, `loanStateForBook(bookId, copies, loans)` → `{ loanedCount, copyCount, overdue }` for the badge. The catalog service already loads books+copies+events+shelves in memory (design of #17); it adds `loans` and folds per-book loan state into `JoinedBook`. No status-filtered Firestore queries — same reconciliation as `wishlistItems`.

**D6 — `dueDate` optional; "vencido" derived, never pushed.**
`dueDate` is a nullable ISO field. A loan is "vencido" iff `dueDate` is set, in the past, and `returnedAt == null` — shown as a badge on `/prestamos` and the detail card. No reminders/notifications (that's #41). "Today" is computed client-side (the server never compares dates for this), keeping it timezone-simple.

**D7 — Deleting a copy with any loan is blocked (`409`).**
A `copy` is deleted via `DELETE /api/copies/:id`, which today has **no** integrity guard. This change adds `copyHasLoans(copyId)`: if the copy has any loan — open **or** returned/history — the delete is blocked with `409`. Rationale: an open loan means the book is physically out (you can't discard what you don't hold), and returned loans are history worth keeping. This is stricter than the wishlist's "unlink" (D10 there) because a loan is fundamentally *about* that physical copy — a loan whose copy vanished is meaningless, unlike a wish that survives on its snapshot. Book deletion is unaffected (it already blocks while copies exist, #12).

**D8 — Loan state reaches the catalog browse and the book detail as additive display.**
The catalog **browse** shows a "prestado" badge per book from `loanStateForBook` ("N de M prestados" when a book has multiple copies). Because a shelf's contents is the browse filtered by `?shelf=` (shelf-map #18 links there — there is no separate shelf grid), this badge is also how a lent copy reads as "out" on the shelf view — so no separate `shelf-map` change is needed. The book **detail** gains, per copy, its loan state and a **loan-details card** (borrower, since when, due/overdue) with **Prestar** / **Devolver** actions.

**Resulting shape** (`lib/types/loan.ts`, following `lib/types/reader.ts` conventions):

```ts
{
  id, copyId,                    // required → copies
  borrowerName,                  // required, free text (display)
  borrowerKey,                   // normalized slug, derived server-side (D2)
  loanedAt,                      // ISO, required
  dueDate,                       // ISO, optional (D6)
  returnedAt,                    // ISO, optional — null = on loan (D3)
  notes,                         // optional
  // book snapshot at lend time (D4)
  bookId, bookTitle, bookAuthors, coverUrl,
  createdAt, updatedAt
}
```

**Index plan** (same format as `docs/data-model.md`):

```
loans : (copyId ASC, loanedAt DESC)        per-copy history + open-loan lookup   #39
loans : (borrowerKey ASC, loanedAt DESC)   per-person history / "what Juan has"  #39
```

Only these two composite indexes: "open/prestado" and "overdue" are filtered in memory (D5); the unfiltered `listLoans` ordered read and `borrowers` distinct-name read use automatic single-field indexes.

## Risks / Trade-offs

- **[Risk]** Free-text borrowers drift ("Juan" vs "Juan P.") so a person's history splits. → **Mitigation:** `borrowerKey` normalizes case/accents/spacing and the autocomplete steers toward reusing an existing name; a full contacts entity is deliberately out of scope.
- **[Risk]** The snapshot's `bookTitle` can go stale if the book is later edited. → **Mitigation:** accepted — the snapshot is historical ("what the book was when lent", like `readingEvents`); the live `bookId` is there when the current title is needed.
- **[Trade-off]** Blocking copy deletion on *any* loan (D7) is stricter than unlinking. → Accepted: at household scale copies are rarely deleted, and a loan without its copy is meaningless; returning/deleting the loan first is a clear path.
- **[Risk]** `/prestamos` as a 7th top-nav item crowds the mobile bottom nav (already 6 after Deseos). → **Resolved** in the Claude Design handoff: the bottom nav stays at 6 items; `/prestamos` is reached from an "Afuera · N" chip in the catalog header (shown only when something is out) and from each book's per-copy loan card, staying its own route for deep links.

## Migration Plan

Purely additive: a new collection, routes, and screens, plus a new `copyHasLoans` guard on the existing copy-delete path and loan-state folded into the catalog join. No existing document shape changes; an empty `loans` collection is a valid initial state and every derived surface renders empty. `docs/data-model.md` moves Loan from reserved to implemented in this change. Normal PR revert is sufficient rollback.

## Open Questions

None outstanding — the one open question (nav placement) was resolved in the Claude Design handoff; see Risks / Trade-offs.
