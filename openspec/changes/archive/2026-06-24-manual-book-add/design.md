## Context

`app/agregar` y `app/catalogo` son placeholders (`EmptyState` + `WriteCta`). El catálogo ya
expone `/api/enrich` (#13), `/api/books/duplicates` (#16), `POST /api/books`, `POST /api/copies`
y repos (#12). #13 dejó `rehostCover()` construida y testeada pero **sin cablear** ("el flujo de
persistencia la invocará después") — #14 es ese flujo. El front usa React client components con
`fetch` directo a `/api` (patrón `useReaders`, `ReadersManager`), `components/ui/` (Input,
Select, Dialog, Card, Toast…) y gating de escritura por sesión (`WriteCta`/`SignInPrompt`,
ADR-0006). El handoff de diseño se produce en Claude Design y se mapea a esos primitivos.

## Goals / Non-Goals

**Goals:**
- Agregar un libro buscando por ISBN/título con metadata prellenada, editable, y guardarlo.
- Crear `Book`+`Copy` atómicamente y re-hospedar la portada server-side (best-effort).
- Avisar de duplicados antes de escribir y ofrecer omitir / agregar copia / editar.
- Asociar la copia a un estante existente.
- Producir un prompt de Claude Design anclado a los primitivos existentes.

**Non-Goals:**
- Crear estantes (selección solamente; el mapa es #18).
- Subir portada propia (depende de #3, cerrado) — la portada viene de metadata.
- Libro sin copia / wishlist (#37); el alta siempre crea Book+Copy.
- Edición completa del libro y notas (#15); "editar el existente" se difiere allí.
- Alta por IA / batch (#20/#21), aunque el intake quede reusable.

## Decisions

### D1 — Endpoint compuesto `POST /api/books/intake`
Crea `Book` + `Copy` en una operación server-mediada, re-hospedando la portada en el medio.
Cuerpo: `{ book: BookCreateInput, copy?: { shelfId?, condition?, acquiredAt?, notes? },
coverSourceUrl?: string }`. Responde `201 { book, copy }`. Requiere sesión (`requireAuth`).
*Alternativa descartada:* que el cliente orqueste `POST /books` + `POST /copies` — no es atómico
y el cliente no puede re-hospedar con el admin SDK (la portada quedaría como URL externa frágil).

### D2 — Re-hospedaje de portada best-effort dentro del intake
El servicio crea el `Book`, luego intenta `rehostCover(coverSourceUrl, isbn13)` (#13 D6) y, si
devuelve una URL interna, actualiza `Book.coverUrl`; si falla (descarga caída, sin ISBN para la
ruta `covers/<isbn13>`), el libro queda con la `coverUrl` recibida (externa) o nula. El alta
**no** falla por una portada. Orden: Book → (intenta portada) → Copy.
*Alternativa descartada:* re-hospedaje bloqueante — una portada caída no debe impedir registrar
un libro.

### D3 — Pre-chequeo de duplicados en tres momentos
```
  ① blur del campo ISBN          GET /books/duplicates?isbn=     aviso inline NO bloqueante
  ② selección de un candidato    GET /books/duplicates?isbn=     aviso inline NO bloqueante
     de /enrich (si trae ISBN)
  ③ al pulsar Guardar (siempre)  ?isbn=&title=&authors=          diálogo modal BLOQUEANTE
```
③ es la garantía del criterio de aceptación y el único punto que detecta el caso "alta manual
pura sin ISBN" (match STRONG por título+autor). El diálogo ofrece **omitir** (cierra, no
escribe), **agregar copia** (`POST /api/copies` con el `bookId`; no crea Book ni re-hospeda) y
**editar** (difiere a #15).

### D4 — "Editar el existente" se difiere a #15
El diálogo muestra la acción "Editar" pero su destino (la ruta de edición de libro) la entrega
#15; mientras no exista, el botón queda deshabilitado con tooltip "próximamente (#15)" o se
oculta. Así #14 no duplica la lógica de edición ni inventa una vista a medias.
*Alternativa descartada:* mini-edit con `PATCH /api/books/:id` dentro de #14 — pisa el alcance
de #15 (notas, edición completa).

### D5 — Front: client component sobre los primitivos existentes
`app/agregar/page.tsx` monta un client component de formulario (máquina de estados:
`search | loading | prefilled | validating | duplicate | error | success`) usando `fetch` a
`/api`, `components/ui/` y gating `WriteCta`/`SignInPrompt`. Validación con los `*CreateInput`
zod existentes (#5). El diseño se produce en Claude Design y se mapea a estos primitivos.
*Alternativa descartada:* Server Actions / form nativo — rompe con el patrón client-fetch del
repo.

### D6 — El prompt de Claude Design es un artefacto del change
`design-prompt.md` (en el change) especifica: los siete estados, layout mobile-first responsive,
accesibilidad (labels, foco, errores asociados, navegación por teclado), design tokens M0, y la
instrucción explícita de **anclarse a los primitivos `components/ui/`** para que el handoff se
mapee sin reinventar. Es entrada del paso "producir el diseño", no código.

## Risks / Trade-offs

- **Atomicidad parcial**: si crea el `Book` pero falla la creación del `Copy`, quedaría un Book
  sin copia. Mitigación: orden Book→portada→Copy con manejo de error que reporta claramente; un
  Book sin copia es un estado válido del modelo (no corrompe datos) y es recuperable.
- **Re-hospedaje lento**: la descarga de portada agrega latencia al `intake`. Mitigación:
  best-effort con timeout (el `rehostCover` ya lo trae); se puede mover a un job async si pesa.
- **Handoff de diseño desalineado**: Claude Design podría producir markup que no calce con
  `components/ui/`. Mitigación: el prompt (D6) fija los primitivos y tokens; QA visual de cierre.
- **Pre-chequeo ③ agrega un round-trip antes de guardar**: aceptable (una llamada barata,
  auto-indexada); evita escrituras duplicadas que costarían más.
- **Estado del formulario complejo** (7 estados, fuentes async): riesgo de bugs de carrera.
  Mitigación: máquina de estados explícita y tests del componente en el lane jsdom.
