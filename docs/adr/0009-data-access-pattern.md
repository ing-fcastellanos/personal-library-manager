# ADR-0009: Patrón de acceso a datos — server-mediated por defecto, cliente directo en casos selectos

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #2, #3, #12, #27, #28, #29

## Contexto

Con Firestore (ADR-0002) y un servidor Express que es la API (ADR-0003), hay que
decidir **cómo accede el cliente a los datos**: todo a través de Express con el
**Firebase Admin SDK** (que ignora las security rules), o **directo desde el
navegador** con el Client SDK gobernado por security rules. La elección define qué
hacen las rules, si hay real-time, y cuánta API se escribe.

## Decisión

**Server-mediated (A) como patrón por defecto:** las lecturas y escrituras del
catálogo y del log de lectura pasan por endpoints `/api/*` de Express, que usan el
Admin SDK y centralizan validación (zod) y lógica de dominio (ADR-0007).

**Cliente directo (B) como excepción acotada, solo donde aporta valor claro:**

1. **Subida de fotos a Storage** (#3): el navegador sube imágenes **directo a
   Firebase Storage** (gobernado por Storage rules), para no pasar imágenes pesadas
   por Express. El servidor recibe la referencia/URL ya subida.
2. **Dashboard en tiempo real** (#27–#29): listeners de **solo lectura** del Client
   SDK sobre las colecciones del dashboard, gobernados por Firestore rules.

**Security rules base:** postura **deny-by-default**. Se abren reglas mínimas y
explícitas solo para los dos casos B (Storage: el lector autenticado escribe en su
ruta acotada; Firestore: lectura para lector autenticado en colecciones del
dashboard). Todo lo demás permanece cerrado porque lo realiza el Admin SDK.

## Consecuencias

- **Positivas:** una sola superficie de seguridad y validación (Express) para el
  grueso; menos complejidad en las rules; portabilidad de datos; y aún así
  real-time y subidas eficientes donde importa.
- **Negativas / trade-offs:** dos modelos de acceso coexisten (hay que tener claro
  qué va por cada uno); las rules de los casos B deben mantenerse alineadas con la
  identidad de lector (ADR-0006).
- **Seguimiento:** si el boilerplate de API creciera demasiado, reconsiderar ampliar
  el alcance de B; revisar las rules al construir #3 y #27.

## Alternativas consideradas

- **Todo server-mediated (A puro)** — más simple en seguridad, pero subir fotos por
  Express es costoso y el dashboard pierde real-time; descartado por esos dos casos.
- **Todo cliente directo (B puro)** — menos API, pero convierte las security rules en
  un segundo backend a mantener y duplica validación; descartado.
