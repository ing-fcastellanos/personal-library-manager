## Why

#32's routing/auth-gating/shelf-propagation criteria are already satisfied by existing code (#10, #18). The one real gap: if a shelf's QR is scanned after that shelf was deleted, the add form silently drops the preselection with no explanation — `add-book.tsx` passes the scanned shelf id straight through as `initialShelfId` with no check against the actual shelf list. This closes that gap and closes out M6.

## What Changes

- When the add form loads with a shelf id from a scan that doesn't match any of the reader's current shelves, show a toast noting that shelf no longer exists (existing `use-toast` pattern, no new UI primitive).
- No change when the scanned shelf _does_ exist (current preselection behavior is correct and unmodified).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `shelf-map`: adds a requirement for the previously-unspecified "scanned shelf no longer exists" case (the existing "Shelf preselection from a scan" requirement's contract is unchanged — it only covers the shelf-exists path).

## Impact

- `components/books/add-book.tsx`: compare `scanShelf` against the loaded `shelves` list once both are available; toast if the id is present but doesn't match.
- No API/backend changes — `shelves` is already fetched by this component.
