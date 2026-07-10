## Why

The app is the only source of truth for the library — there's no dependency on Goodreads to fall back on (ADR-0005), so losing the Firestore data would mean losing everything. A one-click full JSON backup gives the reader their own copy of every collection, independent of any external service (#36).

## What Changes

- A "Descargar backup" action (in `/ajustes`, alongside the existing QR/Apariencia cards) that downloads a single JSON file containing every collection: `books`, `copies`, `readingEvents`, `readers`, `shelves`.
- Pure client-side aggregation, reusing the app's existing public list endpoints (`/api/books`, `/api/copies`, `/api/reading-events`, `/api/readers`, `/api/shelves`) via `Promise.all` — no new backend route. `/api/readers` already strips `pinHash` via `toClientReader()`, so the backup carries no auth secrets.
- Same download mechanic already used for CSV export (#34): `Blob` → `URL.createObjectURL` → temporary `<a download>` click → `revokeObjectURL`.
- No sign-in required — matches every other read in the app ("reads are public, writes require a session").

## Capabilities

### New Capabilities

- `json-backup`: downloading a single JSON file containing a full snapshot of the library's collections, for the reader's own safekeeping.

### Modified Capabilities

(none — this reads from existing public endpoints as-is; no other capability's requirements change)

## Impact

- New UI: a card/button on `/ajustes`.
- New client-side module to fetch all five collections and serialize them to JSON — no new backend code, no schema changes.
- Restore-from-backup is explicitly out of scope for this change — tracked separately in #93, since it's a destructive operation with real semantics to work out (replace vs. merge, no admin/privilege tier exists yet to gate it) and the issue itself marked it optional/separate from the export requirement.
