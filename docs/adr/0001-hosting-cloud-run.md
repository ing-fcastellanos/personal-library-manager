# ADR-0001: Hosting en Google Cloud Run

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #3

## Contexto

La app es un servidor **Express + Next.js (SSR)** que también expone la API.
Requisitos: infraestructura de Google preferida, costo cercano a cero, y soporte
para un servidor Node de larga duración (no solo estáticos). Firebase Hosting
por sí solo sirve estáticos y no corre el servidor SSR; las Cloud Functions ya
requieren plan Blaze y no encajan tan bien con un servidor Express completo.

## Decisión

Desplegar la app contenedorizada en **Google Cloud Run**. El mismo contenedor
corre Express (que renderiza Next y monta `/api/*`). El deploy se automatiza con
GitHub Actions (build → Artifact Registry → Cloud Run) usando **Workload Identity
Federation** (sin claves JSON en el repo) y **Secret Manager** para credenciales.

## Consecuencias

- **Positivas:** corre el servidor Express tal cual; capa gratuita generosa;
  escala a cero; infra Google alineada con Firestore/Firebase; deploy reproducible.
- **Negativas / trade-offs:** requiere cuenta de facturación activa (aunque dentro
  de capa gratuita); cold starts posibles con escala a cero.
- **Seguimiento:** monitorear consumo para mantenerse en capa gratuita; ajustar
  min instances si los cold starts molestan.

## Alternativas consideradas

- **Firebase Hosting (solo)** — no corre el servidor SSR/Express; descartado.
- **Cloud Functions / Firebase Functions** — requieren Blaze y encajan peor con un
  servidor Express monolítico; descartado.
- **Vercel** — excelente para Next, gratis, pero no es infra Google; descartado por
  preferencia de stack.
