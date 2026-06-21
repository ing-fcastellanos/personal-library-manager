# Architecture Decision Records (ADR)

Este directorio contiene los **Architecture Decision Records** del proyecto
*Personal Library Manager*: registros cortos e inmutables que documentan
decisiones de arquitectura importantes, su contexto y sus consecuencias.

## ¿Por qué ADRs?

- Dejan trazabilidad del **porqué** de cada decisión (no solo el qué).
- Evitan re-litigar decisiones ya tomadas.
- Sirven de contexto para nuevas personas (o agentes) que entran al proyecto.

## Proceso

1. Copiar [`template.md`](./template.md) a `NNNN-titulo-corto.md` (numeración incremental).
2. Estado inicial `Proposed`; pasa a `Accepted` cuando se decide.
3. Una decisión **no se edita** una vez aceptada: si cambia, se crea un ADR nuevo
   que la **supersede** y se actualiza el estado del anterior a `Superseded by ADR-XXXX`.
4. Referenciar el/los issue(s) de GitHub relacionados.

## Índice

| ADR | Título | Estado |
|-----|--------|--------|
| [0001](./0001-hosting-cloud-run.md) | Hosting en Google Cloud Run | Accepted |
| [0002](./0002-database-firestore.md) | Firestore como base de datos principal | Accepted |
| [0003](./0003-app-framework-next-express.md) | Next.js servido por servidor Express custom | Accepted |
| [0004](./0004-ai-provider-abstraction.md) | Abstracción multi-motor de IA (OpenAI default + fallback Gemini) | Accepted |
| [0005](./0005-goodreads-csv-manual.md) | Integración con Goodreads vía export CSV + link manual | Accepted |
| [0006](./0006-auth-qr-reader-identity.md) | Modelo de autenticación: QR deep-link + identidad de lector | Accepted |
| [0007](./0007-domain-model-book-copy-readingevent.md) | Modelo de dominio: Book / Copy / ReadingEvent | Accepted |
| [0008](./0008-metadata-enrichment-sources.md) | Enriquecimiento de metadata: Google Books + Open Library | Accepted |
| [0009](./0009-data-access-pattern.md) | Patrón de acceso a datos: server-mediated + cliente directo selecto | Accepted |
| [0010](./0010-ui-stack-claude-design-handoff.md) | Stack de UI (Tailwind + shadcn/ui) y pipeline de handoff con Claude Design | Accepted |
