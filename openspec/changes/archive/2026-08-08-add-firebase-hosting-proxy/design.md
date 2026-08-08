## Context

The app runs as a single Express + Next.js SSR container on Cloud Run (ADR-0001),
deployed automatically by GitHub Actions on push to `main` (`deployment` capability).
Firebase Hosting is already used for Firestore/Storage/Auth-emulator config (`firebase.json`
exists with `firestore`/`storage`/`emulators` keys) but has no `hosting` key today — the app
is only reachable at its Cloud Run URL.

Firebase Hosting supports rewriting requests directly to a Cloud Run service
(`hosting.rewrites[].run`), acting as a managed edge in front of it: free global CDN,
managed SSL, and `*.web.app`/`*.firebaseapp.com` domains (with a custom domain addable
later). This is different from "Firebase Hosting alone", which ADR-0001 correctly rejected
because it can't run an arbitrary Express server — here Cloud Run still runs the server;
Hosting only proxies to it.

## Goals / Non-Goals

**Goals:**

- Add a Firebase Hosting front door for the existing Cloud Run service with zero behavior
  change — every request still reaches the same Express/Next server.
- Keep the change reversible and low-risk: config + docs only, no server code touched.
- Document the one-time manual setup so it's reproducible (matching `docs/deploy.md`'s
  existing runbook style).

**Non-Goals:**

- Custom domain setup (mentioned as a future step, not implemented here).
- Migrating to Firebase App Hosting or any other SSR-on-Firebase product.
- Serving any static assets directly from Hosting's CDN (see Decisions — deliberately
  avoided for this change).
- Automating the Hosting deploy in CI (stays a manual `firebase deploy --only hosting`
  for now, same as the existing `firestore:indexes,firestore:rules` deploy step).

## Decisions

**Full passthrough rewrite, no static `public` directory served by Hosting.**
`firebase.json`'s `hosting.public` could point at the Next `public/` folder so Hosting's
CDN serves icons/manifest/`sw.js` directly (faster, free), while a catch-all rewrite
handles everything else. Rejected for this change: it would mean two different servers
(Hosting's static file server vs. Express) serving overlapping paths with potentially
different headers/caching for the PWA assets (`sw.js` in particular is header-sensitive —
`Service-Worker-Allowed`, cache-control), and the goal here is a zero-risk edge addition,
not a performance optimization. A single `"source": "**"` rewrite to the Cloud Run service
keeps behavior byte-for-byte identical to today; splitting static assets to Hosting's CDN
can be a later, separate, measured change if it's ever worth it.

**Rewrite target matches `docs/deploy.md`'s existing values.** `serviceId:
"personal-library-manager"`, `region: "us-central1"` — the same Cloud Run service the
GitHub Actions pipeline already deploys to. No new service, no new deploy target.

**IAM: verify, don't assume, that Hosting can invoke the service.** The Cloud Run service
already serves public web traffic unauthenticated (it's a public web app), so it almost
certainly already allows unauthenticated invocations (`roles/run.invoker` for
`allUsers`) — which is sufficient for Hosting's rewrite to reach it too. The runbook
documents checking this explicitly (`gcloud run services get-iam-policy`) rather than
assuming, since if the service were ever locked down this would silently 403 through
Hosting.

**Extend ADR-0001 rather than write a full new ADR.** The decision here is narrow (an
additional front door, not a new hosting target) and directly revisits an alternative
ADR-0001 already discussed and rejected. Adding a short dated note to its Alternatives
section keeps the history in one place instead of forking the narrative across two ADRs
for what is, architecturally, the same "where does traffic land" decision.

**Manual runbook, not CI automation.** `docs/deploy.md` already treats one-time
Firebase-side setup (Firestore indexes/rules deploy, Auth provider toggles) as
maintainer-run PowerShell steps, not GitHub Actions jobs. Hosting deploys rarely (only
when `firebase.json`'s `hosting` config changes) — folding it into every CI push would add
a step that runs on every commit for something that changes almost never. Follows the
existing pattern instead of introducing a new one.

## Risks / Trade-offs

- **[Risk]** Firebase Hosting's rewrite silently 403s if the Hosting service agent lacks
  invoke permission on the Cloud Run service → **Mitigation**: runbook step explicitly
  checks `gcloud run services get-iam-policy` for `allUsers`/`roles/run.invoker` before
  declaring the setup done, with the grant command included if it's missing.
- **[Risk]** A new public domain (`*.web.app`) needs to be added to Firebase Auth's
  authorized domains or magic-link sign-in breaks with `unauthorized-continue-uri` when
  accessed via the new domain → **Mitigation**: runbook step added right after the
  existing "Authorized domains" section in `docs/deploy.md`, same failure mode already
  documented there for the Cloud Run domain.
- **[Trade-off]** Two public URLs now serve the same app (Cloud Run's `*.run.app` and
  Hosting's `*.web.app`) with no redirect between them → acceptable for this change; not
  addressed since a custom domain (the eventual single canonical URL) is explicitly out of
  scope here.

## Migration Plan

1. Land the config/docs change (this proposal) — no production effect until deployed.
2. Maintainer runs the `docs/deploy.md` runbook once: enable the Hosting API, verify/grant
   Cloud Run invoker access, `firebase deploy --only hosting`, add the new domain to
   Firebase Auth's authorized domains, smoke-test `/api/health` and the app shell through
   the new domain.
3. Rollback: `firebase hosting:disable` (or simply stop pointing users at the `*.web.app`
   URL) — the Cloud Run service and its existing `*.run.app` URL are untouched throughout,
   so rollback has no effect on production availability via the original URL.

## Open Questions

- None — the design intentionally excludes custom domain and CI automation to keep this
  change small; both are natural, separate follow-ups if wanted later.
