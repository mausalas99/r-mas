# Hallmark UI audit tracks — implementation plan

> **For agentic workers:** Use `executing-plans` or implement task-by-task. Checkboxes track progress. One commit per task unless noted.

**Goal:** Ship four audit remediation tracks (quick wins, empty states, token debt, radius hierarchy) per spec without clinical behavior changes.

**Architecture:** All work extends `public/tokens.css` and existing CSS modules; HTML via `public/index.src.html` + `public/partials/`; empty-state markup in feature `.mjs` files. No new dependencies.

**Tech stack:** Vanilla CSS custom properties, ESM, `node:test` where applicable.

**Spec:** [`docs/superpowers/specs/2026-06-20-hallmark-ui-audit-tracks-design.md`](../specs/2026-06-20-hallmark-ui-audit-tracks-design.md)

**Critical context:**
- `public/index.html` is **generated** — edit `public/index.src.html` / partials, then `npm run build:ui`.
- Run `npm run metrics:check` before each merge.
- Do **not** run full `npm test` during dev; use targeted tests if added.

**Recommended PR order:** Track 1 → Track 4 → Track 3 → Track 2 (or Track 2 in parallel).

---

## Track 1 — Quick wins

### Task 1.1: Scrim + viewport tokens

**Files:**
- Modify: `public/tokens.css`
- Modify: `public/styles/base.css`

- [ ] **Step 1:** Add to `:root` in `tokens.css` (after overlay tokens):

```css
  --scrim-bg: color-mix(in oklab, var(--color-ink) 52%, transparent);
  --app-height: 100vh;
  --z-base: 0;
  --z-sticky: 10;
  --z-dropdown: 100;
  --z-sidebar-rail: 450;
  --z-floating: 1000;
  --z-modal: 9000;
  --z-modal-nested: 9010;
  --z-toast: 9500;
  --z-celebration: 9600;
  --z-cmdk: 9800;
  --z-db-unlock: 9900;
```

- [ ] **Step 2:** Add `html.dark` overrides:

```css
  --scrim-bg: color-mix(in oklab, var(--color-ink) 68%, transparent);
```

- [ ] **Step 3:** Add `@supports (height: 100dvh)` block at end of `tokens.css`:

```css
@supports (height: 100dvh) {
  :root { --app-height: 100dvh; }
}
```

- [ ] **Step 4:** In `base.css`, replace `height: 100vh` on app shell with `height: var(--app-height); min-height: var(--app-height);`

- [ ] **Step 5:** `npm run build:ui:check` — app boots, no console errors.

- [ ] **Step 6:** Commit: `feat(ui): scrim, viewport, and z-index scale tokens`

---

### Task 1.2: Modal scrim migration

**Files:**
- Modify: `public/styles/modals.css`
- Modify: `public/styles/lab.css` (`.modal-backdrop` duplicate ~L1753)

- [ ] **Step 1:** Replace all modal backdrop `background: rgba(0,0,0,…)` with `background: var(--scrim-bg)` in `modals.css`.

- [ ] **Step 2:** Align `lab.css` `.modal-backdrop` scrim to `var(--scrim-bg)`.

- [ ] **Step 3:** Visual: open templates modal, SOAP modal, DB unlock — scrim slightly tinted, not pure black.

- [ ] **Step 4:** Commit: `fix(ui): tinted modal scrims via --scrim-bg`

---

### Task 1.3: Z-index scale migration (overlay stack)

**Files:**
- Modify: `public/styles/modals.css`
- Modify: `public/styles/sidebar.css`
- Modify: `public/styles/med-pharm-profile.css`
- Modify: `public/styles/mobile.css`
- Modify: `public/styles/layout.css` (header `z-index: 10` → `var(--z-sticky)`)

- [ ] **Step 1:** Map values per spec table:
  - `9990`/`9995` backdrops → `var(--z-modal)`
  - `200010` release notes → `var(--z-modal-nested)`
  - `99999` confetti → `var(--z-celebration)`
  - sidebar `10060` / med-pharm `10050`/`10120` → audit against modal/toast; use `var(--z-toast)` or `var(--z-modal-nested)` as appropriate
  - `9200` mobile → `var(--z-modal)` or `var(--z-cmdk)` per context

- [ ] **Step 2:** Grep `z-index:\s*[0-9]{4,}` in `public/styles/` — document any intentional exceptions in spec changelog.

- [ ] **Step 3:** Stack test (manual):
  1. Open expediente modal
  2. Open ⌘K — palette above modal
  3. Trigger toast — toast above modal, below cmdk if both open
  4. Confetti (if triggerable) — visible above toast

