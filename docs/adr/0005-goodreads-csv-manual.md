# ADR-0005: Integración con Goodreads vía export CSV + link manual

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #34, #8

## Contexto

Se desea publicar lecturas/reseñas en Goodreads, por lector. Sin embargo,
**Goodreads dejó de emitir API keys nuevas en diciembre de 2020** y su API pública
de escritura está, en la práctica, descontinuada. No existe un método soportado y
estable para publicar automáticamente.

## Decisión

La app es la **fuente de verdad** del log de lectura (rating + reseña). La
integración con Goodreads se hace por:

1. **Export CSV** compatible con el import de Goodreads/StoryGraph (filtrable por lector).
2. **Link directo** a la página del libro en Goodreads (por ISBN/título), usando la
   URL de Goodreads del **lector activo**, para publicar manualmente.

La automatización de navegador queda **descartada** por fragilidad, riesgo de ToS y
manejo de credenciales de terceros.

## Consecuencias

- **Positivas:** sin dependencia de una API muerta; datos siempre exportables; cada
  lector publica en su cuenta correcta; bajo riesgo.
- **Negativas / trade-offs:** la publicación no es 100% automática (requiere paso
  manual del lector).
- **Seguimiento:** reevaluar si Goodreads/StoryGraph publican una API de escritura;
  entonces se crearía un ADR que supersede a este.

## Alternativas consideradas

- **API oficial de Goodreads** — no disponible para nuevas integraciones; descartada.
- **Automatización de navegador (Playwright)** — frágil, contra ToS, credenciales
  sensibles; descartada.
- **StoryGraph** — tampoco ofrece API de escritura pública; mismo problema.
