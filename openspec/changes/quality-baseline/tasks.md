## 1. Linting

- [x] 1.1 Add dev deps: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-next`, `eslint-plugin-react-hooks`
- [x] 1.2 Add `eslint.config.mjs` (flat): JS + typescript-eslint + next core-web-vitals + react-hooks; per-zone globals (browser for `app`/`components`, node for `server`/`services`/`lib`/`scripts`); `no-console` warn in browser zones, off in server/scripts; ignore `dist`/`.next`/`node_modules`
- [x] 1.3 Add `lint` script (`eslint .`); run it and fix the errors it surfaces across existing code (prefer fixes over disables)

## 2. Formatting

- [x] 2.1 Add dev deps: `prettier`, `eslint-config-prettier`
- [x] 2.2 Add `.prettierrc` (2-space, double quotes to match existing code) + `.prettierignore`; apply `eslint-config-prettier` last in the flat config
- [x] 2.3 Add `format` script; run it once so the tree is normalized

## 3. Unit test runner

- [x] 3.1 Add dev deps: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
- [x] 3.2 Add `vitest.config.ts` with two `projects`: `node` (env node; `server`/`services`/`lib`/`scripts`) and `jsdom` (env jsdom; react plugin; RTL setup; `app`/`components`) + a test setup file importing `@testing-library/jest-dom`
- [x] 3.3 Add `test` and `test:watch` scripts; extend the ESLint config with a test-files block (vitest globals)

## 4. Seed unit tests (no emulator)

- [x] 4.1 `lib/auth/pin.test.ts`: hash/verify round-trip, wrong PIN fails, lockout after N failures, `recordSuccess` resets
- [x] 4.2 `app/scan/route.test.ts`: each action → path, relative `Location` (307), `shelf` preserved, invalid action handled
- [x] 4.3 `lib/types/reader.test.ts`: `toClientReader` strips `pinHash`, sets `hasPin`
- [x] 4.4 `lib/types/data-model.test.ts` (or per-file): valid/invalid parse for Book/Copy/ReadingEvent/Shelf (required vs optional fields)

## 5. Pre-commit hook

- [x] 5.1 Add dev deps: `husky`, `lint-staged`; add `prepare: husky` script and initialize `.husky/`
- [x] 5.2 Add `.husky/pre-commit` running `lint-staged`; configure lint-staged (ESLint `--fix` + Prettier on staged `*.{ts,tsx}`; Prettier on `*.{json,md,css}`)

## 6. CI

- [x] 6.1 Add `.github/workflows/ci.yml`: on `pull_request` (+ push to the working branch); checkout → setup-node (cache, Node from `engines`) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test`

## 7. Verification

- [x] 7.1 `npm run lint` passes clean; `npm run typecheck` passes; `npm run test` runs green (all seed tests)
- [x] 7.2 `npm run build` still succeeds (tooling didn't break the build)
- [x] 7.3 A staged commit triggers lint-staged (hook fires); `openspec validate quality-baseline` passes
