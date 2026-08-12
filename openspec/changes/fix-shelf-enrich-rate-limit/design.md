## Context

`add-book-by-shelf.tsx` processes AI-identified shelf books one at a time (`for` loop, not
`Promise.all`), but each book still fires 1-2 `GET /api/enrich` calls back-to-back with no
inter-book delay. `services/enrichment/service.ts` already isolates failures per source via
`safe()`, and `services/enrichment/google-books.ts` already injects `fetchImpl`/`timeoutMs` for
testability — this change extends that existing shape rather than introducing a new one.

Google publishes no fixed anonymous RPM for Books API (confirmed via its own docs, which now
say public requests "must be accompanied by an identifier"), so the design cannot target a
specific number. It instead reacts to the real signal the API already gives: an HTTP 429.

## Goals / Non-Goals

**Goals:**

- Tell a genuine rate limit (429) apart from "no results" or any other failure, at the point
  `google-books.ts` reads the response.
- Retry only the rate-limited call, with bounded exponential backoff, before falling back to the
  same degraded behavior the code already has (cached negative result / Open Library fallback for
  search).
- Keep the retry fully injectable/testable — no real `setTimeout` waits in unit tests.
- Make a missing `GOOGLE_BOOKS_API_KEY` visible instead of a silent contributor to 429s.

**Non-Goals:**

- No fixed RPM/cooldown timer between books in the shelf loop — Google doesn't publish a number
  stable enough to encode, and reactive backoff already covers the failure case without slowing
  down the common case where the key is set and nothing 429s.
- No change to Gemini/OpenAI shelf identification — confirmed (during exploration) to be a single
  call per photo, not the source of the burst.
- No UI changes — the existing progress bar already reflects a slower batch.
- No retry for non-429 Google Books failures (network errors, timeouts, 5xx) — those already
  degrade correctly via `safe()` and retrying them risks masking a real outage instead of a quota
  blip.

## Decisions

**1. Typed error (`GoogleBooksRateLimitError`) thrown from `google-books.ts`, not a status code
returned.** Keeps `fetchVolumes`'s existing throw-on-`!res.ok` shape; callers that don't care
(anything using `safe()`) are unaffected, while `service.ts` can `instanceof`-check to decide
whether to retry. Alternative considered: return a discriminated result (`{ok, status}`) instead
of throwing — rejected because it would ripple through `googleBooksByIsbn`/`googleBooksSearch`'s
public return types and every existing caller/test, for no benefit over a typed throw.

**2. Retry lives in `service.ts` (`enrichByIsbn`/`searchByText`), not in `google-books.ts`.**
`service.ts` is already the orchestration layer that owns fallback-to-Open-Library and
cache-the-negative-result decisions; retry-then-fallback is one more policy decision at that same
layer. Keeping `google-books.ts` a thin client (detect 429, throw) keeps it consistent with
`open-library.ts`'s equally thin shape.

**3. Bounded retry: 2 attempts after the first failure (3 total), backoff ~500ms → 1.5s.**
Matches the number the user confirmed during exploration. Small enough that a genuinely exhausted
daily quota (not a burst blip) still fails fast into the existing degraded path rather than
stalling the shelf batch for many seconds per book.

**4. Backoff delay is injectable (`delayImpl`, defaulting to a real `setTimeout`-based sleep),
following the same pattern as `EnrichDeps`/`GoogleBooksOptions`'s `fetchImpl`.** Keeps retry
tests synchronous and fast instead of using fake timers or real waits.

**5. Only `GoogleBooksRateLimitError` is retried.** Any other thrown error (timeout, network,
non-429 HTTP status) still goes straight to `safe()`'s existing catch-and-degrade path. Retrying
those would risk turning a real outage into a multi-second stall per book for no benefit.

**6. Missing-key visibility via a one-time startup check, not a per-request log.** A log line (or
equivalent) when the process starts without `GOOGLE_BOOKS_API_KEY`, mirroring how `gemini.ts`
already documents (in comments) what happens when its own key is absent. Per-request logging
would spam on every shelf import and add noise without adding information.

## Risks / Trade-offs

- **Retries add latency per rate-limited book** (~2s worst case across both attempts) →
  acceptable: it only fires when already rate-limited, and the alternative today is silently
  losing the match entirely.
- **A sustained outage (not just a burst) still retries 2x before degrading**, adding a few
  seconds of a lost cause → mitigated by the deliberately small attempt count (goal 3); not
  eliminated, since distinguishing "burst" from "outage" from the 429 alone isn't reliable.
- **Backoff constants are hardcoded, not configurable** → acceptable for now; no evidence yet
  that different deployments need different values, and env-configurability can be added later
  without a design change if it turns out to matter.

## Migration Plan

No data migration. Rollout is a plain code deploy:

1. Ship the typed error + retry behind the existing `safe()`-wrapped call sites — behavior is
   additive (only changes what happens on a 429, which today is an unconditional immediate
   degrade).
2. No feature flag needed: the retry only changes behavior on a path that was already failing
   (429), so there's no regression risk to a currently-working path.
3. Rollback is a plain revert if the retry ever proves harmful (e.g., masking a real outage
   longer than desired).

## Open Questions

- None outstanding — API key handling and backoff/retry parameters were confirmed with the user
  during exploration.
