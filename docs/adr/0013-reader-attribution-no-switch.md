# ADR-0013: Sin cambio de lector — atribución por picker (supersede en parte a ADR-0012)

- **Estado:** Accepted
- **Fecha:** 2026-06-22
- **Responsable(s):** ing-fcastellanos
- **Supersede (en parte):** ADR-0012 (los aspectos de "cambio de lector" y el rol del PIN)
- **Issues relacionados:** #11, #24, #27–#29

## Contexto

Al llegar a #11 (selector de lector) se aclaró el modelo de uso real: **cada lector
usa su propio teléfono**, no se mantienen multicuentas en un dispositivo, y cambiar de
lector = **logout + login completo**. Por lo tanto **no existe un "cambio de lector"
dentro de la app**. El lector que **opera** la app es siempre el de la sesión
autenticada (un dispositivo por lector, ADR-0011/0012).

La única necesidad multi-lector que queda es la **atribución**: qué lector **leyó** un
libro (`ReadingEvent.reader`) y ver el dashboard **por lector**. Eso no es una frontera
de seguridad en una casa de 2 personas — es un *picker*.

## Decisión

- **No hay cambio de lector en la app.** Cambiar el lector que opera = cerrar sesión e
  iniciar sesión (magic-link). El lector autenticado **es** el lector de la sesión.
- **Picker de atribución reutilizable.** Un componente selecciona el lector
  **atribuido** (para un `ReadingEvent` y para filtrar el dashboard). **Sin PIN** —
  la atribución no es una frontera de seguridad. El **default** es el lector
  autenticado; el picker permite override (p. ej. registrar un libro que leyó el otro).
- **El PIN queda dormido.** El backend de PIN (set/verify, #7) y la UI de set-PIN (#9)
  pierden su único caso de uso (gateaban el switch en ADR-0012). Quedan **sin uso**;
  **pueden eliminarse** en una limpieza futura. Esto **supersede** las partes de
  "PIN solo al cambiar de lector" y "flujo de cambio de lector (#11)" de ADR-0012.

## Consecuencias

- **Positivas:** se disuelve la tensión "¿el PIN mintea identidad?"; modelo más simple;
  atribución clara y sin fricción.
- **Negativas / trade-offs:** queda **código muerto** del PIN hasta que se elimine; si en
  el futuro aparece un dispositivo compartido, habrá que reintroducir un mecanismo de
  switch (nuevo ADR).
- **Seguimiento:** decidir si se elimina ya el PIN o se deja dormido; el picker lo
  consumen #24 (atribución de lectura) y M5 (#27–#29, dashboard por lector).

## Alternativas consideradas

- **Switch con PIN (B1: PIN mintea sesión / B2: PIN puro + re-login)** — descartado:
  cada quien usa su teléfono y cambiar es re-login completo.
- **Mantener el PIN "por las dudas"** — se documenta como dormido; no se le inventa un
  uso para no agregar fricción ni complejidad.
