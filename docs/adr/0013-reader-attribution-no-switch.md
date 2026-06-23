# ADR-0013: Switch de lector en dispositivo compartido + atribución (refina ADR-0012)

- **Estado:** Accepted
- **Fecha:** 2026-06-22
- **Refina:** ADR-0012
- **Issues relacionados:** #11, #24, #27–#29

## Contexto

Cada lector usa **su propio teléfono por defecto**, pero **además hay un dispositivo
compartido en la repisa** (tablet/kiosko). Eso genera dos necesidades multi-lector:
**(1) cambiar el lector que opera** ese dispositivo compartido, y **(2) atribuir** una
lectura a un lector (`ReadingEvent.reader`) y filtrar el dashboard por lector. El **PIN**
se **conserva** para su función decidida (no queda dormido).

## Decisión

- **Cambio de lector = re-login completo (PIN "puro").** Para operar como otro lector,
  se **cierra sesión y se inicia sesión** (magic-link del otro). El PIN **nunca mintea
  identidad ni sesión** de otro lector — no hay multicuenta persistida en el dispositivo.
  Esto alinea con "un usuario por dispositivo" del Client SDK de Firebase.
- **PIN = re-confirmación/bloqueo del lector ACTIVO en el dispositivo compartido.** Su
  función (la decidida en ADR-0012, **conservada**): bloquear el dispositivo compartido y
  re-confirmar "soy yo" con el PIN del **lector que ya está autenticado** —
  rápido, sin esperar el correo, sin abrir la sesión a cualquiera. Verifica contra
  `reader.pinHash` (rate-limited, `/api/auth/pin/verify`); **solo re-confirma al mismo
  lector**, jamás cambia de identidad.
- **Atribución = picker sin gate.** Un `ReaderPicker` reutilizable selecciona el lector
  **atribuido** para un `ReadingEvent` y para filtrar el dashboard. **Sin PIN** (la
  atribución no es frontera de seguridad). Default = lector autenticado; se permite
  override. Lo consumen #24 (atribución) y #27–#29 (dashboard).

## Consecuencias

- **Positivas:** el PIN mantiene un uso real (bloqueo del kiosko) sin la tensión de
  "mintear identidad"; el switch entre lectores es simple y seguro (re-login); la
  atribución es fluida.
- **Negativas / trade-offs:** cambiar de lector en el dispositivo compartido cuesta un
  re-login (aceptable: es ocasional); el "bloqueo" es un lock suave del lado cliente.

## Alternativas consideradas

- **PIN mintea sesión del otro lector (switch sin re-login)** — descartado: requeriría
  multicuenta persistida y haría del PIN una credencial de identidad.
- **Eliminar el PIN (quedaba sin uso)** — descartado: se conserva para el bloqueo/
  re-confirmación del lector activo en el dispositivo compartido.
