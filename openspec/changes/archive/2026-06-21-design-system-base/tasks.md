## 1. Tailwind & shadcn/ui setup

- [x] 1.1 Install and configure Tailwind CSS for Next 15 (PostCSS, `globals.css` layers)
- [x] 1.2 Initialize shadcn/ui (config, `components/ui/` path, base style)
- [x] 1.3 Install icon set (lucide) and confirm Tailwind builds in `npm run build`

## 2. Design tokens & theming

- [x] 2.1 Define semantic design tokens as CSS variables in `globals.css` (color, typography scale, spacing, radius, shadow) and map them into the Tailwind theme
- [x] 2.2 Add light/dark token sets (class strategy) and a no-flash theme provider with `localStorage` persistence
- [x] 2.3 Add a theme toggle component

## 3. Primitive component library

- [x] 3.1 Generate base primitives via shadcn into `components/ui/`: button, input, select, dialog, toast (sonner), card, skeleton, badge, tabs, avatar, dropdown-menu
- [x] 3.2 Add an `EmptyState` primitive (composed from base) following the tokens
- [x] 3.3 Ensure all primitives consume tokens (no hard-coded colors) and keep keyboard/ARIA behavior

## 4. Responsive app shell

- [x] 4.1 Define a single nav config for the 5 sections (Dashboard, Add, Mark-read, Catalog, Settings)
- [x] 4.2 Build `components/shell/Sidebar` (desktop) and `components/shell/BottomNav` (mobile), switched by breakpoint
- [x] 4.3 Wire the shell into `app/layout.tsx`; ensure action routes render directly (deep-link landing for #32)

## 5. PWA base

- [x] 5.1 Add `public/manifest.webmanifest` + app icons
- [x] 5.2 Add viewport + `theme-color` + manifest link in the root layout (installable; no service worker — #41)

## 6. Claude Design handoff

- [x] 6.1 Author the Claude Design prompt for the shell + primitive library: sections, states (default/hover/focus/disabled/loading/empty/error), responsive (mobile-first), accessibility, and the project token set
- [x] 6.2 Run the design in Claude Design and integrate the output: map to shadcn primitives + tokens, reconcile with the shell, replace placeholders
- [x] 6.3 QA visual responsive (mobile/desktop) and accessibility on the integrated result

## 7. Style guide & verification

- [x] 7.1 Build a `/style-guide` page rendering token swatches/scales and every primitive in its states
- [x] 7.2 `npm run typecheck` passes
- [x] 7.3 `npm run build` succeeds; the shell renders on mobile (bottom-nav) and desktop (sidebar); light/dark toggle works and persists
