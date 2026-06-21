## 1. Reader type & schema

- [x] 1.1 Add `lib/types/reader.ts`: the `Reader` TypeScript type and a zod schema (name required; avatar/displayColor/goodreadsUrl/preferences/uid/pinHash optional; timestamps)
- [x] 1.2 Export create/update input schemas (omit server-managed fields)

## 2. Repository (server-mediated)

- [x] 2.1 Add `services/readers/repository.ts` using the Admin Firestore: list, get, create, update
- [x] 2.2 Enforce `uid` uniqueness on assignment via a Firestore transaction (query-before-write)
- [x] 2.3 Map Firestore documents to the `Reader` type with `createdAt`/`updatedAt`

## 3. API surface

- [x] 3.1 Add `server/routes/readers.ts`: `GET /api/readers`, `GET /api/readers/:id`, `PATCH /api/readers/:id` with zod validation
- [x] 3.2 Mount the router under `/api` in `server/index.ts`
- [x] 3.3 Add a TODO/marker that write routes will gain `requireAuth` in #7

## 4. Seed the two readers

- [x] 4.1 Add an idempotent seed (script under `scripts/` or a dev-only guarded endpoint) that creates the two readers by a stable seed key if absent
- [x] 4.2 Document how to run the seed against the emulator (and prod) in the README

## 5. Profile management UI

- [x] 5.1 Add a readers section to `app/ajustes/` listing the readers (name, avatar/initials, Goodreads link)
- [x] 5.2 Add an edit dialog (existing primitives) to update name / avatar / displayColor / goodreadsUrl, calling `PATCH /api/readers/:id`

## 6. Verification

- [x] 6.1 `npm run typecheck` passes
- [x] 6.2 With emulators: seed creates exactly two readers (idempotent on re-run); `GET /api/readers` returns them; a profile edit persists
- [x] 6.3 Confirm direct client read of `readers` is denied by the security rules (server-mediated only)
- [x] 6.4 `npm run build` succeeds
