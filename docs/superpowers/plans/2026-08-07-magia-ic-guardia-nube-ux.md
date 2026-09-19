# Magia IC + Guardia UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Slice A3 (EA → Nota) + Slice B1–B2 (Guardia labels + empty state); document B5 as next.

**Architecture:** Pure helper module for note patch from patient EA; wire CTA next to «Desde censo»; rename guardia scope toggle + empty grid message. No schema changes.

**Tech Stack:** ESM renderer modules, colocated `*.test.mjs`, Spanish UI neutro.

**Spec:** `docs/superpowers/specs/2026-08-07-magia-ic-guardia-nube-ux-design.md`

---

### Task 1: `note-from-estado-actual` helpers + tests

**Files:**
- Create: `public/js/features/note-from-estado-actual.mjs`
- Create: `public/js/features/note-from-estado-actual.test.mjs`
- Modify: `package.json` (`scripts.test` if new path required)

- [ ] Export `extractVitalsFromMonitoreo(monitoreo)` → `{ ta, fr, fc, temp, peso }`
- [ ] Export `buildNotePatchFromEstadoActual(patient, { getEstadoActualText })` → `{ evolucion, vitals }`
- [ ] Export `applyEstadoActualToNote(note, patch, { replaceEvolucion })` — fill empty fields; replace evolucion only when flagged
- [ ] Tests: empty note fills; non-empty evolucion untouched unless replace; missing monitoreo → empty patch
- [ ] `npm run test:one -- public/js/features/note-from-estado-actual.test.mjs`

### Task 2: Wire «Desde Estado actual» on Nota

**Files:**
- Modify: `public/js/features/notes-indicaciones.mjs`
- Modify: tests if note UI has colocated coverage

- [ ] Button on Evolución card next to «Desde censo»
- [ ] Confirm if evolucion already has text; then apply patch + refresh form
- [ ] Spanish copy: «Desde Estado actual»
- [ ] `npm run test:one` on related tests

### Task 3: Guardia scope rename + empty state

**Files:**
- Modify: `public/js/guardia-mode-sync-ui.mjs` (and any HTML builders for the toggle)
- Modify / create: empty-state helper or inline in guardia board render
- Modify: colocated tests

- [ ] Labels → «Censo: todos» / «Censo: solo entregados»
- [ ] Hint: filter of grid, not Entrega mode
- [ ] Empty grid message with next action
- [ ] `npm run test:one` on guardia UI tests

### Task 4: Docs index + context (on commit)

- [ ] Link spec from `docs/features/features-index.md` if feature domain listed
- [ ] On commit: changelog in `project-context.mdc`

### Task 5: Fin de guardia → pendientes por equipo origen (B5)

**Files:**
- Create: `public/js/features/guardia-fin-turno-model.mjs` (+ test)
- Create: `public/js/features/guardia-fin-turno-html.mjs`
- Create: `public/js/features/guardia-fin-turno-modal.mjs` (+ test)
- Modify: `public/js/features/guardia-phase-bar.mjs`
- Modify: `public/partials/modals/root.html`, `public/styles/modals.css`

- [x] Group Active coverings with open estudios by `source_team_id`
- [x] Finalizar turno ends clock first; opens sheet if open estudios remain
- [x] **Enviar N** → `dbGuardiaResolve` for that source team (does not delete pendientes items)
- [x] **Cerrar sin enviar** leaves coverings Active
- [x] Colocated tests via `test:one`
