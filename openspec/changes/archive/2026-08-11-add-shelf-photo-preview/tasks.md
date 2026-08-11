## 1. Retain the photo

- [x] 1.1 In `components/books/add-book-by-shelf.tsx`, keep the captured photo's data URL in
      state from `onCapture` instead of discarding it, replacing it on retake. Store only
      the assembled data URL — nothing here re-sends the bytes, unlike add-by-photo.

## 2. Results screen

- [x] 2.1 Add a collapsible shelf-photo panel to the results phase, collapsed by default,
      labelled so it reads as the shelf shot rather than a book cover. Wire
      `aria-expanded`/`aria-controls` on the toggle and a descriptive `alt` on the image.
- [x] 2.2 Show the same panel in the "no books recognized" branch of the results phase.
- [x] 2.3 Make the photo open full screen, reusing the existing `@/components/ui/dialog`
      already used for the per-candidate detail dialog, with an accessible title.

## 3. Tests

- [x] 3.1 Extend `components/books/add-book-by-shelf.test.tsx`: the photo is offered but not
      expanded when results appear; toggling expands then collapses it; opening it full
      screen shows the dialog; and a retake replaces the photo that is shown.

## 4. Verification

- [x] 4.1 `npm run lint`, `npm run typecheck`, and the shelf tests clean.
- [x] 4.2 Live check against the emulators at mobile width (375px) with a real shelf photo:
      the collapsed panel does not push the buckets out of view, expanding shows the photo,
      and the full-screen view renders it at viewport width so spines are readable. Confirm
      no horizontal overflow, the same failure mode as the book-detail actions.

      Run at 375px against a real shelf photo (25 books identified):
      - Collapsed panel is 40px tall with no image mounted; "21 listos para agregar" and the
        book list sit directly below it — the buckets are not displaced.
      - Expanding renders the photo at 317px, inside the viewport, `aria-controls` resolving
        to a real element. No horizontal page scroll in any state.
      - **This step found a real defect the unit tests could not.** The full-screen view was
        *smaller* than the inline photo (309px vs 317px): the dialog primitive's `p-6` and
        `max-w-lg` ate the width, so "enlarge" shrank it. Fixed by going edge-to-edge below
        `sm` and rendering at natural size in a scrollable container — now **4.79×** the
        inline size (1520px), panning inside the dialog with no page-level overflow.
        `design.md` updated: the original "fit to viewport, rely on pinch-zoom" decision was
        wrong and is recorded as such rather than quietly rewritten.
