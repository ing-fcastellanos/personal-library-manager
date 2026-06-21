# ADR-0002: Firestore como base de datos principal

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #2, #5, #12

## Contexto

Se necesita persistir biblioteca, lectores, ejemplares y eventos de lectura, con
preferencia explícita por una base **NoSQL** dentro del ecosistema Google y sin
costo adicional para un uso doméstico (2 lectores).

## Decisión

Usar **Cloud Firestore** como almacén principal. Acceso server-side mediante
**Firebase Admin SDK** desde Express; reglas de seguridad para cualquier acceso
desde cliente. Las colecciones y relaciones se definen en el ADR-0007 y el doc de
modelo de datos (#5).

## Consecuencias

- **Positivas:** capa gratuita suficiente; integración nativa con Auth/Storage;
  escalado y operación gestionados; tipos compartidos en TS.
- **Negativas / trade-offs:** modelado NoSQL exige denormalización y diseño de
  índices compuestos; agregaciones para el dashboard requieren contadores o
  consultas cuidadas; búsquedas full-text limitadas (se resuelven con filtros/índices
  o un índice externo si hiciera falta).
- **Seguimiento:** vigilar lecturas/escrituras del dashboard para no exceder cuotas.

## Alternativas consideradas

- **PostgreSQL gestionado (Cloud SQL)** — relacional y potente, pero con costo y
  fuera del requisito NoSQL; descartado.
- **Supabase / otros** — fuera del ecosistema Google preferido; descartado.
