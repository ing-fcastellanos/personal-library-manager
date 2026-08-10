## Context

`runWithFallback` (`services/ai/service.ts`) walks the engine order and, on exhaustion:

```ts
if (attempted && lastError) throw lastError;   // engines ran, all failed → raw error
throw new NoEngineAvailableError();            // nothing was even attempted
```

Both `ai-identify.ts` and `ai-shelf.ts` already do the right thing with the typed error:

```ts
if (err instanceof NoEngineAvailableError) return res.status(503).json({ error: "no AI engine available" });
respondInternal(res, req, err);                // 500 {"error":"internal"}
```

The typed error simply never arrives on the all-failed path, so every depleted-quota
incident is reported as an internal server error.

Three sources disagree about what should happen when every engine fails:

| Source | Says |
| --- | --- |
| `ai-provider` spec, "No engine available raises a typed error" | secondary "also not configured **or also fails**" → raise the typed error |
| `services/ai/service.ts` | rethrow the last provider's raw error |
| `services/ai/service.test.ts:145` | asserts `rejects.toThrow("gemini down")` |

Nobody noticed because the divergence is only observable when *both* engines fail at once,
which had not happened until now.

## Goals / Non-Goals

**Goals:**

- Report an exhausted/unavailable AI layer as exactly that: `503`, not `500 internal`.
- Keep the underlying provider errors — the thing the current behavior gets right.
- Make a multi-engine failure legible in the logs, engine by engine.
- Stop telling readers their photo was blurry when the service is down.

**Non-Goals:**

- Retries with backoff, quota pre-checks, or result caching.
- Changing engine order, selection, or models.
- Surfacing provider-specific detail (quota vs outage vs bad key) to the browser — the
  client learns "unavailable"; the cause stays in the server log (ADR-0009).

## Decisions

**The spec wins; the test changes.** Raising the typed error when every attempted engine
fails is what the spec already requires, and it is what makes the routes' existing `503`
mapping reachable. `service.test.ts:145` encodes the opposite, so it is updated rather than
worked around — a test that contradicts a live requirement is a bug in the test. Worth
stating plainly because "don't change tests to make code pass" is the right default; the
exception here is that the spec, written first, says the test is wrong.

**Causes travel with the typed error.** The rethrow behavior existed for a real reason:
it preserved the concrete provider error. Discarding that to gain correct HTTP semantics
would be a bad trade, so the typed error carries the per-engine failures instead. Net
diagnosability is *better* than today, where only the last engine's error survives.

**Log at the point of failure, not only at exhaustion.** Each engine's failure is logged
when it happens, tagged with the engine name. Collecting them for the final error alone
would still lose them whenever a later engine succeeds — and "the default is down but the
fallback is covering it" is precisely the condition worth noticing before it becomes an
outage.

**The client distinguishes by HTTP status, not by a new error body.** The two cases are
already distinct on the wire: a non-`ok` response means the layer failed, while `200` with
no candidate means the AI ran and recognized nothing. The UI just collapses both into one
message today. No new response shape is needed — which keeps the fix inside the components
and leaves the API contract untouched.

**Shelf gets the code fix, not a spec delta.** `add-book-by-shelf.tsx` shares the same
`if (!res.ok) throw` pattern and benefits from the same distinction. Its message is not
misleading (it never blames the photo), and `ai-shelf-add` specifies nothing about message
content, so improving it changes no stated behavior and needs no requirement change.

## Risks / Trade-offs

- **[Risk]** Anything relying on catching the raw provider error out of the AI service
  would now see the typed error → **Mitigation**: the only consumers are the two routes,
  both of which already branch on the typed error first (verified by grep); the raw error
  remains reachable through the attached causes.
- **[Trade-off]** A reader now sees "service unavailable" instead of a retry-the-photo
  prompt, which is less actionable *for them* — but it is true, and it stops an infinite
  loop of pointless retries. The owner's action (top up credit) is not something the app
  can offer, so the honest message is the useful one.
- **[Risk]** The happy path cannot be verified live while both providers are out of quota
  → **Mitigation**: failure paths are covered by tests with injected fake providers; the
  happy path is unchanged by this work, and a manual check follows whenever credit is
  restored.

## Migration Plan

None — no schema, endpoint, or response-shape change. The only behavioral change is on a
path that currently produces a wrong status code.
