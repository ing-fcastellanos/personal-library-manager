## Why

With ADR-0013 settled, the only multi-reader need is **attribution** — which reader read a book, and per-reader dashboard views — not a session switch (each reader uses their own phone; switching = full logout/login). This change delivers issue **#11**, reframed: a **reusable reader picker** that selecting flows (#24 mark-read) and the dashboard (#27–#29) consume to attribute or filter by reader. Built on the design system (#6) via the Claude Design handoff (ADR-0010).

## What Changes

- Add a reusable, accessible **`ReaderPicker`** component: shows the household readers (avatar + name) and selects one. Controlled (`value` / `onChange`), mobile-first, keyboard-accessible. **No PIN / no security gate** — attribution is not a security boundary (ADR-0013).
- Add a small **readers hook** (`useReaders`) that loads the household readers from `/api/readers` for the picker (and future consumers).
- Exercise the component in the **style guide** (`/style-guide`) as the living reference, since its real consumers (#24, dashboard) land later.
- Run the **Claude Design handoff** for the picker (prompt + integration).
- Record the consequence (already in ADR-0013): the **PIN** built in #7/#9 is now **dormant** (it gated the removed reader-switch). This change does **not** remove it; a follow-up cleanup can.

Out of scope: using the picker to attribute a reading (#24 — overlap noted there), the dashboard per-reader filter (#27–#29), any reader-switch / PIN flow (removed by ADR-0013), removing the dormant PIN code (optional follow-up).

## Capabilities

### New Capabilities
- `reader-picker`: A reusable component to select one of the household readers for **attribution** and dashboard filtering — controlled, accessible, no security gate (ADR-0013), with a `useReaders` loader.

### Modified Capabilities
<!-- None. Consumes readers (#8), auth-ui (#9) and design-system (#6); their requirements don't change. The PIN's deprecation is recorded in ADR-0013, not as a spec change here. -->

## Impact

- **New code:** `components/readers/reader-picker.tsx`, `components/readers/use-readers.ts`; a `ReaderPicker` example in `app/style-guide`.
- **Consumes:** `/api/readers` (#8), the design-system primitives (#6), the auth state (#9) for the default-selected reader where a consumer wants it.
- **No new deps; no backend changes.**
- **Downstream:** #24 mounts the picker to attribute a reading (default = authenticated reader, override allowed); #27–#29 use it to filter the dashboard by reader.
- **Decision record:** ADR-0013 (no reader switch; PIN dormant) supersedes the reader-switch parts of ADR-0012.
