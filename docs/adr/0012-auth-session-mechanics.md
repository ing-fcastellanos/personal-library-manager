# ADR-0012: Mecánicas de auth y sesión (refina ADR-0011)

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Refina:** ADR-0011
- **Issues relacionados:** #7 (y #9, #10, #11 que lo consumen)

## Contexto

ADR-0011 fijó el modelo (lector = usuario Firebase vía magic-link, PIN de
desbloqueo, sesión server-authoritative). Al implementar #8 quedó claro que faltaban
mecánicas concretas para que el login pueda **mapear un usuario a un lector**, para
qué significa "recordado por dispositivo", y **cuándo** se pide el PIN. Este ADR las
fija (refina, no reemplaza, ADR-0011).

## Decisión

- **Email único + membresía cerrada.** Cada `Reader` tiene un **`email` único**. El
  magic-link se manda a ese email; en el **primer login** se hace match del email
  verificado del token → lector → `assignUid()`. Un email que **no** corresponde a
  ningún lector es **rechazado** (no se crea sesión): solo los lectores
  pre-registrados pueden entrar.
- **"Recordado" = refresh token del Client SDK.** La enrolación duradera la da el
  **login persistido del Firebase Client SDK** (refresh token). El **session cookie**
  (≤14 días) es una proyección server-side que se **re-emite en silencio** desde un ID
  token fresco. El magic-link solo se necesita en un **dispositivo nuevo** o tras
  logout. Se asume **un dispositivo por lector**; cambiar de lector en un dispositivo
  compartido es re-login.
- **PIN solo al cambiar de lector.** Las **escrituras requieren solo una sesión
  válida** (no PIN). El **PIN** se exige **únicamente al cambiar el lector activo** en
  un dispositivo. Se guarda **hasheado** (scrypt) en `reader.pinHash`; su verificación
  está **rate-limited** (lockout tras N intentos) y **nunca mintea identidad** (no es
  credencial Firebase). La política de "cuándo pedirlo" la aplica el flujo de cambio
  de lector (#11); #7 provee set/verify y el almacenamiento.
- **CSRF en el intercambio.** El endpoint que cambia el ID token por el session cookie
  usa protección CSRF (double-submit token).
- **Custom claim opcional.** Al linkear, se puede setear un custom claim `readerId` en
  el usuario Firebase, útil para las security rules de los casos de cliente directo
  (ADR-0009) a futuro.

## Consecuencias

- **Positivas:** login auto-mapea al lector correcto; superficie cerrada (solo 2
  emails); fricción mínima (PIN raro, solo en cambio de lector); "recordado" real sin
  exponer credenciales; atribución fuerte mantenida.
- **Negativas / trade-offs:** el owner debe cargar el email de cada lector (en
  `/ajustes`); requiere un email por lector; el cambio de lector en dispositivo
  compartido es re-login; el rate-limit del PIN necesita un store (in-memory por
  instancia o Firestore).
- **Seguimiento:** decidir el store del rate-limit; revisar expiración/refresh del
  cookie en uso; el flujo de cambio de lector y la UI llegan en #9/#11.

## Alternativas consideradas

- **PIN en cada escritura** — más seguro pero molesto para cargar varios libros
  seguidos; descartado a favor de "solo al cambiar de lector".
- **Sin email, "reclamar lector" al primer login** — evita cargar emails pero permite
  que cualquier usuario reclame un lector; descartado por membresía cerrada.
- **Multi-usuario en un dispositivo** — el Client SDK persiste un usuario por
  dispositivo; soportarlo agrega complejidad innecesaria para una casa de 2.
