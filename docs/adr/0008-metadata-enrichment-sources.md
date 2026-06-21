# ADR-0008: Enriquecimiento de metadata — Google Books + Open Library

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #13, #20, #21, #23

## Contexto

El alta de libros (manual, por IA o por escaneo de ISBN) necesita metadata canónica
y fiable: título, autores, editorial, año, categorías, ISBN y portada. La IA de
visión es buena para **proponer un candidato** (qué libro es), pero no debe
**inventar** estos campos estructurados.

## Decisión

Usar fuentes **gratuitas** para enriquecer: **Google Books API** (principal) y
**Open Library** (complemento/fallback). El flujo es: candidato (ISBN, o título/autor
de IA/usuario) → consulta a las fuentes → normalización a `Book/Edition` (ADR-0007) →
confirmación → almacenar portada en Firebase Storage. La IA solo aporta el candidato
y el score de confianza.

## Consecuencias

- **Positivas:** datos consistentes y sin costo; reduce alucinaciones de la IA;
  portadas y categorías estandarizadas; cacheo para minimizar llamadas.
- **Negativas / trade-offs:** cobertura variable (ediciones locales o raras pueden
  faltar); necesidad de merge/priorización entre fuentes; límites de rate de las APIs.
- **Seguimiento:** medir tasa de "no encontrado"; considerar fuentes adicionales si
  la cobertura es baja para el catálogo real.

## Alternativas consideradas

- **Solo la IA** para todos los campos — riesgo de datos inventados; descartado.
- **APIs de pago / ISBNdb** — mejor cobertura pero con costo; descartado por el
  requisito de costo cero (reconsiderable si la cobertura gratuita no alcanza).
