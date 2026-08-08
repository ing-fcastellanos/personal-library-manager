# Contributing

Personal Library Manager is a solo-maintained personal project (a household
library app built for real, everyday use) shared publicly as a portfolio
piece. It isn't actively seeking external contributors, but the repo is open
for reading, forking, and discussion — issues and pull requests are welcome
if something's broken or you'd like to suggest an idea.

## Working in this repo

- **Setup**: see [README → Getting started](./README.md#getting-started).
- **Architecture decisions** are recorded in [`docs/adr/`](./docs/adr/) — read
  the relevant ADRs before proposing a structural change.
- **Feature work** follows [OpenSpec](https://github.com/Fission-AI/OpenSpec):
  changes are proposed, specified, and implemented as tracked artifacts under
  `openspec/changes/`. See [README → Spec-driven development](./README.md#spec-driven-development).
- **Before opening a PR**: `npm run lint`, `npm run typecheck`, and
  `npm run test` all need to pass — the same checks CI runs on every PR. A
  pre-commit hook (Husky + lint-staged) runs lint/format automatically.

## Reporting issues

Open a [GitHub issue](../../issues) with steps to reproduce (for a bug) or the
problem you're trying to solve (for a feature idea). There's no guarantee of a
timeline — this is maintained in spare time — but real reports are read.

## License

By contributing, you agree your contribution is licensed under this project's
[MIT License](./LICENSE).
