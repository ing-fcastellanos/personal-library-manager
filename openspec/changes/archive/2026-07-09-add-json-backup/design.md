## Context

#36 wants a downloadable full backup so the reader has their own copy of the library independent of Firestore or any external service. The app already has every piece this needs: all five collections (`books`, `copies`, `readingEvents`, `readers`, `shelves`) have public `GET` list endpoints, and the exact Blob-download mechanic was already built for CSV export (#34, `components/reading/reading-export.tsx`). This is a small, low-risk change — the design decisions below are about a few things worth deciding explicitly rather than guessing, not about complex architecture.

## Goals / Non-Goals

**Goals:**

- One-click download of a single JSON file with a full snapshot of every collection.
- Zero new backend code — pure client-side aggregation of existing public endpoints.
- No auth secrets in the file (`pinHash` excluded).

**Non-Goals:**

- Restore-from-backup — tracked separately in #93; a destructive operation with real semantics to work out (replace vs. merge) and no admin/privilege tier to gate it safely yet.
- Scheduled/automated export to Cloud Storage — no scheduler infrastructure (Cloud Scheduler, Cloud Functions, cron) exists anywhere in this repo today; building it is a separate, much larger change.
- Pagination/streaming for very large libraries — out of scope at this app's household-library scale.

## Decisions

**D1 — Pure client-side aggregation, no new backend route.**
Fetch `/api/books`, `/api/copies`, `/api/reading-events`, `/api/readers`, `/api/shelves` in parallel via `Promise.all`, assemble the result into one object, and download it — the same "no new backend for something this small" pattern already used for CSV export. Alternative considered: a single `GET /api/backup` server route that queries all five repositories in one request — rejected because it would duplicate logic that already exists behind five endpoints for no real benefit (this app has no scale or latency problem that a single round-trip would solve).

**D2 — Readers reuse `/api/readers` as-is; no separate PII stripping needed.**
`/api/readers` already maps every reader through `toClientReader()`, which strips `pinHash` (replacing it with a derived `hasPin` boolean). Fetching from that endpoint (rather than, say, calling a repository function directly) means the backup automatically inherits that protection — there's no separate "strip sensitive fields" step to write or maintain.

**D3 — JSON shape: one object, five array keys, plus a timestamp.**

```json
{
  "exportedAt": "2026-07-09T21:00:00.000Z",
  "books": [...],
  "copies": [...],
  "readingEvents": [...],
  "readers": [...],
  "shelves": [...]
}
```

`exportedAt` records when the snapshot was taken — useful context for a file the reader might not open again for months. Plain nested arrays (not NDJSON or a zipped bundle) since this app's data volume is a personal/household library, not something that needs streaming.

**D4 — "Consistent" means best-effort, not transactional.**
The five collections are fetched in parallel, not inside a Firestore transaction — there's no existing infrastructure for a cross-collection atomic snapshot, and the client SDK path used by every other read in this app doesn't have one either. A write landing mid-fetch could theoretically produce a snapshot where, e.g., a brand-new `Copy` references a `Book` that arrived a moment after the `books` fetch resolved. This is accepted as a reasonable trade-off for a personal backup — restore isn't in scope this round, so there's no downstream operation that would be corrupted by this drift.

**D5 — No sign-in required.**
Every read this pulls from is already public ("reads are public, writes require a session" — the same doc comment appears on every resource route). The backup button on `/ajustes` doesn't need its own gate; consistent with everything else on that page.

**D6 — Filename: `backup-biblioteca-<YYYY-MM-DD>.json`.**
Date-stamped so a reader who downloads a backup periodically doesn't have same-name files silently overwriting each other in their Downloads folder.

## Risks / Trade-offs

- **[Risk]** Non-atomic snapshot (D4) could show minor cross-collection drift if data changes mid-export. → **Mitigation:** accepted trade-off — no restore path exists yet to be corrupted by it, and the drift window is a few sequential network round-trips on a personal app with light concurrent usage.
- **[Risk]** A large library could make the download slow on a poor connection. → **Mitigation:** not addressed now — this app's target scale (a household's personal collection) doesn't warrant pagination; revisit if it becomes a real complaint.

## Migration Plan

None — purely additive (new UI action, no schema or backend changes). Normal PR revert is sufficient rollback.

## Open Questions

None — the scope is deliberately narrow (export only, no restore, no scheduling) per the exploration discussion.
