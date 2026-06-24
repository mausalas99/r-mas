# LAN ⇄ + Ajustes panel redesign — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Conexión guardia (⇄) and Ajustes panel interiors with a status/PIN hero + unified `settings-card-stack` row grammar — fixing hierarchy and right-edge consistency without changing LAN or settings behavior.

**Architecture:** Add shared CSS primitives (`btn-settings-row`, hero, alert strip) in `settings.css`. Refactor LAN panel JS builders to emit hero → alert → single stack. Migrate Ajustes markup in `settings-dropdown.html` from button grids to stacks. No new dependencies; no protocol/DB changes.

**Tech stack:** Vanilla CSS custom properties (Hallmark tokens), ESM renderer modules, `public/partials/` + `npm run build:ui`.

**Spec:** [`docs/superpowers/specs/2026-06-24-lan-settings-panel-redesign-design.md`](../specs/2026-06-24-lan-settings-panel-redesign-design.md)

**Critical context:**
- Edit `public/partials/modals/root.html` and `public/partials/modals/settings-dropdown.html` — **not** `public/index.html` (generated).
- After partial/JS edits: `npm run build:ui`.
- Run `npm run metrics:check` before merge; Tier 1 on all touched `.mjs` / CSS.
- Do **not** run full `npm test` during dev.
- Solid accent buttons only for disconnected “Convertirse en host” in ⇄ hero.

**Recommended PR order:** Tasks 1 → 2 → 3 → 4 (LAN visual) → 5 (Ajustes markup) → 6 (polish/docs). Tasks 4 and 5 can split into two PRs.

---

## File map

| File | Responsibility |
| --- | --- |
| `public/styles/settings.css` | Hero, alert strip, `btn-settings-row`, single-column panel root, nav polish |
| `public/partials/modals/root.html` | Remove orphan LWW pref block above panel root |
| `public/partials/modals/settings-dropdown.html` | Ajustes panel markup → stacks |
| `public/js/features/lan/panel-render-once.mjs` | Flat render: hero → alert → stacks |
| `public/js/features/lan/panel-group.mjs` | `appendLanConnectionStack(root)` helper |
| `public/js/features/lan-hub-panel-shell.mjs` | Status hero fragment (not bordered card) |
| `public/js/features/lan/panel-host-pin.mjs` | PIN hero, alert strip, ghost PIN actions |
| `public/js/features/lan/panel-diagnostics.mjs` | Stack-row disclosure summary |
| `public/js/features/lan/host-patients-panel.mjs` | Censo row + ghost Abrir |
| `public/js/features/lan/panel-connection-chrome.mjs` | Wire LWW toggle into panel if needed |
| `public/js/features/settings-help/settings-dropdown.mjs` | No structural change; verify split-pane still works |

---

## Task 1: Shared CSS primitives

**Files:**
- Modify: `public/styles/settings.css` (insert after `.settings-card__toggle` block ~L446)

- [ ] **Step 1:** Add ghost row button:

```css
.btn-settings-row {
  margin: 0;
  padding: 5px 12px;
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-chip);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-settings-row:hover {
  color: var(--text);
  border-color: color-mix(in oklab, var(--action) 30%, var(--border));
  background: var(--state-hover-bg);
}
.btn-settings-row:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-settings-row--warn {
  color: var(--warn);
  border-color: var(--color-warn-border-strong);
}
.btn-settings-row--warn:hover {
  background: var(--color-warn-surface);
}
.btn-settings-row--danger {
  color: var(--error);
  border-color: color-mix(in oklab, var(--error) 35%, var(--border));
}
.btn-settings-row--danger:hover {
  background: var(--color-danger-hover-bg);
}
```

- [ ] **Step 2:** Add section label inside panels:

```css
.settings-section-label {
  margin: 12px 0 6px;
  padding: 0 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}
.settings-section-label:first-child { margin-top: 0; }
```

- [ ] **Step 3:** Add ⇄ hero + alert:

