# Apple Hybrid UI — Spec C Clinical Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Hybrid H materials to Labs, Eventualidades, Pase, and Conexión so guardia surfaces read as one product in light and dark — CSS + overlay wiring only; no clinical logic changes.

**Architecture:** Token-driven CSS updates in `lab.css`, `eventualidades.css`, pase styles (`layout.css` + `pase-board.css`), `cloud-sync.css`. Eventualidades compose/detail migrates from fixed bottom `.ev-compose` dock to Spec B `openSheet` (glass shell, solid inset for labs preview). Conexión stays a solid work panel; only outer floating chrome may be glass.

**Tech Stack:** Existing feature modules; `ui-overlay.mjs` from Spec B; targeted `*.test.mjs` for HTML helpers.

**Depends on:** Spec A + Spec B.  
**Spec:** [`../specs/2026-08-03-apple-hybrid-ui-clinical-surfaces-design.md`](../specs/2026-08-03-apple-hybrid-ui-clinical-surfaces-design.md)

**Out of scope:** Parse/consolidation/autosend/LWW; Expediente/Manejo/EA charts (D).

---

## File map

| Area | Paths |
| --- | --- |
| Labs | `public/styles/lab.css`; class hooks only in lab panel modules if needed |
| Eventualidades | `eventualidades.css`, `eventualidades-panel-html.mjs`, `eventualidades-render.mjs`, `eventualidades-panel.mjs`, new sheet bridge module if needed |
| Pase | `layout.css` (`.pase-*`), `pase-board.css`, `pase-board-render.mjs` only if class names change |
| Conexión | `cloud-sync.css`, `panel-conexion-*.mjs` (classes only) |

---

### Task 1: Laboratorio CSS Hybrid H

**Files:** Modify `public/styles/lab.css`

- [ ] **Step 1: Tables** — `.lab-some-table-wrap` / history containers → `background: var(--color-elevated)`; hairline border; no lift shadow

- [ ] **Step 2: Alterados** — `.lab-value-altered`, `.lab-some-abnormal`, `.out-line strong` use `var(--color-danger)`; `font-weight: 650` where weight exists

- [ ] **Step 3: Procesar** — `.btn-generate` / `#btn-procesar`: ink fill (`var(--color-accent)`), `border-radius: var(--radius-control)` (8px), add class `ui-pressable` in HTML partial if button markup is static (`public/partials/...`)

- [ ] **Step 4: Chips** — `.lab-chip`, `.todo-filter-chip`: solid subtle (`--color-accent-soft`), kill `rgba(79, 86, 255, …)` and `var(--accent, #2563eb)` fallbacks → `var(--color-accent)`

- [ ] **Step 5: Run** any lab HTML/snapshot tests that assert classes:  
  `npm run test:one -- public/js/labs-display.test.mjs` (or whichever fails from class changes)

- [ ] **Step 6: Commit** `style(labs): Hybrid H tables alterados chips Procesar`

---

### Task 2: Eventualidades — sheet compose/detail

**Files:**
- Modify: `eventualidades-panel-html.mjs`, `eventualidades-render.mjs`, `eventualidades.css`
- Create (if needed): `public/js/features/eventualidades-sheet.mjs`
- Test: `eventualidades` panel HTML tests if present

**Current state:** compose is inline fixed `.ev-compose` dock — Spec C requires sheet via `openSheet`.

- [ ] **Step 1: Failing test** — HTML helper or sheet bridge exports `openEventualidadSheet` / builds sheet panel with `.material-glass` outer + `.material-solid-elevated` labs preview inset

- [ ] **Step 2: Implement sheet bridge**

```js
// eventualidades-sheet.mjs (sketch)
import { openSheet } from '../ui-overlay.mjs';

export function openEventualidadComposeSheet({ panelHtml, onClose }) {
  const scrim = document.createElement('div');
  scrim.className = 'ui-overlay-scrim';
  const panel = document.createElement('div');
  panel.className = 'ui-overlay-sheet material-glass ev-sheet';
  panel.innerHTML = panelHtml; // includes solid inset for labs preview
  document.body.appendChild(scrim);
  document.body.appendChild(panel);
  return openSheet({
    panel,
    scrim,
    onClose: () => {
      scrim.remove();
      panel.remove();
      if (onClose) onClose();
    },
  });
}
```

- [ ] **Step 3: Wire render** — opening compose/edit calls sheet instead of only scrolling to `.ev-compose`. Keep list/strip/timeline **solid** inline. Remove or hide fixed dock when sheet is canonical (no dual UI).

- [ ] **Step 4: CSS** — `.ev-panel` / `.ev-card` solid; `.ev-sheet` glass; `.ev-sheet__labs-preview` solid elevated (nested rule)

- [ ] **Step 5: Update** `eventualidades-panel-html.test.mjs` (or equivalent) for new structure

- [ ] **Step 6: Commit** `feat(eventualidades): compose/detail as Hybrid H sheet`

---

### Task 3: Pase board Hybrid H

**Files:** `public/styles/layout.css` (`.pase-board-scroll`, `.pase-section`, `.pase-mini-card`, `.pase-patient-banner`), `pase-board.css` if needed

- [ ] **Step 1:** Board bg → `--color-content` / paper; section cards hairline, `--elev-raised: none` / no shadow theater

- [ ] **Step 2:** Patient banner solid; system type; active affordances ink underline/bar

- [ ] **Step 3:** Guardia chips in `pase-board.css` stay solid (no glass on cells)

- [ ] **Step 4: Commit** `style(pase): Hybrid H solid board density`

---

### Task 4: Conexión panel Hybrid H

**Files:** `public/styles/cloud-sync.css`; minor class hooks in `panel-conexion-html.mjs` / views if needed

- [ ] **Step 1:** `.cloud-sync-conexion` solid body (`--color-elevated` / surface); replace `var(--accent, #5b4dc0)` → `var(--color-accent)`

- [ ] **Step 2:** Stepper — current step ink; others muted

- [ ] **Step 3:** Status chips `.cloud-sync-status-chip` solid; LiveSync semantic colors

- [ ] **Step 4:** Primary/danger rows → `ui-pressable`; danger clear (`--color-danger`)

- [ ] **Step 5:** If Conexión mounts inside a floating settings overlay, outer frame may keep glass; **inner steps** solid elevated (add `.ui-overlay-nested` / `.material-solid-elevated` on step body)

- [ ] **Step 6: Run** `npm run test:one -- public/js/features/cloud-sync/panel-steps-html.test.mjs public/js/features/cloud-sync/panel-conexion-bootstrap.test.mjs` (adjust to existing)

- [ ] **Step 7: Commit** `style(conexion): Hybrid H solid stepped panel`

---

### Task 5: Contrast + verify Spec C

- [ ] Manual 3am checklist (light + dark): alterados, Nube status, sheet scrim ≥ ~38% ink light, reduced transparency usable
- [ ] `npm run build:ui` && `npm run metrics:check`
- [ ] Changelog: `hybrid-h-clinical`: labs/eventualidades sheet/pase/conexión
- [ ] Commit context update

---

## Self-review

| Spec C surface | Task |
| --- | --- |
| Labs | 1 |
| Eventualidades sheet | 2 |
| Pase | 3 |
| Conexión | 4 |
| No logic regressions | tests in 1–4 |
| Uses Spec B primitives | Task 2 `openSheet` |
