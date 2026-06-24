## 1. Endpoint compuesto de intake (backend)

- [x] 1.1 Servicio `services/intake/service.ts`: `intakeBook({ book, copy?, coverSourceUrl? })` → crea Book (#12), intenta `rehostCover` (#13) best-effort, actualiza `coverUrl`, crea Copy (#12)
- [x] 1.2 Manejo best-effort de portada: si `rehostCover` falla, conservar URL externa/null y seguir; orden Book → portada → Copy
- [x] 1.3 Validar `shelfId` existente cuando viene (reusar validación de copies #12) y mapear errores de referencia
- [x] 1.4 `server/routes/intake.ts`: `POST /api/books/intake` con `requireAuth`, valida `BookCreateInput` (#5) → 400; 201 `{ book, copy }`
- [x] 1.5 Montar la ruta en `server/index.ts`
- [x] 1.6 Tests del endpoint (lane node, servicio mockeado): 201 happy path, 400 inválido, 401 sin sesión
- [x] 1.7 Integration test del servicio (emulador): crea Book+Copy; portada best-effort con `rehostCover` inyectado (éxito y fallo → 201 igual)

## 2. Prompt de Claude Design (handoff)

- [x] 2.1 Finalizar `design-prompt.md` (estados, responsive, a11y, tokens, anclaje a `components/ui/`) — ya redactado en el change
- [x] 2.2 Producir el diseño en Claude Design a partir del prompt y validarlo contra `app/style-guide` / design system base
- [x] 2.3 Capturar el markup/handoff resultante para el paso de integración

## 3. Formulario de alta (frontend)

- [x] 3.1 Hook de datos: búsqueda `GET /api/enrich` (ISBN → 1 candidato; título → top 5) con estados loading/error
- [x] 3.2 Máquina de estados del formulario: `search | loading | prefilled | validating | duplicate | error | success`
- [x] 3.3 Componentes mapeados desde el handoff sobre `components/ui/` (Input/Label/Select/Dialog/Card/Badge/Skeleton/Toast)
- [x] 3.4 Campos editables de Book + sección de Copy (estante existente, condición, adquisición, notas)
- [x] 3.5 Validación con los `*CreateInput` zod (#5); errores inline accesibles
- [x] 3.6 Guardar → `POST /api/books/intake`; estado de éxito con "ver libro" / "agregar otro"
- [x] 3.7 Gating de escritura (sesión): reusar `WriteCta`/`SignInPrompt` (ADR-0006)
- [x] 3.8 Reemplazar el placeholder de `app/agregar/page.tsx` por el formulario

## 4. Integración de duplicados (#16) en la UI

- [x] 4.1 Pre-chequeo ① blur del ISBN → `GET /api/books/duplicates?isbn=` → aviso inline no bloqueante
- [x] 4.2 Pre-chequeo ② al elegir candidato (si trae ISBN) → mismo aviso inline
- [x] 4.3 Pre-chequeo ③ al Guardar → diálogo modal bloqueante con omitir / agregar copia / editar
- [x] 4.4 Acción "agregar copia" → `POST /api/copies` con `bookId` existente (sin nuevo Book)
- [x] 4.5 Acción "editar" → apunta a la ruta de edición de #15; deshabilitada/oculta hasta que exista
- [x] 4.6 Tests del componente (lane jsdom): prellenado, validación, diálogo de duplicado, éxito

## 5. Cierre

- [x] 5.1 Pasar lint, typecheck y test suite (unit + integration + jsdom)
- [x] 5.2 QA visual responsive + accesibilidad contra el design system
- [x] 5.3 Verificar criterio de aceptación del #14: alta por ISBN/título con metadata prellenada y guardado
