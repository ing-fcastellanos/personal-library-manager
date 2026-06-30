# syntax=docker/dockerfile:1

# Multi-stage build for the Next.js + custom Express server (ADR-0001/0003).
# The app runs as a single process via `node dist/server/index.js` (NOT `next start`),
# so we ship Next's build output (.next), the compiled server (dist/), and production
# node_modules. Next's `output: 'standalone'` is intentionally not used — it traces
# Next's own server entry, not our custom Express one.

# ── deps: full install (incl. devDeps) for building ───────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: skip lifecycle hooks (e.g. husky `prepare`) — not needed in CI/image.
RUN npm ci --ignore-scripts

# ── build: next build + compile the Express server ────────────────────────────
FROM node:22-slim AS build
WORKDIR /app
# Public Firebase web config is PUBLIC and inlined into the client bundle at
# `next build` time, so it must be present here as build args (not runtime env).
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runtime: production deps + build outputs only ─────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080
# Production-only dependencies (no devDeps).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
# Build artifacts: Next output, the compiled server tree, static assets, config.
COPY --from=build /app/.next ./.next
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
# Run as the unprivileged user that the base image already provides.
USER node
EXPOSE 8080
# Cloud Run injects PORT; the server reads it (defaults to 8080 here).
CMD ["node", "dist/server/index.js"]
