# ADR-0006: Modelo de autenticación — QR deep-link + identidad de lector

- **Estado:** Accepted
- **Fecha:** 2026-06-21
- **Responsable(s):** ing-fcastellanos
- **Issues relacionados:** #7, #9, #10, #32

## Contexto

Habrá QRs **estáticos pegados al librero** para 3 acciones: ver dashboard, agregar
libros y registrar libro terminado. Agregar y registrar son acciones de **escritura**
y deben quedar atribuidas a uno de los **2 lectores**. Un QR estático y público no
puede contener una credencial reutilizable, porque cualquiera que lo vea quedaría
autenticado.

## Decisión

- El QR es un **deep-link a una acción** (`/scan?action=...&shelf=...`), **no** una
  credencial.
- `dashboard` es de **lectura** (sin login). `add` y `finish` **exigen identidad**.
- Identidad liviana para uso doméstico: **selector de lector** + **PIN corto** o
  **magic-link** (Firebase Auth passwordless), con **sesión recordada por dispositivo**.
- La sesión se valida server-side con session cookies de Firebase.

## Consecuencias

- **Positivas:** comodidad del QR sin exponer credenciales; escritura siempre
  atribuida al lector correcto; fricción mínima tras el primer login en un dispositivo.
- **Negativas / trade-offs:** primer uso en un dispositivo nuevo requiere login;
  manejo de PIN (rate-limiting) y expiración de sesión.
- **Seguimiento:** revisar el modelo de amenaza si se suman usuarios o acceso fuera
  de casa.

## Alternativas consideradas

- **QR con token de auto-login** — cómodo pero inseguro (credencial pública estática);
  descartado.
- **Login completo siempre** — seguro pero con demasiada fricción para uso frente al
  librero; se prefirió sesión recordada por dispositivo.
