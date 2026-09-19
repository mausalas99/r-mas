# Procedure/study parsing → Pendientes, and hemodialysis UF → balance

Owner: Mauricio. Planned 2026-09-05 (ceo-fable, research via 3 Explore subagents), first slice built same day.

## Problem

The SOME paste (tab-separated hospital order export) has five row types: MEDICAMENTOS,
DIETAS, CUIDADOS, ESTUDIOS, PROCEDIMIENTO. `public/js/med-receta-parse.mjs` only ever
kept MEDICAMENTOS and DIETAS; ESTUDIOS/PROCEDIMIENTO rows (studies, imaging orders,
hemodialysis) were counted and thrown away.

## Ground truth from the owner (2026-09-05 Q&A)

- Ultrafiltration (UF) amount is **never** in the pasted text. It is typed by hand in
  "estado actual" the day after hemodialysis was ordered. Patients don't always go to
  hemodialysis the day it's ordered.
- ESTUDIOS (the study/lab itself) and PROCEDIMIENTO (its requisition — e.g. contrast
  order, catheter placement, or hemodialysis itself) are **two separate pendiente
  categories**, even when they refer to the same underlying study.
- CUIDADOS stays out of scope, unchanged.
- **Correction (2026-09-05, after Slice 1 first landed):** ESTUDIOS only becomes a
  pendiente when it's an **imaging** study (TAC, RM/resonancia, RX/radiografía,
  ecografía/ultrasonido, mamografía, angiografía, gamagrafía, PET, densitometría,
  fluoroscopia — matched by name keyword). Lab studies (biometría hemática, química
  sanguínea, gases arteriales, examen general de orina, etc.) are skipped, same as
  before Slice 1 — counted back in `skippedSummary.estudios`.
