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

- Node.js `>= 20.19.0`
- npm

## Getting started

```bash
npm install
cp .env.example .env        # optional; PORT defaults to 3000
npm run dev                 # http://localhost:3000
```

Verify the API is up:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

## Scripts

| Script             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Run Express + Next in development (hot reload)     |
| `npm run build`    | Build the Next app and compile the Express server  |
| `npm start`        | Run the compiled server in production mode         |
| `npm run typecheck`| Type-check the project with no emit                |

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

## Spec-driven development

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec). Propose a
change with `/opsx:propose "<idea>"`, implement with `/opsx:apply`, and archive
with `/opsx:archive`. Change artifacts live under `openspec/changes/`.

## Roadmap

Work is tracked as GitHub issues grouped into 9 milestones (M0–M8): foundations,
auth & readers, catalog/CRUD, AI book ingestion, reading log, dashboard, QR
codes, export/Goodreads, and extras.
