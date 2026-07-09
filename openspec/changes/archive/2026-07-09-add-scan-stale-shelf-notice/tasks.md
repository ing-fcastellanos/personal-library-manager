## 1. Stale shelf notice

- [x] 1.1 In `components/books/add-book.tsx`, after the `shelves` fetch resolves, check whether `scanShelf` is present but absent from the loaded list; if so, toast a one-time notice ("Ese estante ya no existe") via `useToast`. Guard with a `useRef` so it fires once even if `AddBook` re-renders.
- [x] 1.2 Component tests: toasts when the scanned shelf id isn't in the loaded shelf list; does not toast when it matches; does not toast again on a later re-render with the same stale id.

## 2. Verify

- [x] 2.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.
- [x] 2.2 Manual end-to-end check closing out M6: scan a real printed action QR (#31) and a real shelf QR (#33), confirm routing + auth gating + shelf preselection all work, and confirm the new notice appears for a shelf QR pointing at a deleted shelf.
