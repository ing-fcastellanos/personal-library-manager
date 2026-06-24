## Why

El alta manual (#14) ya crea libros, pero no hay forma de **corregir** un libro mal capturado
ni de anotar un ejemplar. El issue #15 cierra ese hueco: una pantalla de edición que arregla
campos de `Book`/`Copy`, permite **notas por ejemplar**, deja **subir una portada propia**,
ofrece **re-enriquecer** metadata a pedido, y registra los cambios (cimiento para la auditoría
de M8). Además reactiva los enganches que #14 dejó esperando: el botón "Editar el existente"
del diálogo de duplicados y "Ver libro" hoy apuntan a un placeholder. El backend de edición ya
existe (`PATCH /api/books/:id`, `PATCH /api/copies/:id`, #12); falta la pantalla y el upload de
portada. Depende de #12 (repos) y #6 (design system), ambos listos.

## What Changes

- **Ruta de edición** `/libros/[id]/editar`: carga el `Book` y un `Copy`, edita y guarda con
  los `PATCH` existentes. Reactiva `onEditExisting`/`onViewBook` de #14 para que naveguen acá.
- **Editor dedicado** `EditBookForm`, construido extrayendo los campos compartidos con #14
  (`BookFields`/`CopyFields`, TokenField, CoverPreview) a componentes reusables. Alcance v1:
  editar el `Book` + **un** `Copy` (el del contexto), con **notas** en ese `Copy`.
- **Subir portada propia** vía nuevo `POST /api/books/:id/cover` (server-mediado, admin SDK,
  como `rehostCover` #13): recibe la imagen en base64, valida tipo `image/*` y tamaño ≤ 5 MB,
  la sube a `covers/<bookId>.<ext>` (**reemplaza** la anterior) y devuelve la URL interna. Se
  acepta tal cual (resize diferido a #50). Botón **"quitar portada"** → `coverUrl = null`.
- **Procedencia de portada**: nuevo campo `Book.coverSource` (`"metadata" | "user"`) para que
  re-enriquecer no pise una portada subida por el usuario.
- **Re-enriquecer a pedido**: botón que re-consulta `GET /api/enrich?isbn=` (#13) y muestra un
  **diff por campo** — traer el valor de la fuente o mantener el del usuario (aplicación
  selectiva, no clobbering).
- **Registro de cambios (mínimo)**: al hacer `PATCH`, el servidor escribe un documento en una
  colección `auditLog` (campos cambiados, `readerId`, timestamp). Sin UI de consulta — la
  auditoría completa es #40 (M8).
- **Prompt de Claude Design** de la pantalla de edición como artefacto del change.

**Fuera de alcance:** gestión multi-ejemplar (editar varios `Copy` a la vez), UI de auditoría
(#40), resize/normalización de portada (#50), upload directo de cliente a Storage (#3, sigue
cerrado), y el listado/browse del catálogo que linkeará a esta ruta (#17).

## Capabilities

### New Capabilities
- `catalog-edit`: edición de un libro y su ejemplar — pantalla `/libros/[id]/editar`, subida de
  portada server-mediada con procedencia, re-enriquecer con diff selectivo, notas por ejemplar,
  y registro mínimo de cambios.

### Modified Capabilities
- `data-model`: el `Book` gana un campo opcional `coverSource` (`"metadata" | "user"`) para
  distinguir una portada subida por el usuario de una de metadata.

## Impact

- **Backend nuevo**: `server/routes/` — `POST /api/books/:id/cover` (body-limit elevado en la
  ruta) y un servicio `services/covers/` (validación + subida admin SDK). Registro `auditLog`
  en los `PATCH` de books/copies (un repo `services/audit/`).
- **Tipo**: `lib/types/book.ts` agrega `coverSource`; el repo de books lo persiste.
- **Frontend nuevo**: `app/libros/[id]/editar/page.tsx` (gateada por sesión) y
  `components/books/` (`EditBookForm`, `BookFields`/`CopyFields` extraídos, uploader de portada,
  diff de re-enrich). Reconecta `duplicate-dialog`/`add-book` (#14).
- **Storage**: primera **subida de cliente→servidor** de portada (admin SDK; no abre
  `storage.rules`). Path `covers/<bookId>` (no toca `rehostCover` de #13).
- **Reusa**: `PATCH /api/books|copies/:id` (#12), `GET /api/enrich` (#13), primitivos
  `components/ui` y el patrón de form de #14, gating `useAuth`/`requireAuth`.
- **Dependencias**: #12, #6 — listos. Desbloquea: el "Editar existente" de #14.
