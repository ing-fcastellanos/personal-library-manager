## Context

Greenfield tooling change over an existing M0–M1 codebase. Current state: TS
everywhere, Next 15 + React 19 (browser) served by a custom Express server (Node),
plus `lib`/`services`/`scripts`. Only `tsc --noEmit` and `next build` guard quality.
The author already wrote `// eslint-disable-next-line no-console` in `server/` and
`scripts/`, signalling the intended config (console allowed server-side).

The dominant constraint is that this is a **dual-runtime** codebase: lint and tests
must treat browser zones (`app`, `components`) and node zones (`server`, `services`,
`lib`, `scripts`) differently. Scope is the **MVP slice** agreed in exploration:
lint + format + unit + pre-commit + a blocking CI gate; Playwright and
emulator-backed tests are deferred (ideally to #12).

## Goals / Non-Goals

**Goals:**

- `npm run lint`, `npm run typecheck`, `npm run test` all pass green.
- ESLint + Prettier cover the whole TS tree with per-zone globals.
- Vitest runs pure-unit tests in both node and jsdom environments.
- A pre-commit hook auto-fixes/format staged files.
- A GitHub Actions workflow blocks PRs on lint/typecheck/test failure.
- Seed the suite with genuine tests for existing pure logic.

**Non-Goals:**

- Playwright E2E smoke → follow-up.
- Emulator-backed repository/integration tests and a CI emulator job → follow-up
  (the repos don't exist until #12).
- Coverage thresholds / mutation testing → later if wanted.
- Changing any product behavior — existing code is touched only to satisfy lint.

## Decisions

### A. ESLint 9 flat config; Prettier separate

`eslint.config.mjs` (flat) composing `@eslint/js` recommended + `typescript-eslint` +
`eslint-config-next` (core-web-vitals) + `eslint-plugin-react-hooks`. Prettier is the
formatter; `eslint-config-prettier` is applied **last** to switch off stylistic rules
so the two never fight. We do **not** use `eslint-plugin-prettier` (running Prettier
as a lint rule is slow and noisy).

- _Why flat config:_ greenfield on ESLint 9; the legacy `.eslintrc` path is
  deprecated. _Alternative:_ `next lint` only — rejected, it doesn't cover the Express
  `server`/`services`/`lib`/`scripts` trees.

### B. Per-zone globals & overrides

Config blocks by glob:

- `app/**`, `components/**` → browser globals, React/react-hooks rules, `no-console: warn`.
- `server/**`, `services/**`, `lib/**`, `scripts/**` → node globals, `no-console: off`.
- Test files → vitest globals.
  Type-aware linting via `typescript-eslint` projectService.

- _Why:_ a single global set would mis-flag DOM in node files and vice-versa, and
  spam the existing `eslint-disable no-console` lines.

### C. Vitest with two projects (node + jsdom)

`vitest.config.ts` defines `test.projects`:

- `node`: environment `node`, includes `server`/`services`/`lib`/`scripts` tests.
- `jsdom`: environment `jsdom`, `@vitejs/plugin-react`, RTL + `@testing-library/jest-dom`
  setup file, includes `app`/`components` tests.

- _Why Vitest over Jest:_ native ESM/TS (matches `tsx`, `"type"` ESM-ish, zod v4),
  fast, first-class jsdom + RTL. Jest needs ts-jest/babel ESM gymnastics. _Why two
  projects:_ don't pay jsdom cost for server tests; keep environments honest.

### D. Seed with real pure-unit tests (no emulator)

First tests cover existing logic that needs **no** Firebase:

- `lib/auth/pin.ts` — `hashPin`/`verifyPin` round-trip, wrong PIN, lockout after N
  failures, `recordSuccess` reset.
- `app/scan/route.ts` — action→path mapping, relative `Location`, `shelf` preserved,
  invalid action handling.
- `lib/types/reader.ts` — `toClientReader` strips `pinHash`, sets `hasPin`.
- #5 schemas — valid/invalid parse for Book/Copy/ReadingEvent/Shelf (mirrors the
  scratch check from the #5 apply, now permanent).

- _Why:_ the issue asks for an "example" test; we make it genuine coverage of the
  riskiest pure logic instead of a throwaway.

### E. Husky + lint-staged pre-commit

`prepare: husky` installs hooks on `npm install` (works on the fresh per-session
container too). `.husky/pre-commit` runs `lint-staged`: ESLint `--fix` + Prettier on
staged `*.{ts,tsx}` (and Prettier on `*.{json,md,css}`). Kept fast — staged files
only, no full typecheck in the hook (CI owns that).

- _Why no typecheck in the hook:_ `tsc` over the project is too slow for a commit
  gate; CI is the real enforcement. The hook is a convenience, not the wall.

### F. CI workflow (fast lane, blocking)

`.github/workflows/ci.yml`: trigger on `pull_request` (+ push to the working branch).
One job: checkout → setup-node (cache npm) → `npm ci` → `npm run lint` →
`npm run typecheck` → `npm run test`. No emulator, no browser. Marked as the required
check. Node version from `engines` (>=20.19).

- _Why one fast job:_ it must be quick and reliable so it can be a required gate; the
  heavy emulator/E2E lane is added later as a separate, non-blocking-first job.

## Risks / Trade-offs

- **First lint run surfaces many errors across existing code** → Mitigation: a
  dedicated cleanup task; prefer fixing over blanket-disabling; only keep the
  `console` allowances already intended server-side.
- **ESLint 9 flat + `eslint-config-next` compatibility** (Next's shareable config was
  historically eslintrc-oriented) → Mitigation: use the flat-compatible export; if a
  rough edge appears, fall back to `@next/eslint-plugin-next` directly via
  `FlatCompat`. Verify `npm run lint` runs clean before done.
- **Type-aware linting is slow** → Mitigation: scope `projectService`; CI caches; the
  pre-commit hook lints staged files only.
- **Husky in the agent/web flow** → Mitigation: hooks are local convenience; CI is the
  gate, so a skipped/limited hook never lets bad code through.
- **Testing logic that #12 will reshape** → avoided by design: we only test code that
  exists today and is stable (pin, scan, serializer, schemas).

## Migration Plan

Purely additive tooling. Rollback = remove the new config/dev-deps/workflow; product
code keeps working (only lint fixes remain, which are harmless). No data or runtime
behavior changes.

## Open Questions

- Exact Prettier opinions (print width, semicolons) — adopt defaults + 2-space,
  double quotes to match existing code; revisit only if the diff is noisy.
- Whether CI also runs on direct pushes to `claude/*` branches or PR-only — default
  to PR + the active working branch; easy to widen later.
