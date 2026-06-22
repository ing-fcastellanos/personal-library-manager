## 1. Readers loader & picker

- [x] 1.1 Add `components/readers/use-readers.ts`: `useReaders()` fetching `/api/readers` (no-store) → `{ readers, loading }`
- [x] 1.2 Add `components/readers/reader-picker.tsx`: controlled `ReaderPicker({ value, onChange, readers? })`, avatar + name, accessible + mobile-first, ungated; loading + empty states
- [x] 1.3 Add a `ReaderPicker` example (controlled) to `app/style-guide`

## 2. Switch reader (re-login)

- [x] 2.1 Add a "Cambiar de lector" action to the account menu that calls `signOut()` then routes to `/login` (pure; no PIN)

## 3. PIN lock (active reader)

- [x] 3.1 Add a lock state (sessionStorage-persisted) + a "Bloquear" action in the account menu
- [x] 3.2 Add a `LockScreen` using `PinPad`: shows the active reader, verifies via `POST /api/auth/pin/verify` for that reader, unlock on success; locked on wrong PIN (rate-limited by backend)
- [x] 3.3 If the active reader has no PIN, route the lock action to set-PIN (Settings) instead

## 4. Claude Design handoff

- [x] 4.1 Author `claude-design-prompt.md` for the picker, the switch confirmation, and the lock screen (states; avatar treatment; mobile-first; a11y; project tokens)
- [x] 4.2 Integrate the Claude Design output: map to primitives + tokens, reconcile with the scaffold
- [x] 4.3 QA visual responsive (mobile/desktop) and accessibility on the integrated result

## 5. Verification

- [x] 5.1 `npm run typecheck` passes
- [x] 5.2 `npm run build` succeeds; the style-guide picker renders the readers and selection updates; "switch reader" signs out → login
- [x] 5.3 With the Auth emulator: lock → wrong PIN stays locked, correct PIN unlocks the same reader