- **Correction (2026-09-05, same day):** the pendiente text should read clean, not a
  raw transcription of the SOME columns. "KIT PARA X" details (pure supply/equipment,
  no clinical content) are dropped entirely — hemodialysis reads "Procedimiento:
  HEMODIALISIS", not "... — KIT PARA HEMODIALISIS". A TOMOGRAFIA/RESONANCIA
  procedimiento name is shortened ("TOMOGRAFIA AXIAL COMPUTERIZADA DE TORAX" → "TAC de
  Torax"), and a contrast detail folds into the suffix "contrastada" instead of being
  shown verbatim ("TAC de Torax contrastada", not "... — CONTRASTE PARA TAC DE
  TORAX"). "SIN CONTRASTE" is recognized as NOT contrasted, despite containing the
  word "CONTRASTE".
- Duplicate re-pastes of an unchanged, still-open order should alert (not silently
  duplicate). A **changed** solicitud (different contrast, different study) is expected
  and should create a new pendiente, no alert.
- "Didn't happen today" for hemodialysis: the pendiente itself stays simple (no new
  state in Pendientes). The action lives as a button inside **estado actual → registro**
  (the daily entry form), not in the Pendientes list UI.

## Slices

### Slice 1 — Parse ESTUDIOS/PROCEDIMIENTO into Pendientes — **done 2026-09-05**

- `med-receta-parse.mjs`: `parseIndicacionesPaste()` now returns `pendientes: [{id, kind:
  'estudio'|'procedimiento', nombreRaw, detalleRaw}]` instead of counting these rows in
  `skippedSummary`. CUIDADOS is still the only row type that lands in `skippedSummary`.
- `medications-actions.mjs`: `commitProcessedReceta()` calls the new
  `addPendientesFromParsedReceta(activeId, parsed.pendientes)`, which builds
  `"Estudio: NOMBRE"` / `"Procedimiento: NOMBRE — detalle"` text and calls the existing
  `addTodoWithFields()`. If an open pendiente with the exact same text already exists,
  it's skipped and a toast reports how many were repeated (not duplicated); a different
  `detalleRaw` (changed solicitud) always creates a new pendiente, no alert.
  `toastParseRecetaFailure()` and `buildRecetaProcessToast()` updated so a paste that is
  only studies/procedures (no meds/diet) is not treated as a parse failure.
- Tests: `public/js/med-receta-core.test.mjs` (parser), `public/js/features/
  medications-actions.test.mjs` (dedupe/changed-solicitud behavior). 67/67 pass.
- Hemodialysis needs no special-case code in this slice — a PROCEDIMIENTO row named
  HEMODIALISIS just becomes a normal pendiente through the same path.

### Slice 2 — Hemodialysis reminder + "no fue" button in estado actual registro — **done 2026-09-05**

- `estado-actual-panel-registro.mjs`: `findOpenHemodialisisReminder(activeId)` finds an
  open pendiente whose text starts with "Procedimiento: HEMODIALISIS" and isn't already
  dismissed for today. `buildRegistroFormMarkup()` shows a reminder line with a
  `data-ea-hemodialisis-no-fue="ID"` button when one is found. Clicking it calls
  `setTodoDialysisSkippedToday(id)` and removes the reminder from the open form — it
  does **not** complete or alter the pendiente, just dismisses today's nag; the
  pendiente stays open for the next day.
- Dismiss state landed as a field on the todo itself: `dialysisSkippedOn: 'YYYY-MM-DD'`,
  written by `todos-mutations.mjs` `setTodoDialysisSkippedToday(id)`. Required adding
  `dialysisSkippedOn` to the field whitelist in `storage/storage-todo-normalize.mjs`
  (`readTodoOptionalFields`) — any todo field not listed there is silently dropped on
  every save/read.
- Tests: `estado-actual-panel-registro.test.mjs` (new file, 7 tests),
  `storage-todo-normalize.test.mjs` (2 new tests). All pass.

### Slice 3 — Ultrafiltrado field in the fluid balance — **done 2026-09-05**

- Added `ultrafiltrado` as a recognized manual-entry kind in `estado-actual-
  io.mjs` (`classifyUltrafiltradoSegment`, matches "ULTRAFILTRADO"/"ULTRAFILTRACIÓN"/
  short form "UF"). No new UI was needed — egresos are one free-text line per turno,
  and `ioNumericEgressTotal()` already sums every recognized kind generically.
- Tests: 2 new cases in `estado-actual-io.test.mjs`. All pass.

### Slice 4 — "+ Hemodiálisis pasada" button (retroactive UF entry) — superseded by Slice 5

First cut: a button in the panel's outer action bar opened a fresh registro dated
yesterday and pre-filled the T1 egresos textbox with "ULTRAFILTRADO ". Owner corrected
this twice (2026-09-05): the entry point should live inside the normal registro form
itself, and the value should not be typed into a per-turno (T1/T2/T3) free-text line at
all — see Slice 5.

### Slice 5 — "Otras fuentes cuantificables": a structured row outside T1/T2/T3 — **done 2026-09-05**

- New section in the registro's Ingresos/egresos card (`estado-actual-panel-registro.mjs`
  `buildRegistroIoSectionHtml`), between the per-turno egresos grid and Evacuaciones:
  "Otras fuentes cuantificables" — a list of rows, each a `<select>` (Ultrafiltrado /
  Drenaje / Toracocentesis) plus a cc-or-NC value input, with "+ Agregar fuente" to add
  more and a "×" to remove one. Not tied to any turno — one set of rows per registro
  entry, whatever date it's for.
- `estado-actual-io.mjs`: new `IO_EXTRA_SOURCE_KINDS` (the 3 selectable kinds; adds
  `'thoracentesis'` as a new `IoEgresoPart` kind). These rows build ordinary
  `IoEgresoPart` objects directly (no text parsing needed) and are summed by the
  already-generic `sumNumericEgressFromParts` — no change needed there.
- Data model: saved as `io.egrExtra: [{kind, value}]`, separate from `io.egrTurnos`
  (the per-turno free text) so the two reload independently when editing a past entry.
  At save/live-preview time the extra parts are concatenated into the same combined
  `egrParts` used for the balance and SOAP text.
- `openPastHemodialisisRegistro()` (the "+ Hemodiálisis pasada" shortcut) now adds an
  Ultrafiltrado row here and focuses its value, instead of writing into a turno
  textbox — the button still opens a fresh registro dated yesterday, but the value now
  goes through the same mechanism as any other loose quantifiable source.
- Tests: 3 new cases in `estado-actual-panel-registro.test.mjs` (row prefill, reading
  every row back, fill/clear round-trip). `estado-actual-io.test.mjs` and
  `estado-actual-panel-actions-active-patient.test.mjs` re-run clean (20/20).

## Not in scope (confirmed with owner)

- CUIDADOS rows.
- Any UI change inside Pendientes itself for the hemodialysis deferred case.
