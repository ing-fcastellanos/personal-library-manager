## Why

En #15 la subida de portada se acepta tal cual (solo se valida tipo y tamaño máx 5 MB), decisión de alcance deliberada para v1. Sin `next/image` ni ninguna otra capa de optimización en el frontend (confirmado: la app solo usa `<img>` planos en todos lados), una portada grande queda servida a resolución completa, siempre, a todo el mundo. Issue #50, diferido a propósito desde #15, nice-to-have de fin de proyecto.

## What Changes

- Nueva función compartida de normalización de imágenes (`sharp`): redimensiona a 600px de ancho máximo (manteniendo aspect ratio, **solo achica, nunca agranda**) y normaliza a **WebP siempre** (calidad 80), sin importar el formato de entrada.
- Aplicada en **los dos lugares** que escriben a `covers/` en Storage — ampliado respecto al issue original, que solo menciona la subida manual:
  1. `services/covers/service.ts` `uploadCover()` — subida manual del lector (`POST /api/books/:id/cover`, lo que pide el issue).
  2. `services/enrichment/cover.ts` `rehostCover()` — re-hosting de portadas externas durante el intake y el re-enrich (#13/#14); mismo problema, no mencionado en el issue pero con la misma causa raíz, y potencialmente peor (fuentes externas suelen servir escaneos a resolución completa).
- Un buffer no decodificable como imagen (nuevo caso posible una vez que `sharp` procesa de verdad) se mapea a `CoverValidationError` (400) en `uploadCover`, y al camino existente de "retornar `null`, el libro se persiste sin portada" en `rehostCover` (mismo tratamiento que un fallo de red hoy).
- `sharp` pasa a ser una dependencia de producción explícita (hoy solo transitiva vía Next).

**Fuera de alcance**: cambiar el límite de subida de 5 MB (ya validado, sin tocar); el frontend (sigue sirviendo `<img>` planos); reprocesar portadas ya existentes en Storage (solo aplica a subidas/rehosts nuevos desde que se mergee, no retroactivo).

## Capabilities

### New Capabilities

_(ninguna — es un detalle de implementación de dos flujos ya especificados, no una capability nueva de cara al usuario)_

### Modified Capabilities

- `catalog-edit`: el requirement "User cover upload" (#15) pasa a incluir el resize/normalización a WebP.
- `catalog-enrichment`: el requirement "Cover re-hosting in Storage" (#13) pasa a incluir el mismo resize/normalización.

## Impact

- **Nuevo**: función compartida de normalización (ubicación a decidir en design — candidato natural `services/covers/` o un módulo compartido nuevo, dado que hoy `services/covers` y `services/enrichment` no comparten código entre sí); dependencia directa `sharp` en `package.json`.
- **Modificado**: `services/covers/service.ts`, `services/enrichment/cover.ts`; sus tests (`services/covers/service.test.ts` usa hoy un fixture de imagen fake que va a dejar de ser válido con `sharp` procesando de verdad — hay que reemplazarlo por una imagen mínima real).
- **Sin cambios**: los endpoints (`POST /api/books/:id/cover`, el flujo de intake/re-enrich) mantienen su contrato externo — misma request, misma respuesta, solo cambia lo que se guarda en Storage.
