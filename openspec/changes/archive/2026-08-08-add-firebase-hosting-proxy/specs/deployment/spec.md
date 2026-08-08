## ADDED Requirements

### Requirement: Firebase Hosting fronts the Cloud Run service

The repository SHALL declare a `hosting` configuration in `firebase.json` that rewrites all
requests to the production Cloud Run service (`personal-library-manager`, `us-central1`)
via a full-passthrough catch-all rewrite. Hosting SHALL NOT serve any static assets
directly (no `public` directory configured) so that every request continues to reach the
same Express/Next server that handles it today, with no behavior difference between the
Cloud Run URL and the Hosting-fronted URL.

#### Scenario: Hosting request reaches the same server

- **WHEN** a request arrives at the Firebase Hosting domain (`*.web.app` or
  `*.firebaseapp.com`)
- **THEN** Firebase Hosting rewrites it to the `personal-library-manager` Cloud Run service
  in `us-central1`, and the response is identical to requesting the same path directly on
  the Cloud Run URL

#### Scenario: No static bypass of the server

- **WHEN** any request path is matched by the Hosting rewrite configuration
- **THEN** no `public` directory is configured for Hosting to serve statically, so no
  request is answered by Hosting itself instead of the Cloud Run service

### Requirement: Manual Firebase Hosting setup runbook

The repository SHALL document, in `docs/deploy.md`, the one-time manual steps to activate
Firebase Hosting for the project: enabling the Hosting API, verifying (or granting) that
the Cloud Run service accepts requests from Firebase Hosting, running
`firebase deploy --only hosting`, and adding the resulting Hosting domain to Firebase
Auth's authorized domains so email-link sign-in works from it. These steps SHALL be
runbook-only (performed manually by the maintainer) and SHALL NOT be added to the GitHub
Actions deploy pipeline.

#### Scenario: A maintainer can activate Hosting from scratch

- **WHEN** a maintainer follows the Hosting section of `docs/deploy.md` after the Cloud Run
  service is already deployed
- **THEN** they enable the Hosting API, confirm Cloud Run invoker access, deploy Hosting,
  and add the new domain to Firebase Auth's authorized domains, after which the app is
  reachable and email-link sign-in works from the Hosting domain

#### Scenario: CI is unaffected

- **WHEN** a commit is pushed to `main`
- **THEN** the existing GitHub Actions pipeline builds and deploys only to Cloud Run, as
  before, with no Hosting deploy step added
