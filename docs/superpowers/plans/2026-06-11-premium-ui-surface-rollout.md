# Premium UI — Desktop Surface Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the Workbench Refinado visual system (phase-1 tokens: elevation, typography scale, hairlines, state fills, motion) across every desktop clinical surface — without touching clinical logic.

**Architecture:** A thin overlay stylesheet `public/styles/workbench-surfaces.css` scopes premium upgrades per app region (`#patient-expediente`, `#appcontent-lab`, `aside.patient-sidebar`, …). Feature CSS files get mechanical token swaps only where the overlay cannot reach. One commit per rollout slice from the master spec order.

**Tech Stack:** Vanilla CSS custom properties (`public/tokens.css`), existing class hooks. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-premium-ui-audit-remediation-design.md` (Phase 2 desktop rollout bullet).

**Prerequisites:** Phase 1 design tokens + Phase 2 navigation on `feature/phase2-navigation`.

**Restyle recipe (every surface):**
- Borders → `var(--border-hairline)` on cards/panes
- Card elevation → `var(--elev-raised)`; overlays/dropdowns already use `var(--elev-overlay)` via `overlays.css`
- Section titles → `font: var(--type-section)` + `letter-spacing: var(--tracking-section)`
- Body copy in panels → `font: var(--type-body)` where font-size was ad-hoc 13–14px
- Hovers → `var(--state-hover-bg)`; focus → `var(--focus-ring)`
- Durations → `var(--dur-fast)` / `var(--dur-normal)`; easing → `var(--ease-out)`
- Shell frames (lab/med/exp/agenda) → `var(--elev-raised)` not raw shadow stacks
- **Never** change clinical logic `.mjs` files in restyle commits

---

### Task 1: Expediente panes (notas, indicaciones, EA, historia, tendencias, cultivos, salida)

**Files:**
- Create: `public/styles/workbench-surfaces.css` (section 1)
- Modify: `public/index.src.html` (link last among feature CSS)
- Modify: `public/styles/expediente.css` (mechanical token pass — borders/shadows/durations)

- [x] **Step 1:** Add expediente-scoped rules in `workbench-surfaces.css` (composite panes, segment panels, datos collapse, cards, listado, EA `.ea-card`, historia, vpo, receta-hu mounts).
- [x] **Step 2:** Tokenize high-traffic hardcoded shadows/borders in `expediente.css` (listado rows, segment panels).
- [x] **Step 3:** `npm run build:ui && npm test` — visual: every Expediente group tab in Sala + Inter, light + dark.
- [x] **Step 4:** Commit `feat(ui): premium expediente pane surfaces (workbench refinado)`

---

### Task 2: Laboratorio workbench

**Files:**
- Modify: `public/styles/workbench-surfaces.css` (section 2)
- Modify: `public/styles/lab.css` (token pass on `#lab-output-section`, history card, prefs)

- [x] **Step 1:** Lab shell frame + report/history cards elevation + section headers type-scale.
- [x] **Step 2:** Lab value grid items hairline borders; altered-value colors unchanged (semantic).
- [x] **Step 3:** Verify paste → procesar → output + history collapse; light/dark.
- [x] **Step 4:** Commit `feat(ui): premium laboratorio workbench surfaces`

---

### Task 3: Patient sidebar

**Files:**
- Modify: `public/styles/workbench-surfaces.css` (section 3)
- Modify: `public/styles/sidebar.css` (token pass on patient-card transitions)

- [x] **Step 1:** Card elevation + hover/active state tokens; pinned section header type-scale.
- [x] **Step 2:** Search input uses `--input-fill`, `--radius-control`, `--focus-ring`.
- [x] **Step 3:** Verify list, drag, active border, dark mode.
- [x] **Step 4:** Commit `feat(ui): premium patient sidebar surfaces`

---

### Task 4: Pase & Guardia boards

**Files:** `public/styles/workbench-surfaces.css`, `public/styles/pase-board.css`

- [x] Phase metrics cards, entrega chips, guardia census grid — hairline + elev-raised.
- [x] Commit `feat(ui): premium pase and guardia board surfaces`

---

### Task 5: Manejo + Agenda

**Files:** `workbench-surfaces.css`, `expediente.css` (med section), agenda styles

- [x] Commit `feat(ui): premium manejo and agenda surfaces`

---

### Task 6: Modals / dropdowns / toasts (glass parity audit)

**Files:** `modals.css`, `settings.css`, `overlays.css`

- [x] Ensure all floating surfaces use overlay tokens; remove duplicate solid backgrounds.
- [x] Commit `feat(ui): modal and dropdown glass parity pass`

---

### Task 7: Onboarding tour & Learn hub

**Files:** `modals.css`, learn-hub/tour CSS chunks

- [x] Commit `feat(ui): premium onboarding and learn hub surfaces`

---

### Task 8: Verification + changelog

- [x] `npm test` + `npm run metrics:check` (note: chunk renames may require staged files)
- [x] Smoke matrix: each surface × Sala/Inter × light/dark
- [x] `docs/logs/agent-changelog.md`
