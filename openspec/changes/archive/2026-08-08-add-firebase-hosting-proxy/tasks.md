## 1. Config

- [x] 1.1 Add a `hosting` block to `firebase.json`: catch-all rewrite (`"source": "**"`) to
      the `personal-library-manager` Cloud Run service in `us-central1`, no `public`
      directory.

## 2. Docs

- [x] 2.1 Extend `docs/adr/0001-hosting-cloud-run.md`'s Alternatives section with a dated
      note: Firebase Hosting as a Cloud Run proxy is adopted, distinct from the
      already-rejected "Firebase Hosting (solo)" option.
- [x] 2.2 Add a "Firebase Hosting (proxy in front of Cloud Run)" runbook section to
      `docs/deploy.md`: enable the Hosting API, verify/grant Cloud Run invoker access for
      Hosting, `firebase deploy --only hosting`, smoke-test `/api/health` through the new
      domain, add the new domain to Firebase Auth's authorized domains.

## 3. Spec sync

- [ ] 3.1 Archive this change so the `deployment` delta spec merges into
      `openspec/specs/deployment/spec.md`.

## 4. Manual infra (maintainer-run, not automated here)

- [ ] 4.1 Enable the Firebase Hosting API for the project.
- [ ] 4.2 Verify (via `gcloud run services get-iam-policy`) or grant that the Cloud Run
      service accepts requests from Firebase Hosting.
- [ ] 4.3 Run `firebase deploy --only hosting --project personal-library-manager-frank`.
- [ ] 4.4 Add the resulting `*.web.app` domain to Firebase Auth's authorized domains.
- [ ] 4.5 Confirm the app loads and `/api/health` returns `200` via the new Hosting domain.
