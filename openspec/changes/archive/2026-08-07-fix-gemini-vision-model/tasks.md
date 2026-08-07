## 1. Fix

- [x] 1.1 `services/ai/gemini.ts`: default de `MODEL` de `"gemini-2.0-flash"` a `"gemini-flash-latest"`.
- [x] 1.2 Confirmado vía `GET https://generativelanguage.googleapis.com/v1beta/models?key=<key>` (la API key real del proyecto) que `gemini-flash-latest` figura entre los modelos disponibles, y con una llamada de prueba real (`generateContent`) que responde correctamente.

## 2. Verificación

- [x] 2.1 `npm run typecheck` limpio.
- [x] 2.2 Verificación live real contra los emuladores + sesión autenticada: las 3 fotos reales de estante del #62 subidas vía "Agregar → Por estante" — las 3 devolvieron `200` en `POST /api/ai/identify-shelf` (antes `500` con `gemini-2.0-flash`), con resultados de identificación coherentes (evaluados en detalle aparte, para el propio #62).
