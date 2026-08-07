## Why

Bug encontrado en vivo durante la QA del issue #62 (calibración de `TITLE_AGREEMENT_MIN` con fotos reales de estante) — no es parte del alcance de #62 en sí, pero bloqueaba por completo poder hacer esa QA. `POST /api/ai/identify-shelf` devolvía `500` en todos los intentos: Gemini (el motor de fallback) fallaba con `"model models/gemini-2.0-flash is no longer available... NOT_FOUND"` — Google descontinuó ese modelo, y el default hardcodeado en el código nunca se actualizó.

## What Changes

- `services/ai/gemini.ts`: el default de `MODEL` pasa de `"gemini-2.0-flash"` (descontinuado) a `"gemini-flash-latest"` — el alias rotativo que mantiene Google apuntando siempre al modelo flash vigente, elegido específicamente para no repetir este bug la próxima vez que Google retire una versión fechada (ver design.md para por qué no se pinneó otro nombre fechado).
- **Ya aplicado y verificado en vivo**: esta change formaliza un fix que ya se implementó y probó contra las 3 fotos reales del #62 (los 3 devolvieron `200` con resultados coherentes) — no quedan tareas de implementación pendientes.

**Fuera de alcance**: OpenAI (el motor default) también falla en cada intento hoy, pero por un problema de crédito de cuenta confirmado por el usuario — no es un bug de código, no se toca acá. Tampoco se agrega logging del error real de OpenAI en el fallback silencioso (`services/ai/service.ts` `runWithFallback` solo relanza el error del último motor intentado, así que el de OpenAI queda perdido) — gap de observabilidad real, detectado al investigar, pero fuera del alcance puntual de este fix.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `ai-provider`: agrega el requirement "Gemini model selection avoids retired snapshots" — no fija un nombre de modelo concreto en la spec (sigue siendo un detalle de implementación), pero sí documenta que el default debe ser un alias vigente en vez de una foto fechada, para prevenir esta misma clase de regresión a futuro.

## Impact

- **Modificado**: `services/ai/gemini.ts` (una constante).
- **Sin cambios**: `services/ai/openai.ts`, la interfaz `AIProvider`, cualquier endpoint o contrato externo.
