## Context

The scan/shelf-context/preselection chain (#10, #18) is complete and unmodified by this change — `add-book.tsx` and `catalog-browse.tsx` already read `useShelf()` and default correctly. The only missing piece is generating and displaying a QR per shelf. #31 (`add-qr-print-sheets`, archived) already solved "render a QR + let the reader print it" for the three global action QRs; this change reuses that piece rather than re-solving it, scoped to a single per-shelf tile shown from a dialog on the Shelves Manager.

## Goals / Non-Goals

**Goals:**

- A "Ver QR" action on each shelf row in the Shelves Manager, opening a dialog with that shelf's QR (`/scan?action=add&shelf=<id>`).
- A focused print of that one tile — not the whole page, not a combined multi-shelf sheet.
- Reuse `<QrCode>` and the print-tile visual language from #31 exactly (same cm-based sizing, border-as-cut-line, icon+label+subtext layout) so a shelf QR looks like a sibling of the three action QRs, not a different design.

**Non-Goals:**

- A combined "print all shelf QRs at once" sheet — one shelf, one print job, printed when that shelf is set up (or changes), not in a batch.
- Any change to `/scan`, shelf-context, or the add-form/catalog preselection logic — already correct (#10/#18).
- Encoding anything beyond `action=add&shelf=<id>` — no "view this shelf" read-only QR variant; the issue's acceptance criterion is specifically about the add flow.

## Decisions

**Decision 1 — One dialog per shelf row, not a dedicated page.**
Printing a shelf's QR is a rare, per-shelf setup action (do it once when the shelf is created, maybe again if a label wears out) — it belongs inline with that shelf's other actions (Ver contenido / editar / eliminar), not a separate navigation destination. Matches #31's Decision 4 reasoning (setup actions live where the thing they're about already is).

**Decision 2 — The print-only tile is a `createPortal` sibling of the dialog, not nested inside it.**
`DialogContent` must itself be print-hidden (so the dialog chrome — title, close button, popover card styling — never prints); a `display:none` ancestor can't be overridden by a `print:block` descendant, so the print tile can't live inside `DialogContent`. Instead, `ShelfQrDialog` renders the print-only tile via `createPortal(..., document.body)`, a sibling of the Dialog in the DOM, active only while the dialog is open. `DialogOverlay`'s shared primitive gains a `print:hidden` (a universally-correct default — no dialog backdrop should ever print) since it's rendered internally by `DialogContent` and can't otherwise be overridden per-usage.

**Decision 3 — `/ajustes` itself gains a `print:hidden` wrapper.**
Without it, printing while the dialog is open would print the portal tile _and_ the whole Settings page underneath it (nothing currently hides page body content, only the shell chrome does, from #31). Matches the "screen content defaults to not printing" policy #31 already established at the shell level — extended here to page bodies since this is now the second page-level printable surface.

**Decision 4 — `scanUrl` grows an optional `shelfId` parameter, not a parallel helper.**
`scan-url.ts`'s `scanUrl(action, origin)` becomes `scanUrl(action, origin, shelfId?)`, appending `&shelf=<id>` (URL-encoded, matching the existing pattern in `app/scan/route.ts`) when present. Backward-compatible — #31's three call sites are unaffected — and keeps one function as the single source of truth for building `/scan` URLs rather than a second near-duplicate.

## Risks / Trade-offs

- **[Risk] `print:hidden` added to the shared `DialogOverlay` primitive affects every dialog in the app, not just this one** → Mitigation: it's a strict improvement (no legitimate reason for a modal backdrop to print) and low-risk — dialogs are transient UI, nothing currently depends on printing one open. Scoped to the overlay only; other dialogs' _content_ keeps its current (unspecified) print behavior, since that's a pre-existing gap outside this change's scope.
- **[Risk] `createPortal` to `document.body` is more machinery than a plain nested block** → Mitigation: necessary given Decision 2's constraint (a hidden ancestor can't be un-hidden by a descendant); kept contained to this one component.

## Migration Plan

None — additive UI + a backward-compatible parameter addition to an existing helper. No data model or API changes.

## Open Questions

None outstanding — scope, placement, and reuse were confirmed during exploration.