- [ ] **Step 4:** Commit: `refactor(ui): canonical z-index tokens for overlay stack`

---

### Task 1.4: Viewport dvh pass

**Files:**
- Modify: `public/styles/modals.css`
- Modify: `public/styles/settings.css`
- Modify: `public/styles/pase-board.css` (entrega modal height)

- [ ] **Step 1:** Pattern for max-heights:

```css
max-height: min(85dvh, calc(var(--app-height) - 56px));
```

Apply where only `100vh` exists without `dvh` fallback (grep `100vh` in `public/styles/`).

- [ ] **Step 2:** Leave confetti `@keyframes` using `100vh` (animation exit) — acceptable.

- [ ] **Step 3:** Commit: `fix(ui): prefer dvh for modal and shell max-heights`

---

### Task 1.5: Skip-to-content link

**Files:**
- Modify: `public/index.src.html`
- Modify: `public/partials/layout/app-body.html` (confirm `#main-area` id)
- Modify: `public/styles/base.css`
- Modify: `public/interno/index.html` (if main landmark differs)

- [ ] **Step 1:** Insert immediately after `<body>` in `index.src.html`:

```html
<a class="skip-link" href="#main-area">Saltar al contenido</a>
```

- [ ] **Step 2:** Add CSS in `base.css`:

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: var(--z-db-unlock);
  padding: 10px 16px;
  background: var(--surface);
  color: var(--text);
  border: 2px solid var(--action);
  border-radius: var(--radius-md);
  font-weight: 600;
  text-decoration: none;
}
.skip-link:focus {
  left: 12px;
  top: 12px;
  outline: none;
  box-shadow: var(--focus-ring);
}
```

- [ ] **Step 3:** Interno: add skip link targeting interno main content id (grep `main` landmark in `public/interno/`).

- [ ] **Step 4:** `npm run build:ui` — Tab from load focuses skip link; Enter lands in main work area.

- [ ] **Step 5:** Commit: `a11y(ui): skip-to-content link on desktop and interno`

---

### Track 1 verification

- [ ] Light / dark / high-contrast modal scrim
- [ ] ⌘K + modal + toast stacking
- [ ] Skip link keyboard path
- [ ] `npm run metrics:check`

---

## Track 2 — Empty states

### Task 2.1: Shared empty-state CSS

**Files:**
- Modify: `public/styles/layout.css`
- Modify: `public/styles/cmdk.css`
- Modify: `public/styles/workbench-surfaces.css` (`.todo-empty`)

- [ ] **Step 1:** Extend `layout.css`:

```css
.empty-state--compact {
  padding: calc(24px * var(--density-space));
  align-items: flex-start;
  text-align: left;
}
.empty-state--compact .empty-state-title,
.empty-state--compact .empty-state-lead {
  text-align: left;
  max-width: 36ch;
}
.empty-state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
```

- [ ] **Step 2:** Upgrade `.cmdk-empty` to support block layout when child elements present (title + lead).

- [ ] **Step 3:** Align `.todo-empty` with `.empty-state-lead` typography (or add class `empty-state-lead` in JS).

- [ ] **Step 4:** Commit: `feat(ui): shared compact empty-state layout utilities`

---

### Task 2.2: Estado Actual empty state

**Files:**
- Modify: `public/js/features/estado-actual-panel.mjs`

- [ ] **Step 1:** Replace single `<p class="ea-muted">` with composed block:

```javascript
'<div class="empty-state empty-state--compact" role="status">' +
  '<h3 class="empty-state-title">Selecciona un paciente para monitoreo</h3>' +
  '<p class="empty-state-lead">Elige uno en el censo de la izquierda. Ahí podrás registrar signos, balance hídrico y dieta.</p>' +
'</div>'
```

- [ ] **Step 2:** Deselect patient in UI — empty state shows title + lead.

- [ ] **Step 3:** Commit: `feat(ui): composed empty state for Estado Actual`

---

### Task 2.3: Command palette empty state

**Files:**
- Modify: `public/js/features/command-palette.mjs`

- [ ] **Step 1:** When `!results.length && query.trim()`:

```javascript
empty.innerHTML =
  '<span class="empty-state-title">Sin coincidencias</span>' +
  '<span class="empty-state-lead">Prueba con el nombre del paciente, una pestaña o una sección del expediente.</span>';
