## Context

#8 introduces the `Reader` domain on top of #2 (Firestore/Admin SDK) and #6 (design system), following ADR-0011 (identity model) and ADR-0009 (server-mediated access). It deliberately lands **before** #7 (auth/session), so it must be auth-agnostic yet forward-compatible with the Firebase-user linkage.

## Goals / Non-Goals

**Goals:**
- A `Reader` entity + zod schema as a shared type.
- A server-mediated repository and `/api/readers` (list/get/update) via the Admin SDK.
- Seed the two household readers (idempotent).
- A reserved, unique `uid` link field (populated by #7) and a reserved `pinHash`.
- A basic profile-management screen in `/ajustes` using existing primitives.

**Non-Goals:**
- Authentication, sessions, magic-link, PIN setting/verification — #7.
- The reusable active-reader selector UI — #11.
- Avatar image upload pipeline (avatar is an optional URL/initials for now).

## Decisions

- **Keying: stable `id` + `uid` field (ADR-0011).** The doc id is an app-level id (Firestore auto-id), not the Firebase uid. The `uid` is a separate, unique, nullable field. This lets profiles exist before auth and still honor "1 reader = 1 Firebase user". Alternative (doc id = uid) rejected: it would block seeding real readers before #7.
- **Server-mediated only (ADR-0009).** All reads/writes go through `/api/readers` (Admin SDK). The `readers` collection stays deny-by-default in the security rules.
- **`uid` uniqueness** enforced at the repository layer (query-before-write within a transaction), since Firestore has no native unique constraint. Good enough for a 2-reader home; revisited if needed.
- **Seed** via a small idempotent bootstrap (a script invoked manually, or a guarded dev-only endpoint) that creates the two readers if absent (match by a seed key/name).
- **Reader shape:** `{ id, name, avatar?, displayColor?, goodreadsUrl?, preferences: Record<string, unknown>, uid?: string|null, pinHash?: string|null, createdAt, updatedAt }`. `pinHash` is reserved and only written by #7.
- **UI:** a readers card/list in `/ajustes` with an edit dialog (existing `Dialog`, `Input`, `Button`, `Select`), no Claude Design handoff (not a `claude-design` issue) but consuming the design tokens.

## Risks / Trade-offs

- **Unauthenticated `/api/readers` until #7** → the write endpoints lack `requireAuth` until #7 wires it. Acceptable for emulator dev + a home deployment; #7 adds protection. Documented and called out here so it isn't forgotten.
- **uid uniqueness via transaction** → small race window mitigated by a transactional check; not a concern at 2 readers.
- **Seed identity** → seeding by name could duplicate if names change; use a stable seed key to keep idempotency.

## Migration Plan

Additive on `claude/hola-oejkn3`. New `readers` collection; no existing data to migrate. Seed is idempotent and reversible (delete the docs). Rollback = revert the commit.

## Open Questions

- The two readers' display names / emails — provided by the owner at seed time (emails matter for #7's magic-link, not for #8).
- Whether `preferences` should be typed now or kept as an open map until features need specific keys (leaning open map).
