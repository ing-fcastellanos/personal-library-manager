## Why

The project has shipped M0–M1 with **no automated safety net**: no linter, no
formatter, no test runner, and no CI. The only checks are `tsc --noEmit` and
`next build`. Every feature so far (auth, PIN hashing/lockout, the `/scan` resolver,
`toClientReader`, the #5 zod schemas) is untested, and PRs can merge code that breaks
lint or behavior with nothing to catch it. Before #12 lands the catalog repositories
(the most logic-heavy change yet), we want the safety net in place so that work is
born with tests and a CI gate.

## What Changes

This is the **MVP slice** of #4 (lint + format + unit tests + a blocking CI gate;
Playwright E2E and emulator-backed integration tests are an explicit follow-up):

- Add **ESLint 9 flat config** (`eslint.config.mjs`) over the whole TS codebase
  (`app`, `components`, `server`, `services`, `lib`, `scripts`), with
  `typescript-eslint` + `eslint-config-next` + react-hooks rules and **per-zone
  globals** (browser for `app`/`components`, node for the rest; `console` allowed in
  server/scripts).
- Add **Prettier** as the formatter, with `eslint-config-prettier` to disable
  conflicting ESLint rules. Add `npm run lint` and `npm run format`.
- Add **Vitest** with two projects — a `node` project (`server`/`services`/`lib`/
  `scripts`) and a `jsdom` project (`app`/`components`) — plus React Testing Library.
  Add `npm run test` (and `test:watch`).
- Seed the suite with **real pure-unit tests** (no emulator): `lib/auth/pin.ts`,
  `app/scan/route.ts` resolver, `toClientReader`, and the #5 zod schemas.
- Add **Husky + lint-staged** pre-commit (ESLint --fix + Prettier on staged files),
  installed via the `prepare` script.
- Add a **GitHub Actions CI workflow** that runs `lint` + `typecheck` + `test` on
  every PR and blocks merge on failure.
- Clean up the lint errors the first ESLint run surfaces across existing code.

Explicit **non-goals** (follow-up, ideally with #12): Playwright E2E smoke,
emulator-backed repository/integration tests, and a CI job that boots the Firebase
emulator.

## Capabilities

### New Capabilities

- `quality-baseline`: the project's automated quality gate — linting, formatting,
  a unit-test runner with the dual browser/node environment, a pre-commit hook, and
  a CI workflow that blocks PRs on lint/typecheck/test failures.

### Modified Capabilities

<!-- None. This adds tooling around existing code; no product behavior or existing
     spec requirements change. -->

## Impact

- **New dev dependencies**: `eslint`, `@eslint/js`, `typescript-eslint`,
  `eslint-config-next`, `eslint-plugin-react-hooks`, `prettier`,
  `eslint-config-prettier`, `vitest`, `@vitejs/plugin-react`, `jsdom`,
  `@testing-library/react`, `@testing-library/jest-dom`, `husky`, `lint-staged`.
- **New config files**: `eslint.config.mjs`, `.prettierrc`, `.prettierignore`,
  `vitest.config.ts` (+ test setup), `.husky/pre-commit`, `.github/workflows/ci.yml`.
- **New scripts**: `lint`, `format`, `test`, `test:watch`, `prepare`.
- **New tests**: `*.test.ts` next to or under the units they cover.
- **Touches existing code only for lint fixes** (no behavior change).
- **Unblocks**: a tested, gated foundation for #12 and everything after; the
  follow-up E2E/emulator CI lane builds on this workflow.
