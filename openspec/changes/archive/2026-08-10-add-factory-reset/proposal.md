## Why

There is no way to empty the library from inside the app. Clearing it today means
deleting every book, copy, reading event, wishlist item, loan, series and shelf by hand,
one at a time, in the right order — or editing Firestore directly. That matters for a
household app that is realistically set up more than once: after a trial run with test
data, after a bad CSV import, or when handing the app to someone else.

The deletion machinery already exists. Restore (#93) ends with a cleanup phase that
deletes exactly this set, in exactly the right order, and it is already tested. What is
missing is a way to invoke it on its own, with a confirmation the reader can trust.

## What Changes

- A **factory reset** action in Ajustes: wipes books, copies, reading events, wishlist
  items, loans, series and shelves. Readers are never touched.
- A **confirmation dialog** showing the concrete counts of what will be deleted, with an
  optional backup download offered inside the dialog as a skippable step before the
  destructive action.
- Progress while running, and a summary afterwards listing anything that failed, with a
  retry — a reset is convergent, so re-running it finishes the job.
- Reuses the restore cleanup path as-is (`runCleanup`, `snapshotFromBackup`,
  `entityCounts`, `cleanupTotal`, `groupRestoreOutcomes`). No new deletion logic, no new
  dependency ordering, no new endpoints.

**Deliberately unchanged** (each is a decision, not an oversight):

- **Readers are never deleted.** They are the access allowlist — login resolves
  `findReaderByEmail(email)` and returns `403 "not a member"` when there is no match, and
  no `POST /api/readers` exists (closed membership, ADR-0012). Deleting them locks the
  household out of its own app with no way back through the UI.
- **The audit log is left intact.** Every delete the loop performs writes an audit entry,
  so the reset is recorded rather than hidden — including the titles it removed.
- **Cover images are left in Storage.** A browser cannot delete them (deny-by-default
  Storage rules), so they are orphaned by design here.

## Capabilities

### New Capabilities

- `factory-reset`: emptying the library from Ajustes — what is deleted, what is
  preserved, how the action is confirmed, and how a partial failure is recovered.

### Modified Capabilities

(none — `backup-restore` covers restoring *from a file*; its requirements are about
replacing data, not destroying it. The shared cleanup code is an implementation detail,
not a spec-level coupling.)

## Impact

- `components/settings/` — a new reset dialog; existing restore modules imported unchanged.
- `app/ajustes/page.tsx` — mounts the action.
- No API, service, or repository changes. No new endpoints.
- **Audit log grows on every reset.** `recordChange` is called from the route layer, so
  each `DELETE` the loop issues appends an entry, and `entityLabel` snapshots the title on
  purpose so it survives deletion (#40, design D1). Resetting the current library (11
  books, 11 copies, 6 reading events) adds ~28 entries, each naming what it removed — so
  Actividad shows a legible inventory of the deleted library afterwards. Accepted as an
  honest record of what happened.
- **Orphaned cover images.** `deleteBook()` deletes only the Firestore document; the image
  at `covers/<bookId>.webp` stays in Storage. After a reset the app looks empty while the
  files still occupy space, unreachable from the UI and removable only from the Firebase
  console.
