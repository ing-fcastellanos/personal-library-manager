## 1. Pure helper

- [x] 1.1 Add `shelfEnrichTitleUrl(ai)` to `components/books/shelf-add.ts`: builds `/api/enrich?q=<title only>` (trimmed, encoded), mirroring `shelfEnrichUrl`
- [x] 1.2 Unit-test `shelfEnrichTitleUrl` in `components/books/shelf-add.test.ts` (title only, no authors in query, encoding)

## 2. Fallback in processBook

- [x] 2.1 In `processBook` (`add-book-by-shelf.tsx`), after the combined text search, when there is no ISBN and `best` is null and the book had authors, refetch `shelfEnrichTitleUrl(ai)` and adopt its candidates (first → best, rest → alternatives)
- [x] 2.2 Route a fallback-recovered book to review/`low_confidence` (override classification) so it is offered as a pickable alternative, never blindly auto-added
- [x] 2.3 Keep resilience: a thrown/failed title-only retry leaves the book as `no_match` (unchanged behavior), batch continues

## 3. Tests

- [x] 3.1 Component test: combined query → `[]`, title-only → real candidate ⇒ book lands in the review queue as `low_confidence` with the candidate offered (not the manual-only `no_match` form)
- [x] 3.2 Component test: combined query already returns a candidate ⇒ no title-only request is made
- [x] 3.3 Component test: both queries empty ⇒ book stays `no_match`

## 4. Verify

- [x] 4.1 Lint, typecheck, and the affected test suite green
- [ ] 4.2 Manual QA: scan a book whose author the AI misreads ⇒ the real book now appears as a recommendation in review
