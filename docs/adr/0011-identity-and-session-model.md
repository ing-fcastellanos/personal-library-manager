# ADR-0011: Modelo de identidad y sesión

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #7, #8, #9, #10, #11

## Contexto

Hay **2 lectores** en la casa. Cada lectura y cada publicación a Goodreads debe
quedar **atribuida a un lector concreto** (ADR-0005, ADR-0007), y las acciones de
escritura exigen identidad (ADR-0006). Firebase Auth aporta su propio `uid`. Hay que
fijar cómo se relaciona un _lector_ con un _usuario_ de Firebase, qué es el PIN, y
dónde vive la verdad de la sesión. Además se decidió construir **#8 (perfiles) antes
que #7 (sesión)**, así que el modelo de lector no puede depender de que el `uid` ya
exista.

## Decisión

- **Un lector = un usuario de Firebase Auth (Modelo A).** Cada lector se autentica
  con **magic-link passwordless** a su propio email. Atribución fuerte: el `uid`
  verificado identifica al lector.
- **Keying desacoplado.** La entidad `Reader` tiene un **`id` propio estable**
  (no es el `uid`) y un campo **`uid`** que la liga **1:1** a su usuario de Firebase.
  El `uid` se asocia **en el primer login** (#7). Esto permite que los perfiles
  existan antes de que exista la auth (habilita #8 primero) sin romper el Modelo A.
- **El PIN es un desbloqueo rápido, no la identidad.** El magic-link **enrola** el
  dispositivo una vez (sesión larga recordada); el **PIN corto** (hash en el doc del
  lector) re-confirma "soy yo" al ejecutar una escritura o **cambiar de lector** en
  un dispositivo ya enrolado. No es un primitivo de Firebase ni crea identidad.
- **La sesión es server-authoritative.** Se usan **session cookies de Firebase**
  (httpOnly, secure, ≤14 días) creadas y verificadas por Express con el Admin SDK.
  El **Client SDK solo se usa en el acto de sign-in** (obtener el ID token); la
  **autorización** siempre la decide el servidor leyendo el cookie
  (`getCurrentReader()` / `requireAuth()` en Express y RSC de Next).

## Consecuencias

- **Positivas:** atribución por lector limpia; `request.auth.uid` disponible para las
  security rules de los casos de cliente directo (ADR-0009); una sola fuente de verdad
  de autorización (servidor); perfiles desacoplados de la auth (permite #8 antes que #7).
- **Negativas / trade-offs:** cada lector necesita un email para el magic-link; la
  sesión expira a los 14 días (re-PIN/re-magic-link); coexisten dos estados (Client SDK
  vs cookie) que hay que mantener alineados usando el servidor como árbitro.
- **Seguimiento:** manejo de fuerza bruta del PIN; refresco de la sesión en uso;
  revisar el modelo de amenaza si se suman usuarios o acceso fuera de casa.

## Alternativas consideradas

- **Modelo B (cuenta de hogar única + PIN elige lector)** — sin emails por lector,
  pero el `uid` no identifica al lector y la atribución se apoya solo en el PIN;
  descartado por atribución débil.
- **Modelo C (Firebase anónimo + PIN)** — cero fricción, pero sin identidad real ni
  recuperación; descartado.
- **PIN como credencial server-side propia** — más "login" y más superficie; se
  prefirió el PIN como desbloqueo sobre una sesión ya establecida.
- **Autorización desde el Client SDK** — dos fuentes de verdad desincronizables;
  descartado a favor del servidor como árbitro.
