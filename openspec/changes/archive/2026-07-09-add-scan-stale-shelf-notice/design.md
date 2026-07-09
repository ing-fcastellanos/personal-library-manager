## Context

`AddBook` fetches `shelves` asynchronously (`useEffect` → `GET /api/shelves`) and reads `scanShelf` synchronously from `useShelf()` (already captured from the URL/sessionStorage by #10's `ShelfProvider`). Both feed `AddBookForm`'s `initialShelfId` today; this change only adds a check between them, no new data source.

## Goals / Non-Goals

**Goals:**

- Tell the reader, once, when a scanned shelf id doesn't match any of their current shelves — so a stale/deleted-shelf QR fails loud instead of silently dropping the preselection.

**Non-Goals:**

- Any change to the preselection behavior itself when the shelf _does_ exist.
- Removing or "cleaning up" the stale `?shelf=` value from the URL/session storage — out of scope, cosmetic at most.
- Handling a malformed `action` (already covered, #10's existing fallback-to-dashboard).

## Decisions

**Decision 1 — A reactive effect over `[scanShelf, shelves, shelvesLoaded]`, not a one-shot check inside the existing fetch.**
Two async sources feed this check, and their arrival order isn't guaranteed: `ShelfProvider`'s effect (parent) sets `shelf` from the URL asynchronously, and on a fresh page load from a scanned QR — the actual scenario this feature is for — `ShelfProvider` and `AddBook` mount together, so `scanShelf` can still be `null` on `AddBook`'s first effect pass and only arrive on a later re-render. A single check made once inside the `shelves` fetch's `.then()` could run before `scanShelf` has settled and never re-check. Instead, a small `shelvesLoaded` boolean (set once the fetch settles, success or failure) plus a separate effect keyed on `[scanShelf, shelves, shelvesLoaded]` re-evaluates whenever either input changes, so it's correct regardless of which one arrives first. `shelves.length === 0` alone can't stand in for "not loaded yet" — a reader with zero real shelves left (all deleted) is a valid, distinct state from "haven't fetched yet."

**Decision 2 — Fire once, not on every render.**
A `useRef` (`notifiedShelfRef`, storing the last-notified shelf id) prevents re-toasting if the effect re-runs for the same stale `scanShelf` (e.g. `shelves` reference changing without a content change is not expected here, but the guard is cheap insurance either way).

**Decision 3 — Reuse `use-toast`, no new UI.**
Matches the pattern already used throughout the app (`ReadingGoal`, `EditReaderDialog`, etc.) for a lightweight, non-blocking notice. A `destructive`-variant toast isn't warranted — this isn't an error the reader caused, just an FYI — so a default/neutral toast is used.

## Risks / Trade-offs

- **[Risk] `GET /api/shelves` fails entirely** → Mitigation: the existing `.catch(() => setShelves([]))` already handles this; an empty `shelves` array combined with a present `scanShelf` would also read as "stale," which is a reasonable (if slightly imprecise) fallback — not worth a third state to distinguish "shelf fetch failed" from "shelf genuinely doesn't exist" for a one-line notice.

## Migration Plan

None — additive client-side check, no data or API changes.

## Open Questions

None — scope confirmed during exploration of #32.
