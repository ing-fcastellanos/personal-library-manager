# ADR-0004: Abstracción multi-motor de IA (OpenAI default + fallback Gemini)

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #19, #20, #21, #23

## Contexto

La identificación de libros por imagen (lomos/portadas) y otras tareas usan visión
e IA. Se dispone de una API key de **OpenAI**, pero se quiere poder cambiar de
motor desde la app y no quedar atado a un proveedor. Las llamadas de visión tienen
costo, por lo que conviene tener una opción gratuita de respaldo.

## Decisión

Definir una interfaz `AIProvider` (visión + texto) con implementaciones
intercambiables. **OpenAI es el motor por defecto**; **Gemini es el secundario con
fallback automático**: si el primario falla (error/timeout), la operación se
reintenta con el secundario y se registra cuál respondió. El motor por defecto y
las API keys se configuran desde la app (Settings), con keys en Secret Manager.

## Consecuencias

- **Positivas:** sin lock-in; resiliencia ante fallos/cuotas; opción de respaldo
  con capa gratuita (Gemini); salida normalizada a un esquema común con score de
  confianza.
- **Negativas / trade-offs:** mantener prompts y parsers por proveedor; diferencias
  de calidad/formato entre motores; costo de OpenAI en uso intensivo de visión.
- **Seguimiento:** medir precisión y costo por proveedor; permitir elegir motor por
  tipo de tarea si fuese necesario.

## Alternativas consideradas

- **Un solo proveedor (OpenAI)** — más simple, pero con lock-in y sin respaldo;
  descartado.
- **Solo Gemini (gratis)** — alineado con Google, pero se prefirió OpenAI por la key
  existente y la calidad; queda como fallback.
