## Context

`services/ai/gemini.ts` pinneaba el modelo de visión de Gemini a un nombre fechado: `process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash"`. Google retira modelos con el tiempo; cuando eso pasa, el default hardcodeado queda apuntando a un modelo que ya no existe, y `identifyBooksFromImage`/`identifyBookFromImage` fallan con `404 NOT_FOUND` hasta que alguien note el error en los logs y actualice el string a mano.

Esto se descubrió en vivo: `POST /api/ai/identify-shelf` devolvía `500` en todos los intentos durante la QA del #62. El log mostró el motivo real — Gemini rechazando `gemini-2.0-flash` como ya no disponible.

## Goals / Non-Goals

**Goals:**
- Que `identify-shelf`/`identify` vuelvan a funcionar con Gemini como motor de fallback.
- Elegir un default que no vuelva a quedar obsoleto de la misma forma la próxima vez que Google retire una versión.

**Non-Goals:**
- Arreglar OpenAI (el motor default) — su falla actual es de crédito de cuenta, confirmado por el usuario, no de código.
- Agregar logging del error real de OpenAI en el fallback silencioso de `runWithFallback` (`services/ai/service.ts`) — gap de observabilidad real, detectado al investigar este bug, pero es un cambio aparte (afecta el comportamiento de logging del servicio completo, no solo a Gemini).

## Decisions

**`gemini-flash-latest` (alias rotativo) en vez de otro nombre fechado.**
El primer intento fue actualizar al reemplazo que el propio mensaje de error de Google sugería, `gemini-2.5-flash` — con la misma key, esa llamada TAMBIÉN falló: `"model models/gemini-2.5-flash is no longer available to new users... NOT_FOUND"`. Esto reveló que mi conocimiento del catálogo de modelos de Gemini estaba desactualizado (el endpoint real de list-models de la API devolvió modelos hasta `gemini-3.6-flash`, generaciones enteras que no conocía) — así que en vez de adivinar otro nombre fechado de memoria y arriesgarme a repetir el mismo ciclo de fallo, consulté `GET https://generativelanguage.googleapis.com/v1beta/models?key=<key>` directo con la API key real del proyecto para ver qué modelos están genuinamente disponibles para ESTA key, y confirmé con una llamada real de prueba (`generateContent`) que `gemini-flash-latest` responde antes de adoptarlo.

`gemini-flash-latest` es el alias que Google mismo mantiene apuntando al modelo flash vigente — no una versión fechada. Esto resuelve la causa raíz (nombres fechados quedan obsoletos con el tiempo), no solo el síntoma puntual de hoy.

**Alcance mínimo: una constante, no una re-arquitectura.**
Se consideró agregar un mecanismo de descubrimiento de modelo en runtime (consultar list-models al arrancar, o cachear el mejor disponible) — se descarta por desproporcionado para el problema real: `GEMINI_VISION_MODEL` ya existe como override por variable de entorno para exactamente este caso (fijar un modelo específico sin tocar código), y el alias rotativo como default ya cubre el caso común sin necesitar lógica nueva.

## Risks / Trade-offs

- **[Riesgo] Un alias "latest" puede cambiar de comportamiento sin aviso** (Google actualiza a qué modelo apunta) → aceptado: el trade-off es exactamente el inverso del problema que causó este bug (un nombre fijo que deja de existir) — y `GEMINI_VISION_MODEL` sigue disponible para pinnear un modelo específico si alguna vez hace falta reproducibilidad exacta.
- **[Riesgo] OpenAI sigue sin funcionar hoy** (crédito de cuenta agotado) → señalado explícitamente como no-goal; el fallback a Gemini ahora sí funciona, así que el sistema tiene al menos un motor operativo.

## Migration Plan

Sin migración de datos. Cambio de una constante, ya desplegado localmente y verificado en vivo contra los emuladores con las 3 fotos reales del #62 (los 3 `POST /api/ai/identify-shelf` devolvieron `200`).

## Open Questions

Ninguna.
