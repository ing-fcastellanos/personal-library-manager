## Context

`Reader.preferences` is a free-form `Record<string, unknown>` with no
server-side shape validation (`readerUpdateSchema` accepts it via
`z.record(z.string(), z.unknown()).optional()`). `PATCH /api/readers/:id`
(`requireAuth`-gated, no ownership check server-side) writes it via
`services/readers/repository.ts`'s `updateReader`, which does
`ref.set(updates, { merge: true })` — Firestore's `merge: true` only merges at
the **top level of the document**. Whatever object the client sends for
`preferences` **replaces the entire field**, it does not deep-merge nested
keys. There is no existing preferences-editing UI (`EditReaderDialog` in
`/ajustes` only edits flat profile fields, never touches `preferences`).

The dashboard (`components/dashboard/dashboard.tsx`) already fetches all
`readers` and `events` in one parallel call (#27) and has `useAuth()` available
app-wide for the active reader (used already by #24–#26's mark-as-read/edit
flows for self-only gating).

## Goals / Non-Goals

**Goals:**

- Per-reader annual goal: set (self only), progress, projection, three widget
  states.
- Correct client-side read-merge-write so setting a goal never clobbers other
  `preferences` keys.

**Non-Goals:**

- A new backend endpoint or `preferences` schema/validation — reusing the
  existing free-form field and PATCH.
- Multi-year goal browsing UI (data model supports it via the year key; no UI
  to view past years in this change).
- Fixing the pre-existing lack of server-side ownership check on `PATCH
/api/readers/:id` — noted as a pre-existing gap, out of scope for this
  change; the client enforces self-only editing in the UI, consistent with the
  app's existing trust model (`/ajustes`'s `EditReaderDialog` already lets any
  signed-in reader edit any profile's flat fields with no ownership check
  either — this household app doesn't currently enforce per-resource
  ownership server-side anywhere).
- Notifications/reminders about goal progress.

## Decisions

- **Storage: `preferences.readingGoals["<year>"]` (Decision 1).** A year-keyed
  map rather than a single `annualGoal` number, so a past year's goal isn't
  silently overwritten when a new year starts (even though this change only
  ever _reads/writes the current year_). _Alternative:_ a flat `annualGoal`
  field — rejected; keying by year is a few extra characters of code and avoids
  a real data-loss footgun (e.g. reopening the app in January and the previous
  year's goal — which might still be interesting to look back on — silently
  vanishing).

- **Self-only editing, enforced client-side (Decision 2, confirmed with
  user).** The goal widget only renders an edit affordance when
  `useAuth().reader?.id === thisCard's readerId`. Other readers' cards are
  read-only. _Alternative:_ allow editing any reader's goal, matching
  `/ajustes`'s existing any-reader-editable pattern — rejected per explicit
  user confirmation; a personal goal is framed as "mine," and this is the more
  intuitive default even though the server doesn't strictly enforce it either
  way.

- **Client-side read-merge-write (Decision, from the PATCH investigation).**
  `setReadingGoal(reader, year, goal)` takes the _already-loaded_ `Reader`
  object (the dashboard has it from its `readers` fetch), builds
  `{ ...reader.preferences, readingGoals: { ...existingReadingGoals, [year]:
goal } }`, and PATCHes `{ preferences: merged }`. On success, the dashboard
  updates its local `readers` state from the response (no full refetch needed)
  — mirrors #24–#26's optimistic-update pattern.

- **Projection uses elapsed calendar months, not "active months" (Decision,
  distinct from #29).** `projectedTotal = finishedThisYear / monthsElapsedInYear
  - 12`, where `monthsElapsedInYear`counts every calendar month from January
through the current month (inclusive), regardless of whether the reader read
anything in it. This deliberately differs from #29's`booksPerMonth` (which
    divides by _active_ months only) — for a forward-looking projection, idle
    months should drag the estimate down; for a backward-looking "your pace,"
    active-months-only is the more flattering and arguably more honest read of
    effort. Both coexist without renaming either concept.

- **Current year only, computed from `now: Date = new Date()` (default
  param).** Matches #29's `readerTrend(events, readerId, now)` pattern for
  testability (tests pass a fixed `now`).

## Risks / Trade-offs

- **`preferences` has zero server-side shape validation** → A malformed
  `readingGoals` value (e.g. wrong type) could theoretically be written by a
  buggy client. Mitigated by the client always reading-then-writing a
  well-formed shape; not treated as a security concern since this is a trusted
  2-reader household app.
- **No server-side ownership enforcement** → Documented above as a pre-existing,
  explicitly out-of-scope gap; flagged for awareness, not fixed here to avoid
  scope creep into an unrelated hardening change.
- **Race on concurrent PATCH** (two tabs editing preferences simultaneously)
  → Out of scope; not a realistic scenario for a personal library app, and no
  existing preferences-writing code in the app guards against it either.
- **Projection math is illustrative** → Like #29's trend stats, this is a
  glance-level estimate, not statistically rigorous; acceptable for a personal
  reading-challenge widget.

## Migration Plan

Additive UI + a client-only "feature" on top of an already-free-form field — no
schema migration, no new endpoint. Readers with no `readingGoals` key simply see
the "sin meta" state. Ships on `feat/reading-goals` → PR → deploy.

## Open Questions

- Exact visual treatment for the three states (progress ring vs. bar; how
  prominently "cumplida" celebrates) — resolve against the Claude Design
  handoff.
- Whether the goal-setting control is inline (a number input right in the card)
  or a small popover/dialog — decide during design; either is a thin wrapper
  over the same save function.
