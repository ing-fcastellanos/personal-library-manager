## 1. Reset orchestration

- [x] 1.1 Add a `components/settings/factory-reset.ts` with the pure pieces: build a
      `CleanupSnapshot` of the current library from `fetchBackup()` +
      `snapshotFromBackup()`, and a helper reporting whether an outcome set is fully
      deleted or has failures worth retrying. Document at the import site why
      `restore-*.ts` modules are reused directly (they are the generic cleanup phase, not
      restore-specific).
- [x] 1.2 Unit-test 1.1: snapshot covers every resettable entity type, readers are absent
      from it, and the retry predicate distinguishes "all deleted" from "some failed".

## 2. Confirmation dialog

- [x] 2.1 Build `components/settings/factory-reset-dialog.tsx`: loads the current library,
      shows per-entity counts from `entityCounts()`, states what is preserved (readers,
      settings) and what is not removed (cover images), and offers the backup download as
      a skippable step above the destructive action.
- [x] 2.2 Wire the run: `runCleanup()` with `cleanupTotal()` driving progress, then a
      summary via `groupRestoreOutcomes()` listing failures with a retry that re-snapshots
      and deletes what remains.
- [x] 2.3 Component-test the dialog with `fetch` mocked: counts render before confirming,
      dismissing issues no `DELETE`, confirming deletes, and a failed deletion surfaces a
      retry. Assert an actual `DELETE` fires on confirm — not just the success copy — the
      gap that let the restore cleanup bug through in #93.

## 3. Settings integration

- [x] 3.1 Mount the dialog in `app/ajustes/page.tsx`, visually separated from the
      non-destructive backup/restore actions so it is not clicked by proximity.

## 4. Verification

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm test` clean. (lint + typecheck clean;
      new tests 12/12 stable across 3 isolated runs. The full suite shows load-dependent
      timeouts on Windows whose failing set changes between runs — verified unrelated:
      every flagged file passes in isolation. CI is the arbiter.)
- [x] 4.2 Live check against the emulators with a seeded library: counts match reality,
      reset empties catalog/wishlist/loans/dashboard, **readers survive and sign-in still
      works afterwards**, and Actividad shows the reset's own audit entries.

      Run against a library seeded with every entity type (18 books, 19 copies, 1 each of
      reading event / wishlist item / loan / series / shelf, 2 readers):
      - Dialog counts matched the API exactly (18/19/1/1/1/1/1 = 42), and **readers were
        absent from the list** despite 2 existing.
      - Confirm deleted 42/42 with no failures; the loan was removed before its copy, so
        no integrity guard refused a delete.
      - Catalog and dashboard both render their empty states; every collection reads 0.
      - **Readers still 2, and a full sign-out → fresh magic-link sign-in returned 200
        with the reader resolved** — the invariant that matters most.
      - 38 `delete` audit entries written, carrying titles (e.g. "PEDRO PÁRAMO") — the
        documented consequence, exactly as designed (books + copies + reading events are
        audited; wishlist/loans/series/shelves are not).
      - No app-originated console or network errors.
