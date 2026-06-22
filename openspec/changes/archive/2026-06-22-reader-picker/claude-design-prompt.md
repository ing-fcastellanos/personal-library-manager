# Claude Design — prompt para #11 (selector de lector + bloqueo)

> Artefacto de la tarea **4.1**. Pegalo en Claude Design para diseñar las pantallas/
> estados. La salida (React + Tailwind) se integra en 4.2 sobre el andamiaje
> (`components/readers/reader-picker.tsx`, `components/auth/lock-screen.tsx`, el menú de
> cuenta), reusando primitivos de `components/ui/*` y los design tokens.

## Contexto

App "Personal Library Manager": biblioteca personal, **mobile-first**, español,
**light/dark**, paleta café/cuero. Hay **2 lectores**: cada uno usa su teléfono, y
**además hay un dispositivo compartido en la repisa**. Decisiones (ADR-0013):
- **Atribución** ("¿quién leyó?") = picker **sin PIN**.
- **Cambiar de lector** = cerrar sesión y volver a entrar (no hay multicuenta).
- **PIN** = **bloquear/re-confirmar al lector activo** en el dispositivo compartido.

## Pantallas y estados a diseñar

1. **Reader picker** (atribución / filtro): chips o tarjetas con **avatar + nombre** de
   cada lector; estados **default / seleccionado / focus / loading / vacío**. Es
   horizontal y compacto (entra junto a un formulario en mobile). **Sin candado** — no es
   seguridad.
2. **Lock screen** (bloqueo del dispositivo compartido): muestra el **avatar + nombre del
   lector activo** y un **teclado numérico (PIN-pad)**; estados **default / error (PIN
   incorrecto)**. Ocupa toda la pantalla.
3. **Acciones en el menú de cuenta**: ítems **"Bloquear"** (candado) y **"Cambiar de
   lector"** (cerrar sesión → login), integrados al menú existente del avatar.

## Tokens y requisitos

- Usar **solo** los tokens existentes (`primary`, `accent`, `muted`, `border`,
  `destructive`, `success`…); sin colores hardcodeados.
- **Mobile-first**, responsive, **accesibilidad** (roles `radiogroup`/`radio` en el
  picker, foco visible, contraste AA, objetivos táctiles grandes en el PIN-pad).

## Formato de salida

Componentes **React + Tailwind** (TypeScript) compatibles con shadcn/ui y con estos
tokens, listos para mapear sobre `ReaderPicker`, `LockScreen` y el menú de cuenta.
