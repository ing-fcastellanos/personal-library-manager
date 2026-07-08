## 1. Goal helpers

- [x] 1.1 In `components/dashboard/dashboard-stats.ts` (or a new co-located `reading-goal.ts`), add `finishedThisYear(events, readerId, now = new Date())`: count of that reader's `finished` events whose `eventDate` falls in the current calendar year.
- [x] 1.2 Add `projectedTotal(finished, now = new Date())`: `finished / monthsElapsedInYear(now) * 12`, where months-elapsed counts January through the current month inclusive; returns `null` when `finished` is 0 (nothing to project from).
- [x] 1.3 Add `readingGoalFor(reader, year)`: reads `reader.preferences.readingGoals?.[year]` as a number, or `null` if unset/malformed.
- [x] 1.4 Add `withReadingGoal(reader, year, goal)`: returns the full merged `preferences` object (`{ ...reader.preferences, readingGoals: { ...existing, [year]: goal } }`) — the body to PATCH, never a bare `{ readingGoals }`.
- [x] 1.5 Unit tests: `finishedThisYear` (current year only, excludes other years/non-finished); `projectedTotal` (mid-year projection, January edge case, null with 0 finished); `readingGoalFor` (set/unset/malformed value); `withReadingGoal` (preserves unrelated preference keys, preserves other years' goals, overwrites only the target year).

## 2. Reading-goal widget

- [x] 2.1 Create `components/dashboard/reading-goal.tsx`: one card per reader (avatar/name), three states — **sin meta** (CTA "Fijá tu meta" only when `reader.id === activeReader?.id`, else "Sin meta" text), **en progreso** (finished/goal count + progress bar/indicator + projection text when available), **cumplida** (finished ≥ goal, a distinct celebratory treatment).
- [x] 2.2 Inline set/edit form (active reader's own card only): a number input + save button; on save, PATCH `/api/readers/:id` with `withReadingGoal(...)`'s output, update local reader state from the response, toast on success/failure (mirroring `EditReaderDialog`'s pattern).
- [x] 2.3 `reading-goal.test.tsx`: renders all three states per reader; edit affordance only on the active reader's card; save flow PATCHes the correctly merged body and updates local state; another reader's card has no edit control regardless of goal state.

## 3. Dashboard integration

- [x] 3.1 In `components/dashboard/dashboard.tsx`, render a "Meta anual" section (ReadingGoal, one per reader) below the existing Tendencias section, passing `events`, `readers`, and the active reader from `useAuth()`; on a successful goal save, update the dashboard's local `readers` state so the widget (and any other reader-derived UI) reflects the change without a refetch.
- [x] 3.2 Update `dashboard.test.tsx`: the new section renders with real data; a reader with no goal shows the no-goal state; saving a goal updates the displayed progress without a full page reload.

## 4. Verify

- [x] 4.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 5. Claude Design handoff (#30)

- [x] 5.1 Generate the specific Claude Design prompt for the reading-goal widget: three states (sin meta/en progreso/cumplida), the set/edit control, progress + projection display, comparison layout with #29's trends section, mobile-first responsive, accessibility, M0 tokens.
- [x] 5.2 Produce the design in Claude Design and validate against the base design system.
- [x] 5.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 5.4 QA: visual responsive + accessibility pass.
