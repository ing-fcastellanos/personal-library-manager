## 1. Readers loader

- [ ] 1.1 Add `components/readers/use-readers.ts`: `useReaders()` fetching `/api/readers` (no-store), returning `{ readers, loading }`

## 2. ReaderPicker component

- [ ] 2.1 Add `components/readers/reader-picker.tsx`: controlled `ReaderPicker({ value, onChange, readers? })` rendering avatar + name options
- [ ] 2.2 Accessible + mobile-first: keyboard navigation, focus-visible, selected state via tokens; no PIN/gate (ADR-0013)
- [ ] 2.3 Falls back to `useReaders` when `readers` is not provided; loading + empty states

## 3. Exercise in the style guide

- [ ] 3.1 Add a `ReaderPicker` example (controlled) to `app/style-guide`

## 4. Claude Design handoff

- [ ] 4.1 Author `claude-design-prompt.md` for the picker (states: default/selected/focus/loading/empty; avatar treatment; mobile-first; a11y; project tokens)
- [ ] 4.2 Integrate the Claude Design output: map to primitives + tokens, reconcile with the scaffold
- [ ] 4.3 QA visual responsive (mobile/desktop) and accessibility on the integrated result

## 5. Verification

- [ ] 5.1 `npm run typecheck` passes
- [ ] 5.2 `npm run build` succeeds; the style-guide example renders the household readers and selection updates
