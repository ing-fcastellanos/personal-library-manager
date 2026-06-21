# ADR-0007: Modelo de dominio — Book / Copy / ReadingEvent

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #5, #12

## Contexto

Hay **2 lectores** que pueden leer el mismo libro, incluso varias veces, y la
biblioteca puede tener **más de un ejemplar** de una misma obra. Un modelo plano
"un documento = un libro" no representa bien estos casos ni las estadísticas por
lector.

## Decisión

Separar el dominio en tres entidades principales (más `Reader` y `Shelf`):

- **Book/Edition** — la obra/edición canónica (ISBN, título, autores, editorial,
  año, categorías, portada). Metadata enriquecida desde fuentes externas (ADR-0008).
- **Copy** — el **ejemplar físico** que se posee (estante/ubicación, estado, notas,
  fecha de alta). N copies → 1 book.
- **ReadingEvent** — un **evento de lectura** (reader, book/copy, fechas, rating,
  reseña). N events → 1 reader y 1 book.

## Consecuencias

- **Positivas:** soporta múltiples lecturas y múltiples lectores; duplicados vs.
  segundo ejemplar bien diferenciados; estadísticas por lector y por libro limpias;
  base para préstamos, series y dashboard.
- **Negativas / trade-offs:** más entidades y joins lógicos en Firestore (referencias
  y denormalización selectiva); índices a diseñar.
- **Seguimiento:** validar índices compuestos contra las consultas del dashboard (M5).

## Alternativas consideradas

- **Documento único por libro** con campos de lectura embebidos — simple, pero no
  modela 2 lectores ni relecturas ni múltiples ejemplares; descartado.
