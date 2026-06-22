## Context

ADR-0013: a shared shelf device coexists with personal phones. #11 delivers **both** the attribution picker and the shared-device controls (switch = re-login; PIN lock for the active reader). It is a `claude-design` issue, so it follows the handoff loop (scaffold + prompt now, integrate the owner's Claude Design output later — as in #6/#9). The PIN backend (#7) and `PinPad` (#9) are reused as-is.

## Goals / Non-Goals

**Goals:**
- A controlled, accessible, ungated `ReaderPicker` + `useReaders`.
- A pure "switch reader" affordance (sign out → login).
- A PIN lock that re-confirms the active reader (reuses `PinPad` + `/api/auth/pin/verify`).
- Exercise the picker in the style guide; author + integrate the Claude Design handoff.

**Non-Goals:**
- Mounting the picker in mark-read (#24) or the dashboard filter (#27–#29).
- Any multi-account / PIN-minted switch (rejected by ADR-0013).

## Decisions

- **Picker is controlled & ungated.** `ReaderPicker({ value, onChange, readers? })`; default selection is the consumer's job (#24 defaults to the authenticated reader). Avatars reuse `displayColor`/initials. Rationale: maximally reusable by #24 and the dashboard.
- **`useReaders`** fetches `/api/readers` (no-store) → `{ readers, loading }`. Reads are public (ADR-0006).
- **Switch = re-login (pure).** "Cambiar de lector" calls `signOut()` then routes to `/login`. No PIN, no token juggling, no multi-account (ADR-0013). Lives in the account menu (`AuthMenu` already has the slot).
- **PIN lock = client-side soft lock of the active reader.** A "Bloquear" action sets a locked state (persisted in `sessionStorage` so a refresh stays locked); a full-screen `LockScreen` shows the active reader and a `PinPad`; on complete it calls `POST /api/auth/pin/verify` with the **active reader's** id. Success → unlock. The lock never offers other readers (switching is re-login). If the active reader has no PIN set, the lock action points to set-PIN (Settings). Rationale: gives the shared kiosk a quick re-confirm without weakening identity (ADR-0013).
- **Home for the picker: the style guide** (its real consumers come later), so it's verifiable now.
- **Claude Design handoff (ADR-0010):** scaffold functional picker + switch item + lock screen on the primitives; author `claude-design-prompt.md` (picker states; switch confirmation; lock screen states default/error/locked; mobile-first; a11y; tokens); integrate the owner's bundle.

## Risks / Trade-offs

- **Client-side soft lock** → it's a convenience lock for a trusted home kiosk, not a hardened boundary (the real boundary is the session + server gating). Documented as such.
- **No PIN set yet** → lock gracefully routes to set-PIN instead of trapping the user.
- **Scaffold vs final design** → logic stays; the handoff replaces presentation (#6/#9 pattern).

## Migration Plan

Additive on `claude/hola-oejkn3`. New component/hook/lock; a menu item; a style-guide example. Rollback = revert. Integration tasks stay open until the owner provides the Claude Design handoff.

## Open Questions

- Auto-lock on inactivity vs manual lock only — start with **manual** (a "Bloquear" action); auto-lock can come later.
- Exact picker shape (chips / cards / segmented) and lock-screen layout — finalized by the handoff.