```css
.lan-connection-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 0 4px;
}
.lan-connection-hero__status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}
.lan-connection-hero__pin {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px 12px;
}
.lan-connection-hero__pin-main { min-width: 0; }
.lan-pin-code {
  font-family: var(--font-mono);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text);
  line-height: 1.2;
}
.lan-pin-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.35;
}
.lan-connection-hero__pin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lan-alert-strip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-chip);
  background: var(--color-warn-surface);
  border: 1px solid var(--color-warn-border);
  font-size: 12px;
  line-height: 1.4;
  color: var(--text);
}
.lan-alert-strip--offline {
  background: color-mix(in oklab, var(--text-muted) 8%, var(--surface));
  border-color: var(--border);
}
.lan-alert-strip__copy { min-width: 0; flex: 1; }
.lan-alert-strip__hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}
```

- [ ] **Step 4:** Change `.lan-connection-panel-root` from 2-col grid to single column:

```css
.lan-connection-panel-root {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 100%;
}
```

- [ ] **Step 5:** Run `npm run metrics:check` — expect pass (CSS only).

- [ ] **Step 6:** Commit: `feat(ui): shared settings-row and LAN hero CSS primitives`

---

## Task 2: ⇄ modal shell — move LWW pref into panel

**Files:**
- Modify: `public/partials/modals/root.html`
- Modify: `public/js/features/lan/panel-render-once.mjs`

- [ ] **Step 1:** In `root.html`, remove the `lan-connection-prefs` block (checkbox `settings-lan-lww-toast`) from above `#lan-connection-panel-root`. Keep the checkbox markup in a comment or delete — it will be re-created by JS as a stack toggle row.

- [ ] **Step 2:** Add `appendLanLwwToastRow(stack)` in a new small module `public/js/features/lan/panel-lww-pref.mjs`:

```javascript
import { storage } from '../../storage.js';

export function appendLanLwwToastRow(stack) {
  var row = document.createElement('div');
  row.className = 'settings-card settings-card--toggle';
  row.innerHTML =
    '<div class="settings-card__copy">' +
    '<p class="settings-card__title">Avisar sobrescritura concurrente</p>' +
    '<p class="settings-card__desc">Cuando la sala sobrescribió un cambio concurrente (LWW)</p>' +
    '</div>' +
    '<label class="settings-card__action settings-card__toggle-label" for="settings-lan-lww-toast">' +
    '<input type="checkbox" class="settings-card__toggle" id="settings-lan-lww-toast" checked />' +
    '</label>';
  var cb = row.querySelector('#settings-lan-lww-toast');
  if (cb && typeof storage.getLanLwwToastEnabled === 'function') {
    cb.checked = storage.getLanLwwToastEnabled() !== false;
  }
  cb?.addEventListener('change', function () {
    if (typeof storage.setLanLwwToastEnabled === 'function') {
      storage.setLanLwwToastEnabled(cb.checked);
    }
  });
  stack.appendChild(row);
}
```

- [ ] **Step 3:** Wire import in `panel-render-once.mjs` (call at end of main stack).

- [ ] **Step 4:** `npm run build:ui:check`

- [ ] **Step 5:** Commit: `refactor(ui): move LAN LWW pref into connection stack`

---

## Task 3: LAN hero status + PIN refactor

**Files:**
- Modify: `public/js/features/lan-hub-panel-shell.mjs`
- Modify: `public/js/features/lan/panel-host-pin.mjs`
- Modify: `public/styles/settings.css` (demote old `.lan-shift-pin-card` pill styles)

- [ ] **Step 1:** Refactor `appendLanHubStatusCard` to append to a `.lan-connection-hero` wrapper:

```javascript
export function appendLanHubStatusHero(root, opts) {
  let hero = root.querySelector('.lan-connection-hero');
  if (!hero) {
    hero = document.createElement('div');
    hero.className = 'lan-connection-hero';
    root.prepend(hero);
  }
  const status = document.createElement('div');
  status.className = 'lan-connection-hero__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  // ... existing dot + line logic, no lan-connect-card wrapper
  hero.appendChild(status);
  // disconnected: btn-lan-primary full width ONLY here
  // invite paste: keep textarea in hero below status
}
```

Keep `appendLanHubStatusCard` as thin re-export calling `appendLanHubStatusHero` until all call sites updated.

