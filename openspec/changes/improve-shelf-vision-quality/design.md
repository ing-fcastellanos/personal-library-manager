## Context

The shelf flow runs: `prepareImage` → `POST /api/ai/identify-shelf` (vision) → per-book
`processBook` (enrich + dedupe + classify) → split into auto / review / duplicates. Two
quality failures were confirmed on a real photo:

- **Recall** — the multi-identify prompt says _"Skip items you cannot read"_
  (`services/ai/prompt.ts:26`), so the model omits hard-to-read spines; they vanish from
  the batch entirely (no review entry).
- **Precision** — `classifyShelfBook` (`services/ai/shelf.ts`) treats `enriched` (i.e.
  `rank` returned ≥1 candidate) as sufficient for **auto**. `rank` has no score floor, so a
  misread spine that matches an unrelated edition is auto-added with high confidence.

Both are the same defect from two sides: the flow **drops** uncertain items instead of
funneling them into the review queue that already exists. The review queue is the safety
net; the fix is to make uncertain items land there.

## Goals / Non-Goals

**Goals:**

- Stop losing spines: an uncertain read becomes a low-confidence review item, not a drop.
- Stop auto-adding wrong editions: auto requires the enrichment match to _corroborate_ the
  AI-read title (ISBN matches trusted).
- Keep the rule pure and unit-testable; reuse existing text primitives.
- Capture real shelf photos as manual before/after QA references.

**Non-Goals:**

- Raising `MAX_SHELF_EDGE` beyond 2048, or image tiling/cropping for wide shelves
  (measurable follow-ups once these land).
- Any automated accuracy/recall harness (no labeled data set).
- Touching the single-photo flow (#20) or the enrichment service/ranking internals.

## Decisions

### D1 — Unifying principle: route uncertain items to the review queue

Recall and precision are handled by the same move — funnel doubt into review rather than
dropping (recall) or auto-adding (precision). No new UI: the existing `low_confidence`
review path already offers candidates as "¿es alguno de estos?".

### D2 — Recall via prompt wording only

Reword `IDENTIFY_MULTI_INSTRUCTION` to instruct the model to return every spine, and to
include a hard-to-read spine with its best-guess read and a **low confidence** value
instead of skipping it. The JSON contract (fields, including `confidence`) is unchanged, so
`parseIdentifications` and the engines are untouched. The single-cover instruction is left
as-is. This is the cheapest high-impact recall lever; resolution/tiling stay out of scope.

### D3 — Precision via a title-agreement signal in `classifyProcessed`

`classifyProcessed` already receives `ai` and `best`. It computes title agreement as the
token Jaccard of the slugified titles —
`jaccard(tokenize(slugify(ai.title)), tokenize(slugify(best.title)))` — reusing
`lib/text/slug` and `lib/text/similarity` (the same primitives `rank` and the duplicate
matcher use). Agreement ≥ a threshold ⇒ the match corroborates the read. The threshold is a
named constant tuned against the QA fixtures (starting around 0.3–0.5; a wrong edition like
"Un lugar llamado Carmen Martín Gaite" vs "Entre visillos" scores ~0, a true match scores
high).

### D4 — ISBN matches are trusted and bypass the gate

When the book carried an ISBN (`ai.isbn13`), enrichment used the authoritative ISBN path,
so the title-agreement gate is skipped — a correct ISBN match must not be demoted just
because the AI misread the printed title. `classifyProcessed` derives
`isbnMatch = Boolean(ai.isbn13?.trim())`; `confirmed = isbnMatch || titleAgrees`.

### D5 — Rule ordering: unconfirmed is checked before duplicate

`classifyShelfBook` gains a `confirmed` input and the order becomes:

```
conf < threshold      → review/low_confidence
!enriched             → review/no_match
enriched && !confirmed → review/low_confidence   ← NEW
duplicate             → review/duplicate
otherwise             → auto
```

Unconfirmed is checked before `duplicate` because the duplicate was detected against the
unconfirmed (possibly wrong) candidate, so that duplicate signal is itself unreliable —
better to review the match first.

### D6 — Title-agreement and the existing title-only fallback are complementary

The `add-shelf-enrich-title-fallback` change already routes author-misread recoveries to
`low_confidence` via an explicit `recovered` override in `processBook`. That override stays:
a recovered book's title _agrees_ (it was a title search), so the new gate would not catch
it — the override handles the misread-author case, the gate handles the misread-title case.
The two cover different failure modes and do not conflict.

### D7 — QA fixtures as a manual aid under the change

Add 2–3 real shelf photos (including the reported one) under
`openspec/changes/improve-shelf-vision-quality/qa/`, each with a short note: expected book
count and any known-tricky spines. Used to eyeball recall/precision before vs after. Not
wired to automated tests — there is no labeled set and binary images don't belong in the
unit lanes.

## Risks / Trade-offs

- **[Threshold too strict → too much review]** → Start conservative and validate against the
  fixtures; the goal is "auto correct + review recoverable", not "everything to review".
- **[Threshold too loose → swaps still slip through]** → Same fixture validation; the gate
  only needs to catch gross title disagreement (≈0 Jaccard), which is the observed failure.
- **[Very short titles (one token, e.g. "Diario")]** → Jaccard is 0/1 there: an exact match
  passes, a wrong match fails — acceptable; no special-casing.
- **[Prompt change increases low-confidence volume]** → Intended: those are spines we were
  losing. The review queue already handles them; net UX is strictly better than a silent drop.
