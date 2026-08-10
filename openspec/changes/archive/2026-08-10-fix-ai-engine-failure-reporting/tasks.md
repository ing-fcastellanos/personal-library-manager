## 1. Typed error carries the causes

- [x] 1.1 Extend the typed "no engine available" error in `services/ai/types.ts` so it
      carries the per-engine failures (engine name + underlying error), keeping its current
      constructor usable for the nothing-was-attempted case.

## 2. Orchestrator

- [x] 2.1 In `runWithFallback` (`services/ai/service.ts`), log each engine failure where it
      is caught, naming the engine — including failures a later engine goes on to cover.
- [x] 2.2 On exhaustion, raise the typed error with the collected causes instead of
      rethrowing the last raw error. Leave the fallback-disabled path (surface the primary
      error directly) untouched.
- [x] 2.3 Update `services/ai/service.test.ts:145` ("rethrows the last error when all
      configured engines fail") to the new contract: typed error, with both engines' causes
      reachable from it. Add coverage for a covered failure still being logged, and for
      both failures being logged when the chain is exhausted.

## 3. Route behavior

- [x] 3.1 Confirm — with a test, not by inspection — that an all-engines-failed run now
      reaches the `503` branch in `server/routes/ai-identify.ts` and `ai-shelf.ts` instead
      of `respondInternal`'s `500`. No route code should need changing; if it does, that is
      a finding worth surfacing.

## 4. Client messaging

- [x] 4.1 In `components/books/add-book-by-photo.tsx`, branch the failure path on the
      response: a `503`/service failure states the identification service is unavailable
      and does not blame or invite retaking the photo; an unrecognized book keeps the
      current photo-oriented guidance.
- [x] 4.2 Same distinction in `components/books/add-book-by-shelf.tsx` (shares the code
      path; no spec delta — its spec says nothing about message content).
- [x] 4.3 Component-test both: a `503` renders the service-unavailable message and no
      photo-quality advice; a successful-but-empty result keeps the existing message.

## 5. Verification

- [x] 5.1 `npm run lint`, `npm run typecheck`, and the AI + photo/shelf tests clean.
      (10 test files pass; lint and typecheck clean.)
- [x] 5.2 Live check limited to the failure path — with both providers out of quota, drive
      a real photo through the app and confirm it now surfaces as `503` with the honest
      message, and that Cloud Run logs show **both** engines failing, not just the last.
      The happy path cannot be exercised without spending real money; note it as pending a
      manual check once credit is restored rather than claiming it verified.

      **Adapted, and what that changes.** Gemini's quota recovered mid-implementation, so
      "both providers exhausted" was no longer reproducible in production. Verified the
      same code path locally instead, with deliberately invalid keys — both engines then
      report as configured and fail against the real APIs, at no cost, which is exactly
      the branch that was broken:
      - `POST /api/ai/identify` → **`503 {"error":"no AI engine available"}`**. The same
        condition previously produced `500 {"error":"internal"}`.
      - Server log shows **both** engines, one line each: `AI engine "openai" failed: 401
        Incorrect API key` and `AI engine "gemini" failed: API_KEY_INVALID`. Previously
        only the last one was ever visible.
      - UI renders "El servicio no está disponible … **No es tu foto**", with no mention of
        a blurry photo or better light.

      **Still unverified:** the happy path against live providers, and the
      failure-covered-by-fallback log in production. Both are covered by tests
      (`service.test.ts`), and neither is touched by this change's logic, but neither was
      exercised against a real engine. Worth a manual check next time a photo is added.