```

- [ ] **Step 2:** Add `role="status"` on container li or wrap in div inside li.

- [ ] **Step 3:** Commit: `feat(ui): composed empty state for command palette`

---

### Task 2.4: Pendientes empty states

**Files:**
- Modify: `public/js/features/todos.mjs`

- [ ] **Step 1:** No-patient branch — use composed HTML (mirror expediente copy).

- [ ] **Step 2:** Empty list branch — wrap existing filter-specific line in title; add lead: “Usa el campo de arriba para agregar uno.”

- [ ] **Step 3:** Handoff filter — keep specific title; lead explains turno anterior context.

- [ ] **Step 4:** Commit: `feat(ui): composed empty states for pendientes`

---

### Task 2.5: EA charts empty (if applicable)

**Files:**
- Modify: `public/js/features/estado-actual-charts-modal.mjs` OR CSS-only if static
- Modify: `public/styles/estado-actual.css` (`.ea-charts-empty`, `.ea-charts-summary-empty`)

- [ ] **Step 1:** Grep render path for charts empty — upgrade to title + lead if single line.

- [ ] **Step 2:** Commit: `feat(ui): composed empty state for EA charts` (or skip with note if already adequate)

---

### Task 2.6: Guardia vitals feed alignment (optional)

**Files:**
- Modify: `public/js/features/guardia-vitals-feed.mjs`
- Modify: `public/styles/pase-board.css`

- [ ] **Step 1:** Apply `empty-state-title` / `empty-state-lead` classes to `.vfeed-empty` spans.

- [ ] **Step 2:** Commit: `style(ui): align guardia vitals empty state typography`

---

### Track 2 verification

- [ ] No patient → EA, pendientes, expediente each show actionable copy
- [ ] ⌘K search "zzzzz" → composed empty
- [ ] `npm run build:ui:check`

---

## Track 3 — Token debt (lab + pase-board)

### Task 3.1: New semantic tokens

**Files:**
- Modify: `public/tokens.css`

- [ ] **Step 1:** Add danger hover + lab header tone tokens to `:root`:

```css
  --color-danger-hover-bg: color-mix(in oklab, var(--error) 14%, var(--surface));
  --lab-header-slate: #374151;
  --lab-header-green: #065f46;
  --lab-header-indigo: #3730a3;
  --lab-header-rose: #881337;
  --lab-header-amber: #78350f;
  --lab-header-teal: #134e4a;
  --lab-header-teal-md: #0f766e;
  --lab-header-violet: #4a1d96;
```

- [ ] **Step 2:** Add dark-theme mixes for `.card-header--tone-*-dark` variants (mirror existing `color-mix` lines using tokens as base).

- [ ] **Step 3:** Commit: `feat(tokens): lab header tones and danger hover semantic tokens`

---

### Task 3.2: lab.css migration (15 targets)

**Files:**
- Modify: `public/styles/lab.css`

- [ ] **Step 1:** Replace `#fee2e2` hover backgrounds → `var(--color-danger-hover-bg)`.

- [ ] **Step 2:** Replace `.card-header--tone-*` hex → `var(--lab-header-*)`.

- [ ] **Step 3:** Replace `#fff` / `#f9fafb` on colored headers → `var(--color-on-accent)` where contrast holds.

- [ ] **Step 4:** Replace `#93c5fd` → `var(--color-accent-soft-text)`.

- [ ] **Step 5:** Replace `#f8fafc` → `var(--input-fill)`.

- [ ] **Step 6:** Remove redundant `var(--error, #dc2626)` fallbacks → `var(--error)`.

- [ ] **Step 7:** Visual: lab panel section headers — colors unchanged to eye.

- [ ] **Step 8:** Commit: `refactor(ui): tokenize lab.css hardcoded colors (wave 1)`

---

### Task 3.3: pase-board.css migration (15 targets)

**Files:**
- Modify: `public/styles/pase-board.css`

- [ ] **Step 1:** Remove `#666`, `#c0392b`, `#c53030`, `#c9a227` from `var(..., fallback)` — use token only.

- [ ] **Step 2:** Replace `#16a34a` status → `var(--success)` mixes.

- [ ] **Step 3:** Replace `#ca8a04` → `var(--todo-prio-media)` mixes.

- [ ] **Step 4:** Replace ink scrim `#1a2332` / `#0f172a` → `var(--color-ink)`.

- [ ] **Step 5:** Grep remaining `#` in file — count ≤53.

- [ ] **Step 6:** Visual: guardia board critical/warn chips, entrega modal.

- [ ] **Step 7:** Commit: `refactor(ui): tokenize pase-board.css hardcoded colors (wave 1)`

---

### Task 3.4: Token debt guard comment

**Files:**
- Modify: `public/styles/lab.css` (header comment)
- Modify: `public/styles/pase-board.css` (header comment)

- [ ] **Step 1:** Add one-line comment: `/* New rules: use var(--*) only; no raw hex */`

- [ ] **Step 2:** Commit: `docs(ui): hex guard comment on lab and pase-board stylesheets`

