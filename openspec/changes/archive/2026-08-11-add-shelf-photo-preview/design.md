## Context

`onCapture` in `components/books/add-book-by-shelf.tsx` currently does:

```ts
const { base64, contentType } = await prepareImage(file, MAX_SHELF_EDGE);
const res = await fetch("/api/ai/identify-shelf", { … body: JSON.stringify({ imageBase64: base64, contentType }) });
```

`base64` is a local, used once, then gone. Add-by-photo already solves the same problem the
other way — it keeps `{ dataUrl, base64, contentType }` in state and renders the photo
during review — so this change is closing a gap between two sibling flows, not inventing a
pattern.

The results phase has two branches: the normal hub (shelf picker + auto/review buckets),
and a "No se reconocieron libros" branch when nothing came back.

## Goals / Non-Goals

**Goals:**

- Keep the photo reachable while the reader is judging the results.
- Make spines actually legible, not merely visible.
- Never let the photo displace the results it exists to support.

**Non-Goals:**

- The one-by-one review flow (`ReviewFlow`) — explicitly out of scope.
- Cropping, rotating, or annotating.
- Persisting the photo anywhere.

## Decisions

**Store the assembled `dataUrl`, not `base64` + `contentType`.** Add-by-photo keeps all
three because it re-sends the bytes later as the book's cover. Nothing here re-sends
anything — the only consumer is an `<img src>` — so keeping the raw base64 alongside would
double the memory held for a value nothing reads.

**Collapsed by default, and that is the whole point.** A shelf photo is tall; expanded on
open it would push the auto/review buckets off screen on a phone, which is precisely what
the reader opened the screen to see. The photo is a reference, so it waits to be asked for.

**Full-screen view reuses the existing `Dialog`.** This component already drives a dialog
for the per-candidate metadata (`detail` state), so the pattern, focus handling and dismiss
behavior are established. A second bespoke overlay would be a worse version of one already
here.

**Shown in the "nothing recognized" branch too.** It is the same phase and costs nothing,
and it is arguably where the photo answers the most useful question — *why* did this come
back empty? Seeing a dark or badly framed shot explains it immediately, and that branch's
own advice ("probá con más luz o enfocando los lomos") is guesswork until the reader can
check.

**The full-screen view renders the photo at natural size in a scrollable container, not
fitted to the viewport.** ~~Fit it to viewport width and rely on the browser's pinch-zoom.~~

The original decision was wrong, and live verification is what caught it. Fitting a wide
shelf photo to a portrait phone produced an "enlarged" view **narrower than the inline
one** — 309px against 317px, once the dialog primitive's `p-6` and `max-w-lg` were
accounted for. A zoom that shrinks the image defeats its only purpose.

Rendering at natural width inside an `overflow-auto` container instead measures **4.79×**
the inline size (1520px against 317px) and pans within the dialog, without leaking
horizontal scroll to the page. This is still not a custom pan-and-zoom widget — it is one
overflow container — so the reasoning that motivated the original decision (do not
reimplement what the platform does) holds; what changed is that "fit to viewport" turned
out not to be a usable starting point on a phone.

The dialog also goes edge-to-edge below `sm` (`p-0`, `max-w-none`), since the primitive's
default padding was a meaningful share of a 375px viewport.

## Risks / Trade-offs

- **[Trade-off]** Up to ~1 MB of data URL held in component state for the length of a
  session. Acceptable at household scale for a flow the reader is actively looking at, and
  it is released on unmount or replaced on retake. The alternative — re-reading the file —
  is not available, since the `File` is not retained either.
- **[Risk]** A collapsible section adds vertical shift to the results when toggled →
  **Mitigation**: it sits at the top of the results, above the buckets, so expanding pushes
  content down predictably rather than moving something the reader is mid-read of.
- **[Risk]** The panel could be mistaken for a book cover rather than the shelf shot →
  **Mitigation**: an explicit label naming it the shelf photo, plus a descriptive `alt`.

## Migration Plan

None — additive UI within one component, no persisted state, nothing to roll back beyond
reverting the component.
