## Why

The library tracks what the household owns (`copies`) and reads (`readingEvents`), but not what has left the house. When a physical book is lent to a friend, there's no record of who has it or since when — so it quietly disappears. #39 adds loan tracking: lend an ejemplar to someone, mark it returned, keep the history, and see at a glance what's currently out.

## What Changes

- New `loans` Firestore collection: one loan of a physical **copy** to an outside borrower, carrying `borrowerName` (free text) + a normalized `borrowerKey`, `loanedAt`, an optional `dueDate`, an optional `returnedAt` (its absence **is** the "on loan" state), and a denormalized book snapshot.
- The borrower is **not** a `reader` (household members) — lending is to outsiders, so the borrower is free text with an **autocomplete** of names already used (derived from existing loans; no contacts collection, design D2).
- Lend / return / correct actions: `POST /api/loans`, `POST /api/loans/:id/return`, `DELETE /api/loans/:id` (auth-gated); public reads for the history, per-copy loans, and the borrower-name list.
- Derived state, no stored flag (data-model Decision D): a copy is "prestado" iff it has a loan with no `returnedAt`; **at most one open loan per copy** (enforced on lend); "vencido" iff `dueDate` has passed and it's not returned.
- Three surfaces: a new **`/prestamos`** page listing everything currently out (grouped by borrower) plus history; a **"prestado" badge** in the catalog browse (which is also the shelf view, `/catalogo?shelf=`); and a **loan card** per lent copy on the book detail with lend/return actions.
- Deleting a `copy` with any loan (open or in history) is blocked with `409`.
- The full JSON backup (#36) starts including `loans`.

## Capabilities

### New Capabilities

- `loans`: recording a loan of an owned copy to an outside borrower, marking its return, browsing what's currently out and the full history, and surfacing the "prestado" state across the catalog — with borrower autocomplete and copy-delete integrity.

### Modified Capabilities

- `catalog-search`: the **browse view** gains a "prestado" indicator per book (derived from its copies' open loans — and since a shelf's contents is the browse filtered by `?shelf=`, this is also how a lent copy reads as "out"); the **book detail view** gains, per copy, its loan state and a loan-details card with lend/return actions.
- `json-backup`: the backup file must include the `loans` collection, or a lent-out book vanishes from the backup with no trace.
- `data-model`: document `loans` as an implemented collection with its index plan, and remove Préstamo/Loan from the reserved-entities table (updating the reserved shape, which was "campo/subcolección en `copy`" — superseded because a field can't hold history, see design D1).

## Impact

- **New code:** `lib/types/loan.ts`; `services/loans/{repository,service,views}.ts`; `server/routes/loans.ts` (registered in `server/index.ts`); `app/prestamos/page.tsx` + components; loan card + lend/return UI on the book detail; a "prestado" badge in the catalog browse.
- **Touched:** `services/catalog/{service,join}.ts` (load loans + derive per-book loan state for the badge); `components/catalog/book-detail.tsx` (loan card + actions); `server/routes/copies.ts` delete path (block on `copyHasLoans`); `components/settings/backup.ts` (add `loans`); a nav entry for `/prestamos`.
- **Reused as-is:** `lib/text/slug` (borrowerKey), the intake/reference-validation and derived-in-memory patterns from `readingEvents`/`wishlistItems`/`catalog`.
- **New Firestore indexes** for `loans` (see design).
- **Out of scope:** due-date reminders / push notifications (#41), a contacts/address-book entity with phone numbers, and loans between household readers.
