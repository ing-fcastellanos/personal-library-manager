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

## Actualización (2026-08-08): Firebase Hosting como proxy delante de Cloud Run

La opción descartada arriba era **Firebase Hosting solo** (sin backend), que en efecto no
puede correr el servidor Express/Next. Distinto es usar Firebase Hosting como **proxy**
delante del servicio de Cloud Run existente (`hosting.rewrites[].run`): Cloud Run sigue
corriendo el mismo contenedor Express/Next sin cambios; Hosting solo agrega un front door
gestionado (CDN global gratis, SSL administrado, dominio `*.web.app`) que reenvía el 100%
del tráfico al mismo servicio. Esta variante no estaba contemplada en la decisión original
y es compatible con ella — se adopta (`add-firebase-hosting-proxy`) sin reabrir la decisión
de hosting del servidor en sí.
