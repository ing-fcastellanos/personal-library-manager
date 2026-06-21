# ADR-0003: Next.js servido por un servidor Express custom

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #1

## Contexto

Se quiere una única aplicación que sirva la web (SSR) y también actúe como API,
con una sola unidad desplegable en Cloud Run (ADR-0001), en TypeScript.

## Decisión

Usar **Next.js 15/16 (App Router)** renderizado por un **servidor Express custom**
en TypeScript. Express monta el handler de Next para SSR y expone `/api/*` para la
API de la aplicación. Todo se empaqueta en un contenedor único.

## Consecuencias

- **Positivas:** un solo proceso/imagen para web + API; control fino de middleware
  (auth de sesión, rate-limiting) en Express; despliegue simple en Cloud Run.
- **Negativas / trade-offs:** servidor custom de Next implica mantener la
  integración a través de upgrades de Next; se pierden algunas optimizaciones del
  runtime gestionado (p. ej. en plataformas serverless específicas).
- **Seguimiento:** revisar compatibilidad del custom server en cada major de Next.

## Alternativas consideradas

- **Next standalone sin Express** + rutas API de Next — más simple, pero menos
  control sobre middleware de servidor y sesión; se prefirió Express por el
  requisito explícito.
- **Backend separado (API) + frontend Next** — dos despliegues; mayor complejidad
  para un proyecto doméstico; descartado.