---

### Track 3 verification

- [ ] `rg '#[0-9a-fA-F]{3,8}' public/styles/lab.css | wc -l` ≤ 12
- [ ] Same for pase-board ≤ 53
- [ ] Light + dark lab headers + guardia chips
- [ ] `npm run metrics:check`

---

## Track 4 — Radius hierarchy

### Task 4.1: Radius tokens

**Files:**
- Modify: `public/tokens.css`

- [ ] **Step 1:** Add:

```css
  --radius-field: 12px;
  --radius-chip: 8px;
  --radius-inner: var(--radius-md);
  --radius-container: var(--radius-lg);
```

- [ ] **Step 2:** Document in comment that `--radius-xl` remains for marketing/onboarding shells only.

- [ ] **Step 3:** Commit: `feat(tokens): field, chip, inner, and container radius roles`

---

### Task 4.2: Rewrite soft-ui.css tiers

**Files:**
- Modify: `public/styles/soft-ui.css`

- [ ] **Step 1:** Tier A — change container block to use `var(--radius-container)` instead of `--radius-xl`.

- [ ] **Step 2:** Tier D — split control block: move text inputs/textareas to `--radius-field`; keep buttons on `--radius-control`.

- [ ] **Step 3:** Add exclusion block:

```css
table,
.cultivos-table,
.cultivos-table input,
.ea-card table,
.lab-output-box pre {
  border-radius: 0 !important;
}
```

- [ ] **Step 4:** Remove `!important` from Tier A where `.card { border-radius: var(--radius-lg) }` in `lab.css` already matches — test specificity.

- [ ] **Step 5:** Commit: `refactor(ui): radius hierarchy in soft-ui (containers vs fields vs pills)`

---

### Task 4.3: Feature CSS alignment

**Files:**
- Modify: `public/styles/lab.css` (`.card` border-radius if fighting soft-ui)
- Modify: `public/styles/estado-actual.css` (`.ea-card` — ensure uses `--radius-inner` or md)

- [ ] **Step 1:** Grep `border-radius: var(--radius-xl)` in styles — downgrade to `--radius-container` except onboarding modals.

- [ ] **Step 2:** Commit: `style(ui): align feature cards to container radius token`

---

### Task 4.4: Visual regression pass

- [ ] **Step 1:** Screenshot checklist:
  - Laboratorio → listado rows + date inputs
  - Expediente → Pendientes add row
  - Manejo → receta wrap
  - Pase board → mini-cards
  - Settings → theme buttons (stay pill)

- [ ] **Step 2:** Fix any broken specificity with minimal overrides.

- [ ] **Step 3:** Commit fixes if needed: `fix(ui): radius regression fixes from soft-ui pass`

---

### Track 4 verification

- [ ] Listado inputs are rounded rect (~12px), not full pill
- [ ] Primary buttons still pill
- [ ] Cards slightly less “bubble” than before (lg not xl)
- [ ] `npm run metrics:check`

---

## Wrap-up

### Task W.1: Documentation sync

**Files:**
- Modify: `.cursor/rules/project-context.mdc` (changelog prepend)
- Modify: `design.md` (optional one-line pointer to spec)

- [ ] **Step 1:** Changelog entry:

```markdown
- **2026-06-20** `ui-audit-tracks`: scrim/z-index/viewport tokens, skip link, empty-state parity, lab/pase hex wave 1, radius hierarchy; spec `docs/superpowers/specs/2026-06-20-hallmark-ui-audit-tracks-design.md`.
```

- [ ] **Step 2:** Append session note to `docs/logs/agent-changelog.md`.

- [ ] **Step 3:** Commit: `docs(context): ui audit tracks spec and changelog`

---

## Estimated effort

| Track | Tasks | Est. time |
| --- | --- | --- |
| 1 Quick wins | 5 | 2–3 h |
| 2 Empty states | 6 | 2–3 h |
| 3 Token debt | 4 | 3–4 h |
| 4 Radius | 4 | 2–3 h |
| **Total** | **19** | **~9–13 h** |

---

## PR slicing (suggested)

| PR | Branch prefix | Contains |
| --- | --- | --- |
| 1 | `ui/track-1-quick-wins` | Tasks 1.1–1.5 |
| 2 | `ui/track-4-radius` | Tasks 4.1–4.4 |
| 3 | `ui/track-3-tokens` | Tasks 3.1–3.4 |
| 4 | `ui/track-2-empty-states` | Tasks 2.1–2.6 |
| 5 | `docs/ui-audit-tracks` | Task W.1 (or fold into PR 4) |

Each PR: `npm run build:ui:check && npm run metrics:check` + manual verification rows from spec.