- [ ] **Step 2:** In `panel-host-pin.mjs`, change `appendLanShiftPinSection` to render into `.lan-connection-hero__pin` instead of `.lan-shift-pin-card`:
  - Remove purple pill classes from `#lan-shift-pin-code`
  - Apply `.lan-pin-code` to code element
  - Change toolbar buttons from `btn-lan-primary` to `btn-settings-row`
  - Expiry text → `.lan-pin-meta`

- [ ] **Step 3:** Remove or override CSS for `.lan-shift-pin-display` purple background in `settings.css` (search `lan-shift-pin`).

- [ ] **Step 4:** Manual smoke: open ⇄ as host — status + mono PIN + ghost Copiar/Nuevo visible; no purple pill.

- [ ] **Step 5:** `npm run test:one -- public/js/lan-sync-wiring.test.mjs`

- [ ] **Step 6:** Commit: `feat(ui): LAN connection hero status and PIN display`

---

## Task 4: LAN unified stack migration

**Files:**
- Modify: `public/js/features/lan/panel-group.mjs`
- Modify: `public/js/features/lan/panel-render-once.mjs`
- Modify: `public/js/features/lan/panel-host-pin.mjs` (turn reset → alert strip)
- Modify: `public/js/features/lan/host-patients-panel.mjs`
- Modify: `public/styles/settings.css` (simplify `.lan-panel-group--*` grid rules for connection modal)

- [ ] **Step 1:** Add helper in `panel-group.mjs`:

```javascript
export function appendLanConnectionStack(root) {
  const stack = document.createElement('div');
  stack.className = 'settings-card-stack lan-connection-stack';
  root.appendChild(stack);
  return stack;
}

export function appendLanAdminStack(root) {
  const stack = document.createElement('div');
  stack.className = 'settings-card-stack lan-connection-stack lan-connection-stack--admin';
  root.appendChild(stack);
  return stack;
}
```

- [ ] **Step 2:** Rewrite `renderLanPanelOnce_` structure:

```javascript
// After guard cards + offline handling:
const heroHost = document.createElement('div');
root.appendChild(heroHost);
appendLanHubStatusHero(heroHost, { ... });

await appendShiftPinSections_(deps, heroHost, gen); // PIN into hero

// Turn reset → alert strip on root (not stack card)
await deps.appendLanTurnResetAlertStrip(root, gen);

const mainStack = appendLanConnectionStack(root);
appendMobileLanSections_(deps, mainStack, hubStatus);
appendElectronDesktopSections_(deps, mainStack, needsInvitePaste);
appendRoomsAndRankSections_(deps, mainStack, ...);

const adminStack = appendLanAdminStack(root);
deps.appendLanHostPinSection(adminStack); // toggle row
await appendPanelFooterSections_(deps, adminStack, gen, ...);
appendLanLwwToastRow(mainStack);
```

- [ ] **Step 3:** Refactor `appendLanTurnResetSection` → `appendLanTurnResetAlertStrip`:
  - When conflict detected: emit `.lan-alert-strip` with warn ghost Restablecer
  - Remove `settings-card-stack lan-turn-reset-card` wrapper for warn state

- [ ] **Step 4:** Refactor `appendOfflineBanner_` in `panel-render-once.mjs` to use `.lan-alert-strip.lan-alert-strip--offline` + ghost Reconectar (same pattern as conflict).

- [ ] **Step 5:** Update `host-patients-panel.mjs`: single stack row with ghost `Abrir` (class `btn-settings-row`), not `btn-lan-primary--compact`.

- [ ] **Step 6:** CSS cleanup — hide or remove connection-modal rules for:
  - `.lan-connection-panel-root` 2-col (already done task 1)
  - `.lan-panel-group--connection.lan-panel-group--stack` 2-col grid
  - `.connection-dropdown-modal .lan-panel-group__title` visually-hidden if groups removed

- [ ] **Step 7:** `npm run build:ui:check && npm run metrics:check`

- [ ] **Step 8:** Manual smoke checklist:
  1. Host + PIN + salas chevron rows
  2. Client (no host) — join flows
  3. Conflict state — alert strip only
  4. R4 — admin stack (diagnostics, censo, QR)
  5. Right edge: only chevron | toggle | ghost per row

- [ ] **Step 9:** Commit: `feat(ui): unified LAN connection stack layout`

---

## Task 5: Ajustes panel markup migration

