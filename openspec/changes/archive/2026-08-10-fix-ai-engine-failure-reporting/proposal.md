## Why

When every AI engine fails, the app misreports the problem at all three layers. Found by
diagnosing a live report — "book recognition from cover photos doesn't work" — where both
providers were simply out of credit:

```
17:51:55  POST /api/ai/identify → 500
          429 "You have no credits remaining"          OpenAI, credit_balance_exhausted
13:06:01  429 "Your prepayment credits are depleted"   Gemini, RESOURCE_EXHAUSTED
```

The credits are the owner's to top up. What made this nearly undiagnosable is code:

1. **A three-way divergence.** The `ai-provider` spec says that when the default engine
   fails and the secondary *also fails*, the system raises the typed "no engine available"
   error. `runWithFallback` instead rethrows the last provider's raw error, and
   `service.test.ts:145` asserts that rethrow — so the spec, the code, and the test each
   claim something different. Because the typed error is never raised, the routes'
   `instanceof NoEngineAvailableError` check misses and the response is `500
   {"error":"internal"}` instead of the `503` both routes already implement. A depleted
   upstream is not an internal bug.
2. **Only the last engine's failure is ever visible.** `runWithFallback` overwrites
   `lastError` each round and logs nothing in between. In the incident the logs showed only
   OpenAI failing, while Gemini — the default at the time — had failed first, silently. The
   logs pointed at the wrong provider.
3. **The UI blames the reader's photo.** A billing `429` renders as *"La foto salió borrosa
   … Probá con más luz o enfocando la tapa"*, sending the reader to retake photos forever
   for something no photo can fix.

## What Changes

- When every attempted engine fails, raise the typed "no engine available" error **with the
  per-engine causes attached**, so the routes answer `503` and the real errors survive for
  diagnosis. Updates `service.test.ts:145`, which encodes behavior the spec contradicts.
- Log each engine's failure as it happens, naming the engine, before trying the next.
- Add-by-photo distinguishes "the identification service is unavailable" from "the AI ran
  and didn't recognize the book", and stops attributing the former to the photo.
- Add-by-shelf gets the same distinction — it shares the code path. Its current wording
  ("No se pudo analizar el estante") isn't misleading, and its spec says nothing about
  message content, so no spec delta is needed there.

**Not changed**: engine order and selection, models (production defines no
`OPENAI_VISION_MODEL`/`GEMINI_VISION_MODEL`, so it uses the code defaults `gpt-4o` and
`gemini-flash-latest` — both valid, no second failure waiting behind the credits), retries
with backoff, and result caching.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `ai-provider`: the automatic-fallback requirement gains the explicit all-engines-failed
  contract — typed error, causes preserved, every failure logged — resolving the
  spec/code/test conflict in the spec's favour.
- `ai-photo-add`: the photo entry point's error scenario must tell the reader whether the
  service is unavailable or the book simply wasn't recognized, and must not blame the photo
  for a service failure.

## Impact

- `services/ai/service.ts` — `runWithFallback`: per-engine logging, typed error on
  exhaustion.
- `services/ai/types.ts` — the typed error carries the per-engine causes.
- `services/ai/service.test.ts` — the all-engines-fail test asserts the new contract.
- `components/books/add-book-by-photo.tsx`, `components/books/add-book-by-shelf.tsx` —
  message accuracy.
- No API surface change: both routes already map the typed error to `503`; they simply stop
  missing it. Behavior only changes on a path that is currently broken.
- **Verification is test-first by necessity**: with both providers out of quota the happy
  path cannot be exercised live without spending real money. Failure paths are covered with
  injected fake providers — the pattern `service.test.ts` already uses.
