## Why

21 of the app's screens (the `claude-design` issues) need to look and behave consistently, be accessible, and be mobile-first (used standing at the bookshelf). They all build on a shared foundation that does not exist yet. This change delivers issue **#6**: the design tokens, UI primitives, responsive app shell and PWA base that every later UI issue consumes, following ADR-0010 (Tailwind + shadcn/ui, tokens as source of truth, Claude Design handoff pipeline).

## What Changes

- Adopt **Tailwind CSS** and initialize **shadcn/ui** (owned, Radix-based primitives) per ADR-0010.
- Define **design tokens as CSS variables** (color, typography scale, spacing, radius, shadow, breakpoints) as the single source of truth, mapped into the Tailwind theme.
- Add **light/dark theming** by switching those variables, with persistence and a toggle.
- Add the **base primitive components** (Button, Input, Select, Dialog, Toast, Card, Skeleton, EmptyState, Badge, Tabs, Avatar, Dropdown) — primitives only; no domain components.
- Add a **responsive app shell**: bottom-nav on mobile, sidebar on desktop, with the 5 sections (Dashboard, Add, Mark-read, Catalog, Settings) and support for deep-link landing (the QR actions in #32 open directly on a route).
- Add **PWA base**: web manifest, icons, viewport and `theme-color` so the app is installable (offline/service worker is explicitly out of scope — #41).
- Add a **style-guide page** that renders the tokens and primitives as the living reference downstream handoffs target.
- Run the **Claude Design handoff** for the shell + primitive library (generate the prompt against the project tokens; integrate the output to shadcn primitives + tokens).

Out of scope: domain components (BookCard, rating, chart wrappers, scanner viewport — built per feature), offline/notifications (#41), and any concrete feature screen.

## Capabilities

### New Capabilities
- `design-system`: The shared UI foundation — design tokens (CSS variables → Tailwind), light/dark theming, an accessible primitive component library, a responsive app shell (mobile bottom-nav / desktop sidebar) with deep-link landing, an installable PWA base, and a style-guide reference. This is the contract the `claude-design` issues consume.

### Modified Capabilities
<!-- None. app-platform (the server/SSR shell) is unchanged; this adds the UI layer on top. -->

## Impact

- **New code/deps:** `tailwindcss` + PostCSS, `tailwind.config`, shadcn/ui scaffolding and `components/ui/*`, `app/globals.css` (token definitions + Tailwind layers), a theme provider, `app/layout.tsx` (shell), `components/shell/*` (nav), `app/(style-guide)` page, `public/manifest.webmanifest` + icons.
- **Architecture:** implements ADR-0010. Establishes the token contract and handoff pipeline reused by ~21 downstream issues.
- **Downstream:** unblocks every `claude-design` UI issue (#9, #11, #14, #15, #17, #18, #19, #20, #21, #22, #23, #24, #25, #26, #27, #28, #29, #30, #31, #34, #35, #37, #38, #39, #41).
