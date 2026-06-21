## Context

#6 builds the UI foundation on the #1 skeleton (Next 15 App Router + custom Express). ADR-0010 fixes the stack: Tailwind + shadcn/ui, design tokens as CSS variables (single source of truth), and a repeatable Claude Design handoff. This is the contract ~21 `claude-design` issues consume, so getting the tokens and primitives right matters more than any single screen.

## Goals / Non-Goals

**Goals:**
- Tailwind + shadcn/ui wired into Next 15.
- Design tokens as CSS variables mapped into the Tailwind theme; light/dark.
- Accessible primitive library (primitives only).
- Responsive shell: bottom-nav (mobile) / sidebar (desktop), 5 sections, deep-link landing.
- Installable PWA base (manifest/icons/viewport/theme-color).
- A style-guide page as the living reference.
- Execute the Claude Design handoff for the shell + primitives.

**Non-Goals:**
- Domain components (BookCard, rating, charts, scanner viewport) — per feature.
- Offline / service worker / push notifications — #41.
- Any concrete feature screen.

## Decisions

- **Tailwind version.** Use the current Tailwind major that shadcn/ui supports cleanly with Next 15 (Tailwind v4, CSS-first `@theme`/`@import`). Rationale: shadcn + Tailwind v4 is the current path; avoids a near-term migration. If a blocker appears, fall back to v3 with `tailwind.config.ts` — the token-as-CSS-variable contract is identical either way.
- **Tokens as CSS variables, Tailwind maps to them.** Define semantic tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--radius`, spacing/type scales) in `globals.css`; Tailwind theme references `var(--token)`. Theming = swapping variable values under a `.dark` class / `data-theme`. This is what lets one token edit cascade to all 21 screens and keeps Claude Design output aligned.
- **shadcn/ui owned in-repo.** Initialize shadcn and generate primitives into `components/ui/*` (we own/edit them). Use it for Dialog, Toast (sonner), Tabs, Select, Dropdown, etc. — the accessible Radix-backed pieces.
- **Theme provider.** A small client theme provider (class strategy) with `localStorage` persistence and no-flash hydration; toggle lives in the shell/Settings.
- **Shell composition.** `app/layout.tsx` renders the shell; `components/shell/` holds `BottomNav` (mobile) and `Sidebar` (desktop) driven by one nav config (5 sections). The shell is route-aware so action routes (`/add`, `/mark-read`, …) render directly (deep-link landing for #32).
- **PWA base only.** `public/manifest.webmanifest` + icons + `<meta theme-color>` + viewport in the root layout. No service worker here (kept for #41) to avoid caching surprises during early development.
- **Style guide.** A route (e.g. `/style-guide`) that renders token swatches/scales and every primitive in its states — the reference each handoff targets.
- **Claude Design handoff pipeline (ADR-0010).** For this issue the handoff target IS the shell + primitive library: (1) author the prompt describing the shell, primitives, states, responsive behavior, a11y and the token set; (2) Claude Design emits React+Tailwind; (3) integrate to shadcn primitives + tokens, wire nav, QA a11y/responsive.

## Risks / Trade-offs

- **Tailwind v4 vs shadcn edge cases** → if integration friction appears, fall back to Tailwind v3; the token contract is unchanged. Mitigation baked into the version decision.
- **Token churn breaking downstream screens** → lock the semantic token names early; treat renames as spec changes. The style guide surfaces regressions.
- **Hydration theme flash** → use the standard pre-hydration inline script / class strategy to set theme before paint.
- **Scope creep into domain components** → spec explicitly excludes them; reviewers reject domain components in `components/ui`.

## Migration Plan

Additive on `claude/hola-oejkn3`. Replaces the placeholder `globals.css` and landing page with the tokenized shell. No data concerns. Rollback = revert the commit.

## Open Questions

- Exact semantic token palette (brand colors) — finalized during the Claude Design step against the style guide.
- Icon set for nav (e.g. lucide, which ships with shadcn) — default to lucide unless preferred otherwise.
