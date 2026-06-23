## ADDED Requirements

### Requirement: Linting

The project SHALL provide an ESLint flat configuration covering the whole TypeScript
tree (`app`, `components`, `server`, `services`, `lib`, `scripts`) with per-zone
globals (browser for `app`/`components`, node for the rest), and a `npm run lint`
script. `npm run lint` SHALL pass with no errors on the committed codebase.

#### Scenario: Lint passes on a clean tree

- **WHEN** `npm run lint` runs on the committed code
- **THEN** it completes with exit code 0 and no errors

#### Scenario: Lint catches a violation

- **WHEN** a file introduces an ESLint violation (e.g. an unused variable)
- **THEN** `npm run lint` reports it and exits non-zero

#### Scenario: Server console is allowed, browser console warned

- **WHEN** `console.log` is used in `server/` or `scripts/` versus in `app/` or
  `components/`
- **THEN** the server/scripts usage is permitted while the browser-zone usage is
  flagged

### Requirement: Formatting

The project SHALL provide Prettier as the formatter with an `eslint-config-prettier`
integration so ESLint does not fight formatting, and a `npm run format` script.

#### Scenario: Format script normalizes code

- **WHEN** `npm run format` runs
- **THEN** files are formatted per the Prettier config without ESLint stylistic
  conflicts

### Requirement: Unit test runner

The project SHALL provide Vitest configured with two projects — a `node` environment
for `server`/`services`/`lib`/`scripts` and a `jsdom` environment for
`app`/`components` — and a `npm run test` script that runs the full suite once.

#### Scenario: Test suite runs green

- **WHEN** `npm run test` runs
- **THEN** all tests pass and the command exits 0

#### Scenario: Node and browser tests use the right environment

- **WHEN** a test under `lib`/`server` runs versus a test under `components`
- **THEN** the former runs in the node environment and the latter in jsdom (DOM APIs
  available)

### Requirement: Seed unit coverage of existing logic

The suite SHALL include passing unit tests, requiring no Firebase emulator, for the
existing pure logic: PIN hashing/verification and lockout (`lib/auth/pin.ts`), the
`/scan` action resolver (`app/scan/route.ts`), the `toClientReader` serializer, and
the domain zod schemas from #5.

#### Scenario: PIN logic is covered

- **WHEN** the PIN tests run
- **THEN** they assert a correct PIN verifies, a wrong PIN fails, and repeated
  failures trigger the lockout

#### Scenario: Scan resolver is covered

- **WHEN** the `/scan` tests run
- **THEN** they assert each action maps to its path, the redirect is relative, and the
  `shelf` parameter is preserved

#### Scenario: Serializer never leaks the PIN hash

- **WHEN** the `toClientReader` test runs
- **THEN** it asserts `pinHash` is absent and `hasPin` reflects whether a hash existed

### Requirement: Pre-commit hook

The project SHALL install a Husky pre-commit hook (via the `prepare` script) that runs
lint-staged to auto-fix ESLint and apply Prettier to staged files.

#### Scenario: Staged files are linted and formatted on commit

- **WHEN** a commit is made with staged `*.ts`/`*.tsx` files
- **THEN** lint-staged runs ESLint `--fix` and Prettier on those files before the
  commit is created

### Requirement: CI gate

The project SHALL provide a GitHub Actions workflow that, on pull requests, runs
`lint`, `typecheck`, and `test`, and fails the check when any of them fail so the PR
is blocked from merging.

#### Scenario: CI fails on a broken PR

- **WHEN** a pull request contains a lint, type, or test failure
- **THEN** the CI workflow exits non-zero and the check is reported as failed

#### Scenario: CI passes on a clean PR

- **WHEN** a pull request passes lint, typecheck, and tests
- **THEN** the CI workflow succeeds and the check is green
