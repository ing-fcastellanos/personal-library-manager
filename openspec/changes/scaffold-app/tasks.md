## 1. Project initialization

- [ ] 1.1 Create `package.json` with scripts `dev`, `build`, `start`, `typecheck` and dependencies (next, react, react-dom, express, dotenv) + dev deps (typescript, tsx, @types/node, @types/express, @types/react, @types/react-dom)
- [ ] 1.2 Add `tsconfig.json` (strict, `@/*` path alias) and `next.config.mjs`
- [ ] 1.3 Add `.env.example` (documents `PORT`) and `.gitignore` (node_modules, .next, dist, .env*)

## 2. Next.js app (web layer)

- [ ] 2.1 Create App Router root: `app/layout.tsx` and `app/page.tsx` (placeholder landing page)
- [ ] 2.2 Add base global styles

## 3. Express server (API + Next integration)

- [ ] 3.1 Create `server/next.ts` that wraps the Next app and exposes its request handler
- [ ] 3.2 Create `server/routes/health.ts` with `GET /api/health` → `200 { status: "ok" }`
- [ ] 3.3 Create `server/index.ts`: Express app that mounts `/api/*` routers, forwards all other routes to the Next handler, reads `PORT` (default 3000), and listens
- [ ] 3.4 Add `lib/`, `components/`, `services/` directories with index placeholders so the structure exists

## 4. Verification & docs

- [ ] 4.1 `npm run typecheck` passes with no errors
- [ ] 4.2 `npm run dev` serves the placeholder page and `GET /api/health` returns 200
- [ ] 4.3 `npm run build && npm start` runs in production mode and serves both web and `/api/health`
- [ ] 4.4 Write `README.md` with local run instructions and the folder-structure overview
