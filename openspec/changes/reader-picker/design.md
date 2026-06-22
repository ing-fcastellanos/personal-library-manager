## Context

ADR-0013 reframed #11: no reader switch; the only multi-reader need is attribution (which reader read a book; per-reader dashboard). #11 delivers the reusable picker; its consumers (#24, dashboard) land later. It is a `claude-design` issue, so it follows the handoff loop (scaffold + prompt now, integrate the owner's Claude Design output later — as in #6/#9).

## Goals / Non-Goals

**Goals:**
- A controlled, accessible `ReaderPicker` (avatars, mobile-first), no PIN.
- A `useReaders` loader over `/api/readers`.
- Exercise it in the style guide.
- Author the Claude Design prompt; integrate the handoff.

**Non-Goals:**
- Mounting it in mark-read (#24) or the dashboard filter (#27–#29).
- Any reader-switch / PIN flow (removed by ADR-0013); removing the dormant PIN code (optional follow-up).

## Decisions

- **Controlled component.** `ReaderPicker({ value, onChange, readers? })` — purely presentational selection state lives with the consumer; the picker just renders options and reports selection. Avatars use `displayColor`/initials (consistent with the header/readers manager). Rationale: maximally reusable by #24 (attribution) and the dashboard (filter).
- **`useReaders` hook.** Fetches `/api/readers` (no-store), returns `{ readers, loading }`. One loader shared by the picker and future consumers; reads are public (ADR-0006) so no auth needed to list.
- **Default selection is the consumer's job.** The picker doesn't assume a default; #24 will default to the authenticated reader (via `useAuth`) and allow override. Keeping default out of the picker keeps it generic.
- **No security gate.** Selection is immediate, no PIN (ADR-0013).
- **Home for now: the style guide.** Since real consumers come later, add a `ReaderPicker` example to `/style-guide` so it has a living reference and is verifiable.
- **Claude Design handoff (ADR-0010).** Scaffold a functional picker on the primitives, author `claude-design-prompt.md` (picker states: default/selected/focus/loading/empty; avatar treatment; mobile-first; a11y; tokens), then integrate the owner's bundle.

## Risks / Trade-offs

- **No consumer yet** → exercised in the style guide; that's acceptable (the PIN-pad was likewise built ahead of #11). The component contract is driven by #24's needs (attribution with override).
- **Scaffold vs final design** → logic stays; the handoff replaces presentation (the #6/#9 pattern).

## Migration Plan

Additive on `claude/hola-oejkn3`. New component + hook + a style-guide example. Rollback = revert. Tasks for integrating the Claude Design output remain open until the owner provides the handoff.

## Open Questions

- Exact look (chips vs cards vs segmented control) — finalized by the Claude Design handoff.
- Whether to remove the now-dormant PIN code as part of this change or as a separate cleanup (leaning separate).
