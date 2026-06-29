## 1. Pure helpers

- [x] 1.1 Add `components/books/shelf-add.ts`: types for a processed shelf book (AI candidate + enrichment best/alternatives + duplicate + classification)
- [x] 1.2 Helper to build the per-book enrichment query (ISBN when present, else `title authors`)
- [x] 1.3 Helper to split processed books into `auto` / `review`, and group `review` by reason (with duplicates separated)
- [x] 1.4 Allow a larger max edge (~2048px) for the shelf downscale (extend/parametrize `prepareImage` or a thin wrapper)
- [x] 1.5 Unit-test the helpers (emulator-free)

## 2. Capture + processing

- [x] 2.1 Add `components/books/add-book-by-shelf.tsx` with the state machine (capture → analyzing → processing → results → review → done)
- [x] 2.2 Capture via `<input capture="environment">` + shelf-tuned downscale; POST to `/api/ai/identify-shelf`
- [x] 2.3 Per-book loop: enrich (`/api/enrich`) + dedupe (`/api/books/duplicates`) + classify; show "Procesando N/M"; per-book try/catch → `review:no_match`
- [x] 2.4 Error/empty states (no engine, no books) with retake

## 3. Results: auto preview + shelf

- [x] 3.1 Results screen: single shelf selector (loads `/api/shelves`) applied to the whole batch
- [x] 3.2 Auto summary list + "Agregar los N" → intake per book (enrichment cover, batch shelf); surface per-book failures without aborting
- [x] 3.3 "Revisar →" entry showing the count of doubtful books
- [x] 3.4 Cherry-pick: per-book include/exclude toggle + a detail dialog; "Agregar los N" reflects the selection and skips excluded books

## 4. Review queue

- [x] 4.1 One-by-one reviewer: counter "N de M", auto-advance, optional back; sticky actions; no per-item shelf photo
- [x] 4.2 `low_confidence` item: compact candidate card + enrichment alternatives (tap to swap) + opt-in edit → confirm (intake) / discard
- [x] 4.3 `no_match` item: editable form → confirm (intake) / discard
- [x] 4.4 Duplicates grouped: bulk "Saltar todos" / "Agregar todos como copia" (`POST /api/copies` per match)
- [x] 4.5 Final "done" summary (added / skipped counts)

## 5. Wire-in + tests

- [x] 5.1 Add the third "Por estante" tab in `app/agregar/page.tsx`
- [x] 5.2 Component test: process a mocked shelf → auto preview adds via intake; a review item confirms; a duplicate group adds as copy
- [x] 5.3 Run lint, typecheck, and the test suite green

## 6. Claude Design handoff

- [x] 6.1 Generate the Claude Design prompt: states (capturing, analyzing, processing N/M, results summary, review item per reason, duplicates group, done), mobile-first, a11y, design tokens (M0)
- [x] 6.2 Produce the design in Claude Design and validate against the base design system
- [x] 6.3 Integrate the handoff: map markup to Next components + tokens/styles
- [x] 6.4 QA visual responsive + accessibility

## 7. Verify

- [x] 7.1 Confirm no API key reaches the client; capture is write-gated
- [ ] 7.2 Manual check: shelf photo → confident auto-added after preview + doubtful reviewed one-by-one, all on one shelf
