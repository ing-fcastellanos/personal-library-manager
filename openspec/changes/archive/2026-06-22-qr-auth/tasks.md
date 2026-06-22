## 1. Scan resolver

- [x] 1.1 Add `app/scan/route.ts` (`GET`): map `action` (`dashboard→/`, `add→/agregar`, `finish→/leido`; unknown/missing→`/`), append `shelf` when present, and `NextResponse.redirect`
- [x] 1.2 Keep the action→route map in one place for reuse/readability

## 2. Shelf context

- [x] 2.1 Add `components/shelf/shelf-context.tsx`: `ShelfProvider` reading `?shelf` via `useSearchParams` + `useShelf()` hook (URL-primary, `sessionStorage` backup)
- [x] 2.2 Mount `ShelfProvider` in the root layout (Suspense-wrapped as needed for `useSearchParams`)

## 3. Preserve query in `next`

- [x] 3.1 Add a `useNextParam()` hook returning `encodeURIComponent(pathname + search)`
- [x] 3.2 Update `components/auth/write-cta.tsx` (and `auth-control` / `pin-section`) to build `next` from path + query

## 4. Verification

- [x] 4.1 `npm run typecheck` passes
- [x] 4.2 `/scan?action=add&shelf=3` redirects to `/agregar?shelf=3`; `/scan?action=dashboard` → `/`; unknown action → `/`
- [x] 4.3 An unauthenticated write at `/agregar?shelf=3` redirects to `/login?next=` carrying the full path + query
- [x] 4.4 `npm run build` succeeds
