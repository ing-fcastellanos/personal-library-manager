## 1. Backup module

- [x] 1.1 Create `components/settings/backup.ts`: `fetchBackup()` — `Promise.all`s `/api/books`, `/api/copies`, `/api/reading-events`, `/api/readers`, `/api/shelves` and returns `{ exportedAt, books, copies, readingEvents, readers, shelves }` (design D1-D3); `backupFilename(date)` — `backup-biblioteca-<YYYY-MM-DD>.json` (design D6).
- [x] 1.2 Unit tests: `fetchBackup()` assembles all five arrays from mocked fetch responses; a reader with `hasPin: true` in the response carries no `pinHash` field (mirrors what `/api/readers` already returns, but assert the pass-through doesn't reintroduce it); `backupFilename()` formats the date correctly.

## 2. UI

- [x] 2.1 Add a "Backup" card to `/ajustes` (alongside the existing Códigos QR / Apariencia cards) with a "Descargar backup" button that calls `fetchBackup()`, serializes to JSON, and downloads it via the same Blob/`<a download>` mechanic as CSV export (#34) using `backupFilename()`.
- [x] 2.2 Component test: clicking the button builds a Blob from the fetched data and triggers a download with the expected filename pattern.

## 3. Verify

- [x] 3.1 Run `npm test` (jsdom + node) green; typecheck + lint clean.

## 4. Claude Design handoff (#36)

- [x] 4.1 Generate the specific Claude Design prompt for the backup card on `/ajustes`: default/downloading/downloaded states, responsive, accessibility, M0 tokens.
- [ ] 4.2 Produce the design in Claude Design and validate against the base design system.
- [ ] 4.3 Integrate the handoff: map markup/code to Next components + tokens/styles.
- [ ] 4.4 QA: visual responsive + accessibility pass, plus opening a real downloaded backup file to confirm it's valid, complete JSON.