**Files:**
- Modify: `public/partials/modals/settings-dropdown.html`
- Modify: `public/styles/settings.css` (narrow `.settings-acc-btn-grid` usage)

- [ ] **Step 1: Laboratorio panel** — replace button with stack:

```html
<div class="settings-card-stack">
  <div class="settings-card">
    <div class="settings-card__copy">
      <p class="settings-card__title">Duplicados en historial de labs</p>
      <p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">Misma fecha, hora y bloques — conserva la copia más antigua.</p>
    </div>
    <div class="settings-card__action">
      <button type="button" class="btn-settings-row" onclick="openLabHistoryDedupeReview('all')">Revisar…</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Documentos panel** — wrap carpeta + select + toggle + censo in one `settings-card-stack`; checkbox → `settings-card--toggle` row (remove inline styles).

- [ ] **Step 3: Respaldos panel** — replace `settings-acc-btn-grid` blocks with labeled groups:

```html
<p class="settings-section-label">Exportar</p>
<div class="settings-card-stack">
  <div class="settings-card">… copia completa … <button class="btn-settings-row" onclick="exportDataBackup()">Exportar…</button></div>
  <div class="settings-card">… paciente actual …</div>
  <div class="settings-card">… rango …</div>
  <div class="settings-card">… bitácora …</div>
</div>
<p class="settings-section-label">Importar</p>
<div class="settings-card-stack">… mirror import rows …</div>
```

Keep `settings-data-sync-compare` intro cards unchanged.

- [ ] **Step 4: Rendimiento** — GPU checkbox → `settings-card--toggle` row.

- [ ] **Step 5: Plantillas** — three stack rows with `btn-settings-row`.

- [ ] **Step 6: Privacidad** — stack rows; wipe button → `btn-settings-row btn-settings-row--danger`.

- [ ] **Step 7: Aplicación** — toggles + ghost rows for update actions; keep downgrade `<select>` block inside stack.

- [ ] **Step 8:** `npm run build:ui` then `npm run build:ui:check`

- [ ] **Step 9:** Manual smoke: open Ajustes → each nav section scrolls cleanly; Respaldos has no purple button wall.

- [ ] **Step 10:** Commit: `feat(ui): Ajustes panel unified stack rows`

---

## Task 6: Nav polish + docs + verification

**Files:**
- Modify: `public/styles/settings.css` (`.settings-nav-item` font-size 12px, padding 8px)
- Modify: `.cursor/rules/project-context.mdc` (changelog line)
- Modify: `docs/logs/agent-changelog.md` (session wrap-up)

- [ ] **Step 1:** Nav polish:

```css
.settings-nav-item {
  font-size: 12px;
  padding: 8px 10px;
}
```

- [ ] **Step 2:** Grep `settings-dropdown.html` for `btn-edit-templates` — should be **zero** except if any remain in hidden admin-only LAN accordion (migrate those too).

- [ ] **Step 3:** `npm run metrics:check` — must pass; no boot-graph regression.

- [ ] **Step 4:** `npm run test:one -- public/js/lan-sync-wiring.test.mjs`

- [ ] **Step 5:** Update `project-context.mdc` changelog:

```markdown
- **2026-06-24** `ui-lan-settings`: ⇄ hero + unified stack rows; Ajustes panel ghost rows — `settings.css`, `panel-render-once.mjs`, `settings-dropdown.html`.
```

- [ ] **Step 6:** Append `docs/logs/agent-changelog.md` entry.

- [ ] **Step 7:** Commit: `docs(context): LAN + Ajustes panel redesign shipped`

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Hero status + mono PIN | 3 |
| Alert strip (conflict, offline) | 4 |
| Single main stack + admin stack | 4 |
| LWW toggle in stack | 2 |
| Row grammar (chevron/toggle/ghost) | 1, 4, 5 |
| Apariencia unchanged | 5 (no touch) |
| Respaldos grouped stacks | 5 |
| Nav 12px polish | 6 |
| No protocol changes | — |
| metrics:check | 1, 4, 6 |

---

## Out of scope (do not implement)

- Tabbed LAN hub
- Two-column LAN dashboard
- New LAN features or rank logic changes
- Committing `.superpowers/brainstorm/` mockups

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-24-lan-settings-panel-redesign.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach do you want?
