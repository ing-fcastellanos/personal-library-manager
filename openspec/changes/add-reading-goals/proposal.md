## Why

The dashboard shows collection composition (#28) and reading momentum (#29), but
nothing lets a reader set an intentional target — a "reading challenge" goal for
the year — and see whether they're on track. #30 closes M5 with per-reader annual
reading goals: set a target, see progress, and see a simple projection based on
pace so far. Unlike #27–#29 (pure read-side aggregation), this is the milestone's
first feature requiring **persisted state** — but it reuses the existing
`Reader.preferences` field and `PATCH /api/readers/:id` endpoint, so still no new
backend endpoint or schema migration.

## What Changes

- **Set an annual goal**: the active (signed-in) reader can set/edit a target
  number of books for the current calendar year. Stored as
  `Reader.preferences.readingGoals["<year>"] = <n>`. Only the active reader can
  edit **their own** goal — another reader's goal is shown read-only.
- **Progress**: books finished so far this calendar year vs. the goal, shown as a
  count and a progress indicator.
- **Projection**: at the reader's pace so far this year (finished ÷ calendar
  months elapsed × 12), an estimated year-end total — distinct from #29's
  "libros/mes" (which averages only _active_ months, all-time); the projection
  uses _elapsed calendar months_, so idle months pull the projection down, which
  is the intent for "will I hit my goal."
- **Three widget states** (per reader): **sin meta** (no goal set — the active
  reader gets a "Fijá tu meta" affordance; another reader just shows "Sin
  meta"), **en progreso** (progress + projection), **cumplida** (goal met or
  exceeded).
- **Client-side merge before PATCH**: since the backend replaces the entire
  `preferences` object on write (confirmed: `{merge:true}` in Firestore only
  merges top-level document fields, not nested keys), the client reads the
  reader's current `preferences`, merges in the updated `readingGoals` map, and
  PATCHes the full merged object — never a bare `{ readingGoals: {...} }` that
  would wipe other preference keys.
- **Out of scope (deferred):** multi-year goal history UI (the data model
  supports it via the year key, but no UI to browse past years); goal reminders
  /notifications; letting one reader set another's goal (existing `/ajustes`
  profile editing already allows editing any reader's _profile_ fields, but this
  change does not extend that to goals — goal-setting stays self-only from the
  dashboard widget).

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `dashboard`: extends the KPI/composition/trends views with a per-reader annual
  reading-goal widget (set, progress, projection). Adds requirements; existing
  #27–#29 requirements are unchanged.

## Impact

- **Modified UI**: `components/dashboard/dashboard.tsx` (renders the new
  "Meta anual" section using `events` + `readers` it already fetches, plus the
  active reader from `useAuth()`).
- **New UI**: `components/dashboard/reading-goal.tsx` (the per-reader goal
  card + inline set/edit form for the active reader); pure helpers added to
  `components/dashboard/dashboard-stats.ts` (e.g. `finishedThisYear(events,
readerId)`, `projectedTotal(finished, monthsElapsed)`) and a small
  `readingGoal(reader, year)` / `setReadingGoalBody(reader, year, goal)` pair
  (read/write the `preferences.readingGoals` shape, including the
  read-merge-write logic) — likely in `components/dashboard/dashboard-stats.ts`
  or a co-located `reading-goal.ts`.
- **Reused (no change)**: `PATCH /api/readers/:id` (already accepts
  `preferences`), `useAuth()` (active reader), the dashboard's already-fetched
  `events`/`readers`.
- **No backend changes**: no new endpoint, no schema migration — `preferences`
  is already a free-form `Record<string, unknown>` with no server-side shape
  validation.
- **Tests**: goal helpers (finished-this-year, projection math, read/merge/write
  of the preferences shape, edge cases: no goal, goal met exactly, goal
  exceeded, division-by-zero guards); the goal widget (three states, self-only
  edit gating, save flow with optimistic local update); dashboard renders the
  new section.
