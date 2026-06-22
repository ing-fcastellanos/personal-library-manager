## Why

There's a shared device on the shelf in addition to each reader's phone (ADR-0013). That creates two multi-reader needs: **switching the operating reader** on the shared device, and **attributing** a reading to a reader (plus per-reader dashboard views). This change delivers issue **#11** as **both**: a reusable attribution **picker**, a **switch-reader** affordance (full re-login — pure), and a **PIN lock** that re-confirms the active reader on the shared device (the PIN's kept function, ADR-0013). Built on the design system (#6) via the Claude Design handoff (ADR-0010).

## What Changes

- Add a reusable, accessible **`ReaderPicker`** (avatar + name, controlled `value`/`onChange`, mobile-first) — **no PIN** (attribution is not a security boundary). Plus a `useReaders` loader over `/api/readers`.
- Add a **"Cambiar de lector"** affordance (in the account menu): signs out and routes to login, so the other reader logs in fresh. **Pure** — the PIN never mints another reader's session (ADR-0013).
- Add a **PIN lock**: a "Bloquear" action that locks the shared device to the **active reader**; unlocking requires that reader's **PIN** (reuses `PinPad` + `POST /api/auth/pin/verify`). It only re-confirms the same reader — never switches identity. This is the PIN's kept function (so #7/#9's PIN is **not** dormant).
- Exercise the picker in the **style guide**; run the **Claude Design handoff** for the picker, switch, and lock screens.

Out of scope: mounting the picker to attribute a reading (#24 — overlap noted there), the dashboard per-reader filter (#27–#29), any multi-account/PIN-minted switch (rejected by ADR-0013).

## Capabilities

### New Capabilities
- `reader-picker`: The multi-reader UI for the household — a reusable ungated reader **attribution picker** (+ `useReaders`), a pure **switch-reader** affordance (re-login), and a **PIN lock** that re-confirms the active reader on a shared device.

### Modified Capabilities
<!-- None. Consumes readers (#8), auth-ui/auth-session (#9/#7) and design-system (#6); their requirements don't change. The PIN endpoints from #7 are reused as-is. -->

## Impact

- **New code:** `components/readers/reader-picker.tsx`, `components/readers/use-readers.ts`, a `LockScreen` + lock state (e.g. `components/auth/lock-*`), a "Cambiar de lector" item in the account menu, and a `ReaderPicker` example in `app/style-guide`.
- **Consumes:** `/api/readers` (#8), `/api/auth/pin/verify` + `signOut` (#7/#9), design-system primitives + `PinPad` (#6/#9), auth state (#9).
- **No new deps; no backend changes** (the PIN verify endpoint already exists).
- **Downstream:** #24 mounts the picker for attribution (default = authenticated reader, override allowed); #27–#29 use it to filter the dashboard.
- **Decision record:** ADR-0013 (switch = re-login; PIN kept as active-reader lock; ungated attribution) refines ADR-0012.
