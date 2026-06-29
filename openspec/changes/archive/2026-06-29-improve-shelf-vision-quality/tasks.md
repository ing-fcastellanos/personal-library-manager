## 1. Recall — prompt

- [x] 1.1 Reword `IDENTIFY_MULTI_INSTRUCTION` in `services/ai/prompt.ts`: return every spine; include a hard-to-read spine with its best-guess read and a low confidence value instead of skipping it. Keep the JSON contract and the single-cover instruction unchanged
- [x] 1.2 Update any test that asserts the multi-identify prompt text (e.g. prompt/service tests)

## 2. Precision — title-agreement gate

- [x] 2.1 Add a pure title-agreement helper (slug + token Jaccard of `ai.title` vs `best.title`) with a named threshold constant — colocated with the classification helpers (`components/books/shelf-add.ts` or `services/ai/shelf.ts`)
- [x] 2.2 Extend `classifyShelfBook` (`services/ai/shelf.ts`) to accept a `confirmed` signal; classify an enriched-but-unconfirmed book as review/`low_confidence`, ordered before the duplicate check
- [x] 2.3 In `classifyProcessed` (`components/books/shelf-add.ts`), compute `isbnMatch = Boolean(ai.isbn13)` and `confirmed = isbnMatch || titleAgrees(ai.title, best.title)`, and pass it through
- [x] 2.4 Confirm the existing title-only-fallback `recovered` override still routes author-misreads to `low_confidence` (complementary to the gate)

## 3. Tests

- [x] 3.1 Unit-test the title-agreement helper (corroborating titles pass, unrelated titles fail, short/one-token titles)
- [x] 3.2 Unit-test `classifyShelfBook` / `classifyProcessed`: corroborated → `auto`; enriched-but-unconfirmed → review/`low_confidence`; ISBN match → trusted/`auto`; existing `low_confidence`/`no_match`/`duplicate` cases intact
- [x] 3.3 Shelf component test: a confident book whose enrichment match does not corroborate the title lands in the review queue, not the auto list

## 4. QA fixtures

- [ ] 4.1 Add 2–3 real shelf photos (including the reported one) under `openspec/changes/improve-shelf-vision-quality/qa/`
- [x] 4.2 Add a short note per photo: expected book count + known-tricky spines, for before/after comparison

## 5. Verify

- [x] 5.1 Lint, typecheck, and the affected test suite green
- [x] 5.2 Manual QA against the fixtures: recall (missing spines now appear in review) and precision (wrong editions no longer auto-added); tune the threshold if needed
