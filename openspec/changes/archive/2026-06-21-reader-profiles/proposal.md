## Why

The app needs the two household readers as first-class entities before reading events, dashboards or Goodreads links can attribute anything (ADR-0005, ADR-0007). This change delivers issue **#8**: the `Reader` data model, its server-mediated repository/API, profile management, and the seed of the two readers — keyed so that auth (#7) can later link each reader to a Firebase user without reshaping the data (ADR-0011).

## What Changes

- Add a **`Reader` entity** in Firestore (`readers/{id}`) with: stable `id`, `name`, optional `avatar`, `displayColor`, optional `goodreadsUrl`, `preferences` (extensible map), and a **`uid`** field (1:1 link to a Firebase Auth user, **nullable** until #7 sets it at first login) plus a reserved `pinHash` (set in #7).
- Add a **server-mediated repository + `/api/readers` endpoints** (list, get, update) using the Admin SDK with zod validation (ADR-0009).
- **Seed the two readers** (bootstrap) so the rest of the app has them from day one.
- Add a **basic profile-management screen** in Settings (`/ajustes`) using existing primitives (no Claude Design handoff — #8 is not a `claude-design` issue): view the readers, edit name / avatar / displayColor / Goodreads URL.
- Enforce **`uid` uniqueness** (a Firebase user maps to at most one reader), reserved for #7.

Out of scope: authentication/session and PIN setting (#7), the reusable active-reader **selector UI** (#11), the QR auth flow (#10), reading goals (#30).

## Capabilities

### New Capabilities
- `readers`: The reader domain — the `Reader` entity and its server-mediated repository/API, the two seeded household readers, profile management, and the reserved 1:1 link to a Firebase Auth user (`uid`) that auth (#7) populates.

### Modified Capabilities
<!-- None. firebase-integration is consumed (Admin SDK / Firestore) but its requirements don't change. -->

## Impact

- **New code:** `lib/types/reader.ts` (shared type + zod schema), `services/readers/` (repository), `server/routes/readers.ts` (`/api/readers`), a seed path (script or guarded endpoint), and a readers section in `app/ajustes/`.
- **Data:** new `readers` collection; ADR-0009 deny-by-default Firestore rules already block direct client access (server-mediated only).
- **Sequencing note:** because #8 lands before #7, the `/api/readers` write endpoints are unauthenticated until #7 adds `requireAuth`; acceptable for emulator-based development and a home deployment, and called out in the design.
- **Downstream:** unblocks #7 (links `uid`/`pinHash` to a reader), #10 (QR auth needs readers), #11 (selector UI), and every reading/dashboard feature that attributes to a reader.
