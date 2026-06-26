# Personal Library Manager

AI-assisted system to manage a personal home library: catalog books (manually,
by ISBN/barcode, or by AI photo analysis of shelves), track readers and reading
events, view a dashboard with stats, and print QR codes for quick actions.

> Status: **early scaffolding** (issue #1). See the [roadmap](#roadmap) below.

## Tech stack

- **Next.js 15/16** (App Router) for the web UI, rendered by a
- **custom Express server** (TypeScript) that also serves the `/api/*` surface,
- packaged as a single container for **Google Cloud Run**,
- with **Firestore** as the datastore (coming in #2).

Architecture decisions are recorded in [`docs/adr/`](./docs/adr/).

## Requirements

- Node.js `>= 22.12.0` (see `.nvmrc`)
- npm

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the NEXT_PUBLIC_FIREBASE_* values

# Terminal 1 — local Firebase (Firestore, Auth, Storage) emulators
npm run emulators

# Terminal 2 — the app (connects to the emulators in dev)
npm run dev                  # http://localhost:3000
```

Verify the API and Firestore connectivity:

```bash
curl http://localhost:3000/api/health        # {"status":"ok"}      (liveness)
curl http://localhost:3000/api/health/ready   # {"status":"ready"}   (Firestore reachable)
```

### Firebase & local emulators

Local development uses the **Firebase Emulator Suite** — no cloud project or
credentials are needed to run and test. The emulators read `firebase.json` and
the rules under `firebase/` (`firestore.rules`, `storage.rules`); the SDKs connect to them when the
`*_EMULATOR_HOST` / `NEXT_PUBLIC_FIREBASE_USE_EMULATOR` variables are set (see
`.env.example`). Requires a Java runtime (JRE 11+).

Access patterns follow [ADR-0009](./docs/adr/0009-data-access-pattern.md):
server-mediated by default (Express + Admin SDK), with direct client access only
for Storage uploads and read-only dashboard listeners. Security rules are
**deny-by-default**.

#### One-time project provisioning (owner)

Done once in the [Firebase Console](https://console.firebase.google.com/) for the
real/cloud environment (not needed for emulator-only development):

1. Create the Firebase project (this repo uses `personal-library-manager-frank`).
2. Enable **Firestore**, **Authentication** and **Storage**.
3. Register a **Web app** and copy its config into `.env.local`
   (`NEXT_PUBLIC_FIREBASE_*`). These are public identifiers, not secrets.
4. In production (Cloud Run), the Admin SDK uses Application Default Credentials
   from the service account — no key file (see [ADR-0001](./docs/adr/0001-hosting-cloud-run.md)).

#### Seed the readers

With the emulators running (or pointed at the real project via env), create the
two household readers — idempotent, safe to re-run:

```bash
npm run seed:readers
```

Then rename them and add each reader's Goodreads URL from **Settings → Lectores**
(`/ajustes`).

## Scripts

| Script                 | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Run Express + Next in development (hot reload)        |
| `npm run build`        | Build the Next app and compile the Express server     |
| `npm start`            | Run the compiled server in production mode            |
| `npm run typecheck`    | Type-check the project with no emit                   |
| `npm run emulators`    | Start the Firebase emulators (Firestore/Auth/Storage) |
| `npm run seed:readers` | Seed the two household readers (idempotent)           |

## Project structure

```
app/         Next.js App Router (web layer / pages)
server/      Express server: entry, routes (/api/*), Next integration
lib/         Shared utilities and types
components/  Reusable UI components
services/    Domain/service layer (metadata, AI, etc.)
docs/adr/    Architecture Decision Records
openspec/    Spec-driven change proposals (OpenSpec)
```

## UI / design system

The UI uses **Tailwind CSS + shadcn/ui** with design tokens defined as CSS
variables in `app/globals.css` (the single source of truth), light/dark theming,
and a responsive app shell (sidebar on desktop, bottom-nav on mobile). See
[ADR-0010](./docs/adr/0010-ui-stack-claude-design-handoff.md). Primitives live in
`components/ui/`; the living reference is the **style guide** at `/style-guide`.

## Spec-driven development

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec). Propose a
change with `/opsx:propose "<idea>"`, implement with `/opsx:apply`, and archive
with `/opsx:archive`. Change artifacts live under `openspec/changes/`.

## Roadmap

Work is tracked as GitHub issues grouped into 9 milestones (M0–M8): foundations,
auth & readers, catalog/CRUD, AI book ingestion, reading log, dashboard, QR
codes, export/Goodreads, and extras.
