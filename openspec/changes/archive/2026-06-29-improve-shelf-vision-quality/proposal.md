## Why

The "Por estante" AI flow has two confirmed quality bugs that share one root cause:
**uncertain items are dropped instead of being sent to the existing review queue.**
On a real photo of ~13–15 spines the vision step returned only 11 books (nothing in
review or duplicates — 2+ spines vanished), and wrong editions reached the **auto**
bucket with high confidence (a spine "Entre visillos / Carmen Martín Gaite" matched the
biography "Un lugar llamado Carmen Martín Gaite" by José Teruel). Auto is currently
_assumed_ (both the model and enrichment produced _something_) rather than _earned_
(a legible spine whose enrichment match _corroborates_ the read).

## What Changes

- **Recall (prompt)**: the shelf identify prompt stops telling the model to "skip items
  you cannot read". Instead it returns _every_ spine — illegible ones with a best-guess
  read and a low confidence — so they land in the review queue instead of disappearing.
- **Precision (title-agreement gate)**: a book is classified **auto** only when the
  enrichment best candidate's title corroborates the AI-read title. Unconfirmed matches
  are routed to review (`low_confidence`) so the candidate is offered as "¿es alguno de
  estos?" rather than silently auto-added. ISBN matches are trusted and bypass the gate.
- **QA fixtures**: 2–3 real shelf photos (including the reported one) are captured as
  manual before/after QA references with their expected identifications.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `ai-shelf-add`: the shelf identification requirement gains "include illegible spines as
  low-confidence" behavior; the auto-vs-review classification requirement gains a
  title-agreement gate so an enriched-but-unconfirmed match is reviewed, not auto-added.

## Impact

- `services/ai/prompt.ts` — reword `IDENTIFY_MULTI_INSTRUCTION` only (single-cover prompt
  and the JSON contract are unchanged).
- `components/books/shelf-add.ts` — `classifyProcessed` computes a title-agreement signal
  (reusing `lib/text/slug` + `lib/text/similarity`) and feeds it into the rule.
- `services/ai/shelf.ts` — `classifyShelfBook` accepts the new "confirmed" signal so an
  unconfirmed text match no longer qualifies as `auto`.
- Tests: `services/ai/shelf.test.ts`, `components/books/shelf-add.test.ts`,
  `components/books/add-book-by-shelf.test.tsx`, and any test snapshotting the multi prompt.
- New manual-QA fixtures under the change directory.
- No change to the single-photo flow (#20), the enrichment service, or `MAX_SHELF_EDGE`.
