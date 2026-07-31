# Labs externos + Actualizar labs unificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modal de entrada manual de labs por tipo (celdas → historial `origin: 'externo'`) y un solo botón Actualizar labs (paciente → fechas; equipo → checkboxes).

**Architecture:** Catálogo + synthesize puros; feature modal llama `pushLabHistory`. Batch import gana modo single-patient reutilizando fetch del import actual; se retira el modal/botón Importar del repositorio.

**Tech Stack:** ESM renderer (`.mjs`), overlays HTML, `node --test` vía `npm run test:one`.

**Spec:** `docs/superpowers/specs/2026-07-31-labs-externos-manual-entry-design.md`

---

### Task 1: Catálogo + synthesize (TDD)

**Files:**
- Create: `public/js/labs-manual-catalog.mjs`
- Create: `public/js/labs-manual-synthesize.mjs`
- Create: `public/js/labs-manual-synthesize.test.mjs`

- [x] Core fields BH/QS/ESC/PFHs/GASES/EGO/COAG (+ keys extendidos desde defs)
- [x] `listManualLabTypes()`, `fieldsForManualLabType(sectionKey)`
- [x] `synthesizeManualResLab(sectionKey, valuesByKey)` → string o `''`
- [x] Tests: omite vacíos; `BH\tHb 12.4`; qual texto

### Task 2: Modal Labs externos

**Files:**
- Create: `public/js/features/lab-manual-entry.mjs`
- Modify: `public/partials/chrome/overlays.html`
- Modify: `public/partials/layout/app-body.html` (botón)
- Modify: `public/js/features/lab-panel.mjs`, `lab-panel-workbench-store.mjs` (origin), historial label
- Modify: CSS lab / soft-ui según patrón existente
- Wire: `lazy-feature-routes`, `app-shell-modals`, windowHandlers

- [x] Modal tipo + fecha + hora + grilla
- [x] Guardar → pushLabHistory con `origin: 'externo'`
- [x] Label “Externo” en historial si `origin === 'externo'`

### Task 3: Unificar Actualizar labs

**Files:**
- Modify: `public/js/features/lab-repo-batch-import.mjs`
- Modify: `public/partials/layout/app-body.html`, `overlays.html`
- Modify: `command-palette-model.mjs`, `lab-panel.mjs`, lazy routes
- Keep fetch helpers in `lab-repo-import.mjs`; stop exposing dedicated import modal as primary UI

- [x] Botón único “Actualizar labs”
- [x] Paciente activo → UI solo fechas → fetch ese paciente
- [x] Sin paciente → UI equipo actual
- [x] Quitar botón/modal Importar del repositorio (o hidden + dead code paths cleaned)

### Task 4: Docs + verify

- [x] `docs/features/features-index.md`
- [x] `npm run test:one` on new tests
- [x] `npm run build:ui`
- [ ] project-context changelog on commit (ready; commit when you ask)

