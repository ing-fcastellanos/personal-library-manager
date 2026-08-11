## Why

After a shelf photo is analyzed, the reader lands on a list of identified books with no
way back to the photo that produced it. Deciding whether "Tsunami" is really the book on
the shelf, or which spine an odd result came from, means remembering what was in frame —
and the photo is gone by then: `onCapture` reads it into a local variable, sends it, and
discards it.

That matters most exactly where the flow is weakest. Books the AI was unsure about land in
the review bucket, and the reader is asked to judge them with nothing to judge against.

## What Changes

- The captured shelf photo is retained for the duration of the flow instead of being
  discarded after the request.
- On the results screen, a collapsible panel shows it. It starts **collapsed** so it never
  pushes the results — the thing the reader came to read — out of view.
- Tapping the photo opens it full screen, so spines are actually legible. An inline photo
  is ~330px wide on a phone: enough to orient yourself, not enough to read a spine, which
  is the whole point of looking.
- Retaking a photo replaces the retained one.

**Not changed**: the review flow (`ReviewFlow`) does not get the photo — scoped out
deliberately; cropping or rotating; storing the shelf photo in Storage or attaching it to
the created books (covers are handled separately); and the identification and
classification pipeline.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ai-shelf-add`: adds a requirement that the captured photo stays available for reference
  while the results are on screen, expandable and collapsible, with a full-screen view. It
  is modeled as a new requirement rather than an edit to "Shelf photo entry point and
  processing" — that one is about capturing and processing; this is a separate observable
  capability layered on the results, and folding it in would blur what that requirement
  promises.

## Impact

- `components/books/add-book-by-shelf.tsx` — retain the photo in state; add the panel and
  the full-screen view on the results phase.
- No API, service, or schema change. Nothing is uploaded or persisted: the photo lives in
  component state and is released when the flow unmounts or a new photo replaces it.
- **Memory**: a shelf photo is downscaled to `MAX_SHELF_EDGE` (2048px) at JPEG quality
  0.85, so its data URL runs from a few hundred KB to roughly 1 MB. Held for the length of
  one add-by-shelf session only.
