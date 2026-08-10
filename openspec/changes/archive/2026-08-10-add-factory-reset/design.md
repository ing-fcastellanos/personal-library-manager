## Context

Restore (#93) already deletes exactly the set a factory reset needs, in the order the
integrity guards require. `components/settings/` holds the whole path:

```
fetchBackup()            backup.ts           current state as a Backup
  ├─ entityCounts()      restore.ts          per-entity counts (the dialog's preview)
  └─ snapshotFromBackup() restore.ts         CleanupSnapshot — the ids to delete
        └─ runCleanup()  restore-run.ts      deletes in reverse dependency order
           cleanupTotal()                    progress denominator
           groupRestoreOutcomes()  restore-summary.ts   final summary
```

`runCleanup` walks `CLEANUP_GROUPS` in this order, and the order is load-bearing rather
than cosmetic — a copy with any loan is refused with `409` by the loans integrity guard,
and a book with copies or reading events is refused likewise:

```
loan → readingEvent → wishlistItem → copy → book → series → shelf
```

Readers are excluded at the type level: `type CleanupEntityType = Exclude<RestoreEntityType, "reader">`.

## Goals / Non-Goals

**Goals:**

- Empty the library in one action, from Ajustes, with a confirmation the reader can trust.
- Reuse the existing cleanup path rather than writing a second deletion implementation.
- Make the destructive scope legible *before* it runs (concrete counts, not "all data").
- Recover from a partial failure without leaving the reader stuck.

**Non-Goals:**

- Deleting readers (see Decisions — this is a safety invariant, not a scope cut).
- Deleting cover images from Storage.
- A `DELETE /api/audit-log` endpoint, or suppressing audit entries during the reset.
- A server-side reset endpoint.
- Touching configuration: `settings/ai`, PIN, theme.

## Decisions

**Readers are never deleted — an invariant, not a preference.** Readers are the access
allowlist. Login resolves `findReaderByEmail(decoded.email)` and returns
`403 "not a member"` when there is no match, and there is no `POST /api/readers` (closed
membership, ADR-0012; readers are seeded out-of-band by `scripts/seed-readers.ts` with
admin credentials). A reset that deleted readers would lock the household out of its own
app with no path back through the UI, and no amount of confirmation copy makes that
recoverable. `runCleanup` already enforces this at the type level; this change documents
it as a requirement so it cannot be "cleaned up" later by someone who reads the exclusion
as an artifact of restore's semantics.

**Client-side loop, not a server-side reset endpoint.** A `POST /api/factory-reset` would
be more atomic (one Firestore batch), could delete Storage covers, and could collapse the
audit trail into a single entry. It was rejected because it adds a weapon the API does not
currently have: one authenticated call that destroys the entire library. Today the worst
an auth flaw yields is per-entity damage at the attacker's typing speed; that endpoint
would turn any future auth regression into total loss. The client loop adds no new
destructive capability — it drives the same per-entity endpoints a reader can already
drive by hand.

The usual argument for atomicity also carries less weight here than it looks: **a reset is
convergent.** If it dies halfway, re-running it finishes the job, because the desired end
state is "empty" and every completed delete is progress toward it. Restore cannot say that
— a partial restore leaves an ambiguous merged state — which is exactly why restore
deletes only after a fully successful create phase. That asymmetry is what makes the
cheaper approach acceptable here.

**The audit log is left intact, with a known consequence.** `recordChange` is called from
the route layer (`server/routes/books.ts`, `copies.ts`, `reading-events.ts`), so a loop
over those endpoints cannot avoid writing entries — only a path that bypasses the routes
could. Left as-is deliberately: the reset ends up recorded rather than silent. The cost is
that `entityLabel` snapshots the title on purpose, so it stays legible after the entity is
gone (#40, design D1) — meaning Actividad afterwards lists every deleted title. For a
two-person household app that is a reasonable trade: the log tells the truth about what
happened. Suppressing it would need either a per-request "do not audit" flag (a smell, and
an abuse vector) or the rejected server endpoint.

**Optional backup, offered inside the dialog.** `BackupButton` already sits in the same
Ajustes card, but next to the reset it is easy to skip without noticing. Surfacing it as a
skippable step inside the dialog turns an irreversible action into a recoverable one for
readers who take it, using the restore path that already works — without making it a
mandatory gate for readers who are wiping deliberate throwaway data.

**Confirmation friction: concrete counts, no type-to-confirm.** The dialog shows real
numbers from `entityCounts` ("11 libros, 11 ejemplares, 6 lecturas…") rather than the word
"todo", so the scope is legible before the click. It deliberately does *not* require
typing a word: restore is nearly as destructive and already ships at this level of
friction, and at household scale a type-to-confirm reads as theatre. If review disagrees
this is a one-line change, which is why it is called out here rather than buried.

**Restore modules are imported as-is, not renamed.** `runCleanup` and `CleanupSnapshot`
live in `restore-*.ts`, which reads oddly from a factory reset. They are the *generic
cleanup phase*, not something restore-specific, so they are imported unchanged and the
reason documented at the call site. Moving the files for naming aesthetics would produce a
wide diff across a tested module for no behavioral gain.

## Risks / Trade-offs

- **[Risk]** A reader wipes the library expecting readers/config to go too, or expecting
  covers to be freed → **Mitigation**: the dialog states what is preserved, not just what
  is deleted.
- **[Risk]** Partial failure leaves a half-empty library → **Mitigation**: the summary
  lists what failed and offers a retry; convergence means the retry finishes the job
  rather than compounding the mess.
- **[Trade-off]** Orphaned cover images accumulate in Storage after each reset, invisible
  from the app and removable only from the Firebase console. Accepted as the price of not
  adding a server-side reset; documented rather than hidden.
- **[Trade-off]** The audit log grows by roughly one entry per deleted book/copy/reading
  event, each naming what it removed — so "Actividad" becomes a readable inventory of the
  library that was just wiped. Accepted deliberately.
- **[Risk]** A large library could approach the write rate limit (600/min, `writeRateLimit`)
  → low at household scale, and the same consideration restore already lives with; the
  retry path covers a `429` as it covers any other failure.

## Migration Plan

None — additive UI, no schema or endpoint changes, nothing to roll back beyond reverting
the component.
