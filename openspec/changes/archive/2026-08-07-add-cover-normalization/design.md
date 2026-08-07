## Context

Dos servicios independientes escriben a `covers/` en Firebase Storage vía el Admin SDK, sin compartir código entre sí hoy: `services/covers/service.ts` (`uploadCover`, subida manual del lector, #15) y `services/enrichment/cover.ts` (`rehostCover`, portadas externas re-hosteadas durante intake/re-enrich, #13). Ambos hacen `bucket.file(path).save(buffer, ...)` con el buffer tal cual, sin procesarlo, y cada uno tiene su propia función `extensionFor(contentType)` casi idéntica.

`sharp` está disponible transitivamente (dependencia de Next para optimización de imágenes) pero no es una dependencia directa del proyecto — se usó una vez como script de build para los íconos de PWA (#41), nunca en runtime de producción.

`services/covers/service.test.ts` prueba `uploadCover` con `Buffer.from("fake-png-bytes")` — funciona hoy porque nada decodifica la imagen; deja de ser válido en cuanto `sharp` la procese de verdad.

## Goals / Non-Goals

**Goals:**
- Una sola función de normalización, compartida entre `uploadCover` y `rehostCover`, sin duplicar lógica de imagen entre los dos servicios.
- Salida siempre WebP, 600px de ancho máximo, sin agrandar imágenes ya más chicas.
- Un buffer no decodificable se maneja según la semántica de fallo que cada servicio ya tiene (400 explícito en la subida manual; degradación silenciosa en el re-hosting, que ya trata cualquier fallo de red/descarga de la misma forma).

**Non-Goals:**
- Reprocesar portadas ya existentes en Storage.
- Tocar el frontend / cómo se sirven las imágenes (`<img>` planos, sin `next/image`).
- Cambiar el límite de 5 MB de la subida manual.

## Decisions

**Ubicación: `services/covers/normalize.ts`, no un módulo nuevo compartido.**
`services/covers` ya es el nombre de dominio natural para "manejo de imágenes de portada"; `services/enrichment/cover.ts` importa desde ahí en vez de crear un tercer módulo genérico (`lib/images/` o similar) para una sola función. Se mantiene como una función pura (buffer de entrada → buffer procesado), separada de la orquestación de Storage de cada servicio — fácil de testear sin mocks de Storage.

```ts
export async function normalizeCoverImage(input: Buffer): Promise<Buffer>
// sharp(input).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
```

`withoutEnlargement: true` es la opción nativa de `sharp` para "solo achicar" — no hace falta calcular a mano si la imagen ya es más chica que el ancho objetivo.

**Salida siempre WebP → `extensionFor()` desaparece de los dos servicios.**
Como el contenido de salida es siempre `image/webp`, la extensión del path en Storage es siempre `.webp` — la función `extensionFor(contentType)` que hoy existe (casi duplicada) en ambos servicios deja de tener motivo de ser y se elimina de los dos.

**Manejo de imagen inválida: cada servicio conserva su propia semántica de fallo existente.**
`normalizeCoverImage` deja que la excepción de `sharp` (imagen no decodificable) se propague tal cual — no la atrapa ella misma. `uploadCover` la atrapa y la remapea a `CoverValidationError` (mismo tratamiento 400 que "tipo no soportado" o "imagen muy grande" hoy). `rehostCover` la atrapa dentro de su `catch` existente y devuelve `null` — mismo camino que ya usa para un fallo de red o una descarga fallida (design D6 de #13: "el libro se puede persistir sin portada re-hosteada"). No se introduce ningún manejo de error nuevo, se reutiliza el que cada uno ya tenía.

**Tests: fixture de imagen real, no bytes fake.**
`services/covers/service.test.ts` (y cualquier test de `rehostCover` que se agregue) generan una imagen mínima real con el propio `sharp` (`sharp({create:{width,height,channels,background}}).png().toBuffer()`, mismo patrón que `scripts/generate-pwa-icons.mjs` de la feature de PWA) en vez de bytes arbitrarios — necesario porque ahora se decodifica de verdad.

## Risks / Trade-offs

- **[Riesgo] `sharp` es una dependencia nativa (bindings por plataforma)** → ya se usa transitivamente sin problemas en este repo (Next la trae, y el script de íconos de PWA ya la ejecutó en este entorno); pasar a dependencia directa no cambia la superficie de compatibilidad, solo la hace explícita.
- **[Riesgo] Procesar imágenes agrega latencia a la subida/rehost** → aceptado, es trabajo síncrono de CPU sobre una imagen de a lo sumo 5 MB (límite ya validado), del orden de milisegundos con `sharp`; no se espera que sea perceptible.
- **[Trade-off] No hay reprocesamiento de portadas viejas** → señalado explícitamente como no-goal; una portada subida antes de este cambio sigue sirviéndose sin normalizar hasta que alguien la vuelva a subir o el libro se re-enriquezca.

## Migration Plan

Sin migración de datos ni cambio de esquema. Aditivo: el contrato externo de ambos endpoints/flujos no cambia (misma request, misma respuesta), solo lo que efectivamente se guarda en Storage a partir del deploy.

## Open Questions

Ninguna — decisiones confirmadas en explore.
