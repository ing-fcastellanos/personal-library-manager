# Claude Design — prompt para #9 (login / PIN UI)

> Artefacto de la tarea **6.1**. Pegalo en Claude Design para generar las pantallas
> de auth. La salida (React + Tailwind) se integra en 6.2 sobre el andamiaje ya
> construido (`components/auth/*`, `app/login`, `app/auth/callback`), reusando los
> primitivos de `components/ui/*` y los design tokens de `app/globals.css`.

## Contexto del proyecto

App "Personal Library Manager": gestión de biblioteca personal, **mobile-first**,
español, **light/dark**. Stack **Next 15 + React + Tailwind + shadcn/ui**. Paleta de
marca **café/cuero sobre papel** (primary café). El login es **contextual**: la app
se usa sin login para leer; iniciar una acción de escritura lleva a iniciar sesión.

## Objetivo del diseño

Diseñar las pantallas/estados de **autenticación**. NO rediseñar el resto de la app.

## Pantallas y estados a diseñar

1. **Login** (`/login`): título, campo email, botón "Enviar enlace"; estado **enviado**
   ("revisá tu correo"); estado de **error**. Auth por **magic-link** (sin contraseña).
2. **Callback** (`/auth/callback`): estado **cargando** ("iniciando sesión…") y estado
   de **error** (enlace expirado / abierto en otro dispositivo) con botón "volver a
   intentar".
3. **PIN-pad**: teclado **numérico** mobile (dígitos 0–9 + borrar), indicador de
   progreso de N puntos, objetivos táctiles grandes, accesible por teclado.
4. **Definir PIN**: dos pasos (ingresar + confirmar) usando el PIN-pad; mensajes de
   "no coinciden" y "PIN guardado".
5. **Control de auth en el header**: estado **no autenticado** ("Iniciar sesión") y
   **autenticado** (avatar del lector + menú con "Cerrar sesión").
6. **Prompt "necesitás iniciar sesión"** al intentar una acción de escritura sin sesión.

## Tokens y requisitos transversales

- Usar **solo** los tokens existentes (`primary`, `background`, `card`, `muted`,
  `border`, `destructive`, `success`, …); sin colores hardcodeados.
- **Mobile-first** y responsive; **accesibilidad** (foco visible, ARIA, contraste AA).
- Estados: default / hover / focus / disabled / loading / error / éxito.

## Formato de salida esperado

Componentes **React + Tailwind** (TypeScript) compatibles con shadcn/ui y con estos
tokens, listos para mapear sobre `components/auth/*`, `app/login` y `app/auth/callback`.
