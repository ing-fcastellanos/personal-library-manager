## 1. Type

- [x] 1.1 Create `lib/types/loan.ts` following `lib/types/reader.ts` conventions: `loanSchema` with `copyId` (required), `borrowerName` (required), `borrowerKey`, `loanedAt` (required), `dueDate` (nullish), `returnedAt` (nullish), `notes` (nullish), snapshot `bookId`/`bookTitle`/`bookAuthors`/`coverUrl`, ISO timestamps. Plus `loanCreateSchema` (client supplies copyId/borrowerName/loanedAt/dueDate?/notes?; server derives borrowerKey + snapshot + manages id/timestamps) and `loanReturnSchema` (`returnedAt`).
- [x] 1.2 Unit tests (node lane): valid loan accepted; empty `copyId` rejected; loan with no `returnedAt` accepted (open); no `readerId` and no stored on-loan flag on the schema.

## 2. Repository

- [x] 2.1 Create `services/loans/repository.ts` mirroring `services/reading-events/repository.ts`: `COLLECTION = "loans"`, explicit `mapDoc` with `?? null`, `listLoans`, `getLoan`, `createLoan` (pure write), `updateLoan`, `deleteLoan`.
- [x] 2.2 Relationship reads: `listLoansByCopy(copyId)`, `listLoansByBorrowerKey(borrowerKey)`, `openLoanForCopy(copyId)` (the loan with no `returnedAt`, or null).
- [x] 2.3 Integrity + autocomplete helpers: `copyHasLoans(copyId)` (any loan, open or returned) and `distinctBorrowerNames()` (for autocomplete).
- [x] 2.4 Emulator-backed integration tests: CRUD, relationship reads, `openLoanForCopy`, `copyHasLoans`, distinct names.

## 3. Service

- [x] 3.1 Create `services/loans/service.ts`. `createLoan(input)`: validate the `copyId` exists (throw a `ReferenceNotFoundError`-shaped error like reading-events); reject if `openLoanForCopy` returns a loan (invariant → a `CopyAlreadyOnLoanError`); derive `borrowerKey` via `slugify` and the book snapshot from `copy → book`; insert.
- [x] 3.2 `returnLoan(loanId, returnedAt)`: set `returnedAt` on the loan (404 if missing); idempotency/second-return is out of scope — a returned loan can be corrected via delete.
- [x] 3.3 Emulator-backed integration tests: create validates the copy + derives key/snapshot; a second lend of an on-loan copy is rejected; lend-return-lend works; return sets the date and clears the derived on-loan state.

## 4. Derived views (pure)

- [x] 4.1 Create `services/loans/views.ts`: `isCopyLoaned(copyId, loans)`, `openLoans(loans)`, `loansByBorrower(loans)` (group open loans by `borrowerKey`, display the name), `isOverdue(loan, today)`, and `loanStateForBook(bookId, copies, loans)` → `{ copyCount, loanedCount, overdue }` for the browse badge.
- [x] 4.2 Unit tests: on-loan derived from an open loan and cleared by a return; overdue only when `dueDate` past and not returned; per-book counts across multiple copies; grouping by borrower.

## 5. API

- [x] 5.1 Create `server/routes/loans.ts`: public `GET /loans`, `GET /copies/:copyId/loans`, `GET /borrowers` (distinct names); `requireAuth` on `POST /loans` (lend → `409` if the copy is already on loan, `400` for an unknown copy), `POST /loans/:id/return`, `DELETE /loans/:id`.
- [x] 5.2 Register the router in `server/index.ts`.
- [x] 5.3 Route tests: reads work unauthenticated; writes rejected without a session; lending an on-loan copy → `409`; unknown `copyId` → `400`; return/delete happy paths.

## 6. Integrity and backup wiring

- [x] 6.1 Wire `copyHasLoans` into the copy delete path (`server/routes/copies.ts`): block with `409` when the copy has any loan (open or returned), else delete as before.
- [x] 6.2 Add `loans` to `components/settings/backup.ts` (`Backup` interface, the `Promise.all` over `/api/loans`, and the returned object); extend the backup unit test to assert the `loans` key is present and populated.
- [x] 6.3 Declare the composite indexes in `firestore.indexes.json`: `(copyId, loanedAt DESC)` and `(borrowerKey, loanedAt DESC)`.

## 7. Catalog integration (badge + detail)

- [x] 7.1 Load loans in the catalog service (`services/catalog/service.ts`) and fold per-book loan state into the join (`services/catalog/join.ts` → `JoinedBook`) via `loanStateForBook`, so browse results carry the "prestado" state.
- [x] 7.2 Show the "prestado" badge on the catalog browse result (list + grid), reflecting the loaned/total copy count.
- [x] 7.3 Component tests: a book with an on-loan copy shows the badge; a fully-available book does not.

## 8. UI: lend / return / prestamos

- [x] 8.1 Book detail (`components/catalog/book-detail.tsx`): per copy, show its loan state — an available copy offers **Prestar** (form: borrower with autocomplete, loan date, optional due date, notes), a copy on loan shows a **loan-details card** (borrower, since when, due/overdue) with **Devolver**.
- [x] 8.2 `app/prestamos/page.tsx`: everything currently out (open loans) grouped by borrower, with an overdue indicator, plus access to the full history. Per the design handoff's resolved nav question, no 7th bottom-nav item: reached via the catalog's "Afuera" chip (`components/catalog/catalog-browse.tsx`); `/prestamos` stays its own route.
- [x] 8.3 Component tests: lending an available copy shows its card and the return action; `/prestamos` groups open loans by borrower and flags an overdue one.

## 9. Docs

- [x] 9.1 Update `docs/data-model.md`: add the `loans` collection (fields, relationships, index plan), remove Préstamo/Loan from the reserved-entities table, and record why the implemented shape (own collection keyed by `copyId`) supersedes the reserved one (a field can't hold history).

## 10. Verify

- [x] 10.1 `npm test` (node + jsdom lanes) green; `typecheck` and `lint` clean.
- [ ] 10.2 Exercise the loop against the emulator: lend a copy → it shows on the detail card, on `/prestamos`, and as a badge in browse; lending it again → `409`; return it → it leaves `/prestamos` and the badge; deleting the copy → `409` while a loan exists; backup includes `loans`.

## 11. Claude Design handoff (#39)

- [x] 11.1 Generate the specific Claude Design prompt for the loan flow: states (available / prestado / vencido / devuelto), the lend form with borrower autocomplete, the per-copy loan card on the detail, the `/prestamos` grouped-by-borrower view, the browse badge, plus nav placement — responsive mobile-first, accessibility, M0 tokens.
- [x] 11.2 Produce the design in Claude Design and validate against the base design system (`Prestamos.dc.html`, same project/tokens as the rest of the design system).
- [x] 11.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 11.4 QA: responsive visual pass + accessibility pass.
