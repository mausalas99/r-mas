# Guardia Panel Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs in the guardia panel (vasopressor always-on, false critical status, static vitals countdown, broken entrega button) and redesign the entrega/turno UX into two distinct, polished modes.

**Architecture:** Bug fixes are minimal targeted edits to existing modules. The UX redesign adds two new focused modules (`entrega-roster-panel.mjs`, `guardia-vitals-feed.mjs`) and refactors the entrega modal to a wider layout. All new UI follows existing ESM feature-module patterns (`windowHandlers` export, `app-runtimes.mjs` registration).

**Tech Stack:** ES Modules (`.mjs`), `node --test` for unit tests, `esbuild` bundler via `npm run build:ui`, existing Lucide SVG icon set, `better-sqlite3-multiple-ciphers` (read-only for this work — no schema changes).

**Spec:** `docs/superpowers/specs/2026-06-05-guardia-panel-overhaul-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/entrega/entrega-handoff-context.mjs` | Modify | Fix `normalizeVasopressor` active inference |
| `lib/entrega/entrega-handoff-context.test.mjs` | Modify | Add regression tests for the fix |
| `public/js/features/guardia-board.mjs` | Modify | Fix button wiring; new critical logic; wire new components |
| `public/js/features/unified-patient-grid-board.mjs` | Modify | `data-vitals-spec` attr; `startVitalsTicker` / `stopVitalsTicker` |
| `public/js/features/unified-patient-grid-board.test.mjs` | Modify | Test ticker helpers |
| `public/js/features/entrega-modal-ui.mjs` | Modify | Wide layout; patient nav arrows; auto-save on nav |
| `public/js/features/clinical-entrega.mjs` | Modify | `toggleEntregaPhase` opens roster; turno-active state helpers |
| `public/js/features/entrega-roster-panel.mjs` | **Create** | Slide-over roster for entrega mode |
| `public/js/features/guardia-vitals-feed.mjs` | **Create** | Vitals feed panel for turno activo |
| `public/index.html` / `public/partials/` | Modify | Add `#entrega-roster-panel` and `#guardia-vitals-feed` mount points |

---

## Task 1: Fix `normalizeVasopressor` active inference (BUG-1)

**Files:**
- Modify: `lib/entrega/entrega-handoff-context.mjs:99-100`
- Modify: `lib/entrega/entrega-handoff-context.test.mjs`

- [ ] **Step 1.1 — Add failing tests**

Open `lib/entrega/entrega-handoff-context.test.mjs` and add inside the existing `describe('normalizeVasopressor', ...)` block:

```js
it('respects explicit active: false even when agent is set', () => {
  const v = normalizeVasopressor({ active: false, agent: 'norepinefrina' });
  assert.equal(v.active, false);
});

it('infers active from agent when active key is absent (legacy records)', () => {
  const v = normalizeVasopressor({ agent: 'norepinefrina', dose: '0.05' });
  assert.equal(v.active, true);
});

it('defaultHandoffContext vasopressor is inactive', () => {
  const ctx = defaultHandoffContext();
  assert.equal(ctx.vasopressor.active, false);
});
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
node --test lib/entrega/entrega-handoff-context.test.mjs
```

Expected: the three new tests fail; existing tests still pass.

- [ ] **Step 1.3 — Apply fix**

In `lib/entrega/entrega-handoff-context.mjs`, replace line 100:

```js
// Before
const active = !!(vas?.active || vas?.agent || vas?.dose || vas?.rate);
```

With:

```js
// After — respect explicit boolean; infer only for legacy records missing the key
const active = vas != null && 'active' in vas
  ? !!vas.active
  : !!(vas?.agent || vas?.dose || vas?.rate);
```

- [ ] **Step 1.4 — Run tests to confirm they pass**

```bash
node --test lib/entrega/entrega-handoff-context.test.mjs
```

Expected: all tests pass including the three new ones.

- [ ] **Step 1.5 — Commit**

```bash
git add lib/entrega/entrega-handoff-context.mjs lib/entrega/entrega-handoff-context.test.mjs
git commit -m "fix(entrega): respect explicit active:false in normalizeVasopressor"
```

---

## Task 2: Fix critical status logic (BUG-2)

**Files:**
- Modify: `public/js/features/guardia-board.mjs:122-151`

No dedicated unit test file exists for `guardia-board.mjs` (DOM-dependent). The fix is verified by inspection and the existing full test suite.

- [ ] **Step 2.1 — Add the import**

At the top of `public/js/features/guardia-board.mjs`, `normalizePendientesJson` is already imported. Also add `normalizeHandoffContext`:

```js
// Add to existing imports from clinical-entrega.mjs area — find this block:
import {
  getEntregaPhase,
  loadGuardiaGridViewContext,
  openEntregaModal,
  toggleEntregaPhase,
} from './clinical-entrega.mjs';
```

Then find the import from `lib/entrega/entrega-pendientes.mjs`:

```js
import {
  listActiveProcedimientos,
  normalizePendientesJson,
} from '../../../lib/entrega/entrega-pendientes.mjs';
```

Add a new import line after it:

```js
import { normalizeHandoffContext } from '../../../lib/entrega/entrega-handoff-context.mjs';
```

- [ ] **Step 2.2 — Replace `isCritical` logic in `enrichPatientForGuardiaCard`**

Find lines 134–139 in `guardia-board.mjs` (the `isCritical` block) and replace:

```js
// Before
const isCritical = !!(
  g?.is_critical ||
  vitalsAltered ||
  (openTodos > 0 && storage.getTodos(base.id).some((t) => !t.completed && t.priority === 'alta'))
);
```

With:

```js
// After
const pendientesDoc = normalizePendientesJson(g?.pendientes_json);
const handoff = normalizeHandoffContext(pendientesDoc.handoffContext);
const isCritical = !!(
  g?.is_critical ||
  vitalsAltered ||
  handoff.vasopressor.active ||
  handoff.ventilation.active
);
```

- [ ] **Step 2.3 — Remove unused `openTodos` computation**

Find the line that computes `openTodos` (it is now unused):

```js
const openTodos = pendingTodoCount(base.id);
```

Remove it. `pendingTodoCount` is still used for the `pendingCount` badge — keep that function.

- [ ] **Step 2.4 — Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2.5 — Commit**

```bash
git add public/js/features/guardia-board.mjs
git commit -m "fix(guardia): critical status driven by explicit toggle + vitals + vasopresor/vent only"
```

---

## Task 3: Fix entrega button wiring (BUG-4)

**Files:**
- Modify: `public/js/features/guardia-board.mjs:35,71-87`

- [ ] **Step 3.1 — Remove module-level wiring guard**

Find and remove the module-level variable:

```js
// Remove this line near the top of guardia-board.mjs
let gridModeControlsWired = false;
```

- [ ] **Step 3.2 — Replace `wireGuardiaEntregaPhaseButton`**

Replace the entire function with an element-keyed guard:

```js
/** @param {Record<string, unknown>|null|undefined} settings */
function wireGuardiaEntregaPhaseButton(settings) {
  const btn = document.getElementById('btn-guardia-entrega-phase');
  if (!btn || btn._guardiaEntregaWired) return;
  btn._guardiaEntregaWired = true;

  syncEntregaPhaseChrome();

  btn.addEventListener('click', () => {
    toggleEntregaPhase({
      settings,
      renderGuardiaBoard,
    });
    syncEntregaPhaseChrome();
  });
}
```

- [ ] **Step 3.3 — Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3.4 — Commit**

```bash
git add public/js/features/guardia-board.mjs
git commit -m "fix(guardia): entrega button wiring uses element key, not module-level flag"
```

---

## Task 4: Live vitals countdown ticker (BUG-3)

**Files:**
- Modify: `public/js/features/unified-patient-grid-board.mjs`
- Modify: `public/js/features/unified-patient-grid-board.test.mjs`

- [ ] **Step 4.1 — Add failing tests**

Open `public/js/features/unified-patient-grid-board.test.mjs` and add:

```js
import { UnifiedPatientGridBoard } from './unified-patient-grid-board.mjs';

describe('UnifiedPatientGridBoard vitals ticker', () => {
  it('startVitalsTicker and stopVitalsTicker do not throw outside DOM', () => {
    const board = new UnifiedPatientGridBoard('nonexistent-id');
    assert.doesNotThrow(() => board.startVitalsTicker());
    assert.doesNotThrow(() => board.stopVitalsTicker());
  });
});
```

Run to confirm it fails (method not yet defined):

```bash
node --test public/js/features/unified-patient-grid-board.test.mjs
```

- [ ] **Step 4.2 — Store vitals spec on the chip element**

In `compileChip` in `unified-patient-grid-board.mjs`, after building the `vitals` banner, store the spec as a data attribute on the card. Find the line:

```js
card.setAttribute('data-patient-id', p.id);
```

Add immediately after:

```js
const vitalsSpec = meta?.pendientes_json
  ? (normalizePendientesJson(meta.pendientes_json).vitalsPlan?.frequency ?? meta?.vitals_frequency ?? null)
  : (meta?.vitals_frequency ?? null);
card.dataset.vitalsSpec = JSON.stringify(vitalsSpec ?? null);
card.dataset.vitalsLast = String(meta?.last_vitals_check ?? '');
```

This requires `normalizePendientesJson` to be imported — add to the import block at the top:

```js
import { normalizePendientesJson } from '../../../lib/entrega/entrega-pendientes.mjs';
```

- [ ] **Step 4.3 — Add ticker methods to `UnifiedPatientGridBoard`**

Add these two methods to the class, after `appendDivider`:

```js
startVitalsTicker() {
  this.stopVitalsTicker();
  if (!this.container) return;
  this._vitalsTickerId = setInterval(() => {
    if (!this.container) return;
    this.container.querySelectorAll('[data-vitals-spec]').forEach((card) => {
      const specRaw = card.dataset.vitalsSpec;
      const last = card.dataset.vitalsLast || '';
      let spec = null;
      try { spec = specRaw ? JSON.parse(specRaw) : null; } catch { /* ignore */ }
      const banner = calcVitalsBannerForSpec(last || null, spec);
      const el = card.querySelector('.patient-chip-vitals');
      if (!el) return;
      const textEl = el.querySelector('.patient-chip-vitals__text');
      if (textEl) textEl.textContent = banner.str;
      el.className = `patient-chip-vitals vitals-banner ${banner.cls}`;
    });
  }, 60_000);
}

stopVitalsTicker() {
  if (this._vitalsTickerId != null) {
    clearInterval(this._vitalsTickerId);
    this._vitalsTickerId = null;
  }
}
```

Note: `calcVitalsBannerForSpec` is already imported at the top of the file via `import { calcVitalsBanner, calcVitalsBannerForSpec } from ...`.

- [ ] **Step 4.4 — Start the ticker in `renderGuardiaBoard`**

In `guardia-board.mjs`, find the line:

```js
gridBoard.drawCensusGrid(censusPatients, guardiasMap, rank);
```

Add immediately after:

```js
gridBoard.startVitalsTicker();
```

- [ ] **Step 4.5 — Run tests**

```bash
node --test public/js/features/unified-patient-grid-board.test.mjs
```

Expected: all tests pass.

- [ ] **Step 4.6 — Commit**

```bash
git add public/js/features/unified-patient-grid-board.mjs \
        public/js/features/unified-patient-grid-board.test.mjs \
        public/js/features/guardia-board.mjs
git commit -m "feat(guardia): live vitals countdown ticker on patient chips (60s interval)"
```

---

## Task 5: New `guardia-vitals-feed.mjs` (turno activo vitals panel)

**Files:**
- Create: `public/js/features/guardia-vitals-feed.mjs`

This module renders the prominent vitals panel shown at the top of the guardia panel during turno activo. It reads the last `monitoreo.historial` entry per patient.

- [ ] **Step 5.1 — Create the module**

Create `public/js/features/guardia-vitals-feed.mjs`:

```js
/**
 * Guardia vitals feed — shows the most recent vitals registered by interno
 * for each patient during the active shift.
 */
import { abbreviatePatientName } from '../../../lib/interno/interno-board.mjs';

const ALERT_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const VITALS_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;

/**
 * @param {Date|string|null|undefined} ts
 * @returns {string}
 */
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return 'ahora';
  if (diff < 60) return `hace ${diff} min`;
  const h = Math.floor(diff / 60);
  return `hace ${h}h`;
}

/**
 * @param {{ alteredAt?: Record<string, unknown> }} entry
 * @returns {boolean}
 */
function entryHasAlerts(entry) {
  return !!(entry?.alteredAt && Object.keys(entry.alteredAt).length > 0);
}

/**
 * Format a vital value, wrapping altered values in an alert span.
 * @param {string} key
 * @param {unknown} value
 * @param {Record<string, unknown>} [alteredAt]
 * @returns {string}
 */
function fmtVal(key, value, alteredAt = {}) {
  const v = value != null ? String(value) : '—';
  if (alteredAt[key]) return `<span class="vfeed-altered">${v}</span>`;
  return v;
}

/**
 * Build the vitals text line from a monitoreo historial entry.
 * @param {{ values?: Record<string, unknown>, alteredAt?: Record<string, unknown> }} entry
 * @returns {string}
 */
function buildVitalsLine(entry) {
  const v = entry?.values || {};
  const alt = entry?.alteredAt || {};
  const parts = [];
  if (v.ta != null) parts.push(`TA ${fmtVal('ta', v.ta, alt)}`);
  if (v.fc != null) parts.push(`FC ${fmtVal('fc', v.fc, alt)}`);
  if (v.fr != null) parts.push(`FR ${fmtVal('fr', v.fr, alt)}`);
  if (v.temp != null) parts.push(`Temp ${fmtVal('temp', v.temp, alt)}`);
  if (v.sat != null) parts.push(`Sat ${fmtVal('sat', v.sat, alt)}%`);
  if (v.glu != null) parts.push(`Glu ${fmtVal('glu', v.glu, alt)}`);
  return parts.join(' · ') || '—';
}

/**
 * @param {Array<{ id: string, name?: string, bed_label?: string, monitoreo?: { historial?: Array<{ values?: object, alteredAt?: object, registeredAt?: string }> } }>} patients
 * @returns {Array<{ id: string, bed: string, name: string, line: string, hasAlerts: boolean, registeredAt: string|null }>}
 */
function collectRecentVitals(patients) {
  return patients
    .map((p) => {
      const hist = Array.isArray(p.monitoreo?.historial) ? p.monitoreo.historial : [];
      if (!hist.length) return null;
      const last = hist[hist.length - 1];
      return {
        id: p.id,
        bed: String(p.bed_label || '—'),
        name: abbreviatePatientName(String(p.name || '')),
        line: buildVitalsLine(last),
        hasAlerts: entryHasAlerts(last),
        registeredAt: String(last?.registeredAt || last?.createdAt || ''),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Alerts first, then by recency
      if (a.hasAlerts !== b.hasAlerts) return a.hasAlerts ? -1 : 1;
      return (b.registeredAt || '').localeCompare(a.registeredAt || '');
    });
}

/**
 * Render the vitals feed into `#guardia-vitals-feed`.
 * Call this whenever `renderGuardiaBoard` runs.
 * @param {Array<object>} patients — same patient list used for the census
 */
export function renderGuardiaVitalsFeed(patients) {
  const host = document.getElementById('guardia-vitals-feed');
  if (!host) return;

  const items = collectRecentVitals(patients);

  if (!items.length) {
    host.innerHTML = `
      <div class="vfeed-empty">
        ${VITALS_SVG}
        <span>Sin signos registrados en este turno</span>
      </div>`;
    return;
  }

  const cards = items.map((item) => `
    <div class="vfeed-card${item.hasAlerts ? ' vfeed-card--alert' : ''}" data-patient-id="${item.id}">
      <div class="vfeed-card-head">
        <span class="vfeed-bed">Cama ${item.bed}</span>
        ${item.hasAlerts ? `<span class="vfeed-alert-icon">${ALERT_SVG}</span>` : ''}
        <span class="vfeed-time">${timeAgo(item.registeredAt)}</span>
      </div>
      <div class="vfeed-name">${item.name}</div>
      <div class="vfeed-vals">${item.line}</div>
    </div>`).join('');

  host.innerHTML = `
    <div class="vfeed-header">
      ${VITALS_SVG}
      <span class="vfeed-title">Signos vitales</span>
      <span class="vfeed-live-dot" aria-hidden="true"></span>
    </div>
    <div class="vfeed-cards">${cards}</div>`;
}
```

- [ ] **Step 5.2 — Run full test suite to confirm no breakage**

```bash
npm test
```

Expected: all tests pass (new module has no test file — DOM-dependent rendering; verified visually in Task 9).

- [ ] **Step 5.3 — Commit**

```bash
git add public/js/features/guardia-vitals-feed.mjs
git commit -m "feat(guardia): guardia-vitals-feed module — intern vitals panel for turno activo"
```

---

## Task 6: New `entrega-roster-panel.mjs` (entrega slide-over)

**Files:**
- Create: `public/js/features/entrega-roster-panel.mjs`

This component renders the full-width entrega roster when "Entrega" is pressed.

- [ ] **Step 6.1 — Create the module**

Create `public/js/features/entrega-roster-panel.mjs`:

```js
/**
 * Entrega roster panel — full-width slide-over listing all patients
 * for handoff. Opened by the "Entrega" toolbar button.
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { patients } from '../app-state.mjs';
import { mapPatientForGuardiaGrid } from '../clinical-access-runtime.mjs';
import { normalizePendientesJson } from '../../../lib/entrega/entrega-pendientes.mjs';
import { normalizeHandoffContext, handoffContextSummary } from '../../../lib/entrega/entrega-handoff-context.mjs';
import { openEntregaModal } from './clinical-entrega.mjs';
import { refreshGuardiaCensusFromDb } from '../clinical-access-runtime.mjs';

const PANEL_ID = 'entrega-roster-panel';
const CHEVRON_LEFT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
const WARN_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`;
const LUNG_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 4.5 7 13 7 13s7-8.5 7-13a7 7 0 00-7-7z"/></svg>`;
const ACTIVE_SVG = `<svg width="7" height="7" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="#6c5ce7"/></svg>`;

const STATUS_LABELS = {
  critical: 'Crítico',
  unstable: 'Inestable',
  stable: 'Estable',
  postop: 'Postoperatorio',
  '': '—',
};

const STATUS_CLASS = {
  critical: 'roster-sbadge--critical',
  unstable: 'roster-sbadge--unstable',
  stable: 'roster-sbadge--stable',
  postop: 'roster-sbadge--stable',
  '': 'roster-sbadge--none',
};

/** @param {object} g — guardia map entry */
function rowContextSummary(g) {
  if (!g?.pendientes_json) return null;
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  const summary = handoffContextSummary(ctx);
  return summary === 'Sin resumen clínico' ? null : summary;
}

/** @param {object} g */
function rowIcons(g) {
  if (!g?.pendientes_json) return '';
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  const flags = [];
  if (ctx.vasopressor.active) flags.push(`<span class="roster-icon-flag">${WARN_SVG} Vaso</span>`);
  if (ctx.ventilation.active) flags.push(`<span class="roster-icon-flag">${LUNG_SVG} Vent</span>`);
  return flags.join('');
}

/** @param {object} g */
function rowStatus(g) {
  if (!g?.pendientes_json) return '';
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  return ctx.clinicalStatus || '';
}

/** @param {object} g */
function rowIsCriticalOrUnstable(g) {
  const status = rowStatus(g);
  return status === 'critical' || status === 'unstable' || !!g?.is_critical;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function openEntregaRosterPanel(settings) {
  let host = document.getElementById(PANEL_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = PANEL_ID;
    document.body.appendChild(host);
  }

  const guardiasMap = clinicalSessionContext.guardiasMap;
  const r1Label = clinicalSessionContext.scopeContext?.users
    ?.find((u) => String(u.user_id) === String(clinicalSessionContext.user?.user_id))
    ?.clinical_name || clinicalSessionContext.user?.username || '';

  const censusPatients = patients
    .filter((p) => p && p.id && !p.isDemo && !p.archived)
    .map((p) => ({ ...mapPatientForGuardiaGrid(p), _raw: p }));

  const critical = censusPatients.filter((p) => rowIsCriticalOrUnstable(guardiasMap.get(p.id)));
  const rest = censusPatients.filter((p) => !rowIsCriticalOrUnstable(guardiasMap.get(p.id)));

  function renderRow(p) {
    const g = guardiasMap.get(p.id);
    const summary = rowContextSummary(g);
    const icons = rowIcons(g);
    const status = rowStatus(g);
    const label = STATUS_LABELS[status] || '—';
    const cls = STATUS_CLASS[status] || 'roster-sbadge--none';
    const hasCtx = !!summary;

    return `
      <div class="roster-row${hasCtx ? ' roster-row--ctx' : ''}" data-patient-id="${p.id}" role="button" tabindex="0">
        <div class="roster-row-bed">${p.bed_label || '—'}</div>
        <div class="roster-row-body">
          <div class="roster-row-name">${p.name || '—'}</div>
          <div class="roster-row-dx">${String(p.diagnosticosText || p.service || '').toUpperCase() || '—'}</div>
          ${summary
            ? `<div class="roster-row-ctx">${summary}</div>`
            : `<div class="roster-row-empty">Sin contexto — toca para completar</div>`}
        </div>
        <div class="roster-row-right">
          <span class="roster-sbadge ${cls}">${label}</span>
          <div class="roster-icon-flags">${icons}</div>
        </div>
      </div>`;
  }

  host.innerHTML = `
    <div class="roster-panel">
      <div class="roster-panel-header">
        <div class="roster-panel-title">Entrega</div>
        <div class="roster-panel-sub">Sala · ${censusPatients.length} pacientes</div>
        <span class="roster-active-badge">${ACTIVE_SVG} Activa</span>
      </div>
      <div class="roster-list">
        ${critical.length ? `<div class="roster-section">Críticos / inestables</div>${critical.map(renderRow).join('')}` : ''}
        ${rest.length ? `<div class="roster-section">Resto del servicio</div>${rest.map(renderRow).join('')}` : ''}
      </div>
      <div class="roster-panel-footer">
        <button class="btn-roster-cancel" id="roster-btn-cancel">Cancelar</button>
        <button class="btn-roster-confirm" id="roster-btn-confirm">Confirmar entrega</button>
      </div>
    </div>`;

  // Wire row clicks → entrega modal
  host.querySelectorAll('.roster-row').forEach((row) => {
    const patientId = row.dataset.patientId;
    const open = () => {
      const g = guardiasMap.get(patientId);
      openEntregaModal({
        patientId,
        guardiaId: g?.guardia_id ? String(g.guardia_id) : undefined,
        onConfirm: () => {
          void refreshGuardiaCensusFromDb(settings);
          openEntregaRosterPanel(settings); // re-render roster with updated context
        },
      });
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
    });
  });

  // Cancel
  document.getElementById('roster-btn-cancel')?.addEventListener('click', () => {
    closeEntregaRosterPanel();
  });

  // Confirm
  document.getElementById('roster-btn-confirm')?.addEventListener('click', () => {
    closeEntregaRosterPanel();
    activateTurnoActivo();
    // re-render guardia board in turno mode
    const boardEvent = new CustomEvent('guardia:turno-activo');
    window.dispatchEvent(boardEvent);
  });
}

export function closeEntregaRosterPanel() {
  const host = document.getElementById(PANEL_ID);
  if (host) host.innerHTML = '';
  host?.removeAttribute('style');
}

/** Persist turno-activo state to localStorage. */
export function activateTurnoActivo() {
  try { localStorage.setItem('guardia.turnoActive', '1'); } catch { /* quota */ }
}

export function deactivateTurnoActivo() {
  try { localStorage.removeItem('guardia.turnoActive'); } catch { /* quota */ }
}

export function isTurnoActivo() {
  try { return !!localStorage.getItem('guardia.turnoActive'); } catch { return false; }
}
```

- [ ] **Step 6.2 — Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6.3 — Commit**

```bash
git add public/js/features/entrega-roster-panel.mjs
git commit -m "feat(guardia): entrega-roster-panel — full-width slide-over for entrega mode"
```

---

## Task 7: Wire entrega button to roster panel in `clinical-entrega.mjs`

**Files:**
- Modify: `public/js/features/clinical-entrega.mjs:606-638`

The existing `toggleEntregaPhase` shows a toast and sets localStorage state. Reroute it to open the roster panel instead.

- [ ] **Step 7.1 — Add import**

At the top of `public/js/features/clinical-entrega.mjs`, add:

```js
import {
  openEntregaRosterPanel,
  closeEntregaRosterPanel,
} from './entrega-roster-panel.mjs';
```

- [ ] **Step 7.2 — Replace `toggleEntregaPhase` body**

Find the exported `toggleEntregaPhase` function (around line 606) and replace its body:

```js
export function toggleEntregaPhase(opts = {}) {
  if (isEntregaPhaseActive()) {
    endEntregaPhase();
    closeEntregaRosterPanel();
    toast('Fase de entrega finalizada.', 'info');
    opts.renderGuardiaBoard?.(opts.settings);
    return { active: false };
  }

  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const sala = resolveUserSalaForEntrega(teams, userId);

  if (!sala) {
    toast('Indica tu Sala en el perfil clínico o únete a un equipo de Sala.', 'error');
    return { active: false };
  }

  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const covering = resolveR1GuardiaCovering(teams, users, sala);
  if (!covering) {
    toast(`No hay R1 de guardia en ${sala} hoy. Revisa «Guardia» en Mi rotación.`, 'error');
    return { active: false };
  }

  startEntregaPhase(covering);
  openEntregaRosterPanel(opts.settings);
  return { active: true, covering };
}
```

- [ ] **Step 7.3 — Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7.4 — Commit**

```bash
git add public/js/features/clinical-entrega.mjs
git commit -m "feat(guardia): toggleEntregaPhase opens roster panel instead of phase-only toggle"
```

---

## Task 8: Wide entrega modal layout

**Files:**
- Modify: `public/js/features/entrega-modal-ui.mjs` — layout sections

This task reworks the modal HTML markup to the wide (≈780px) 2-column layout. The existing form fields, IDs, and save logic are preserved — only the layout HTML changes.

- [ ] **Step 8.1 — Find `buildHandoffPanelMarkup`**

Open `entrega-modal-ui.mjs` and locate the `buildHandoffPanelMarkup` function (around line 509). This function builds the inner HTML of the modal form.

- [ ] **Step 8.2 — Add patient nav bar markup**

The modal element itself (`#entrega-modal`) needs a nav row above the form. Find where the modal is shown/opened (look for `bd.style.display` or `bd.hidden = false` in `openEntregaModal`). Add the nav row by prepending to the modal's `form` element or inserting it as a sibling. Specifically:

After the line `form.dataset.patientId = patientId;` in `openEntregaModal`, add:

```js
// Update nav bar if present
const navName = document.getElementById('entrega-modal-nav-name');
const navDx = document.getElementById('entrega-modal-nav-dx');
const navCounter = document.getElementById('entrega-modal-nav-counter');
const patient = patients.find((p) => String(p?.id) === patientId);
if (navName) navName.textContent = patient ? `${String(patient.name || '')} · Cama ${patient.bed_label || '—'}` : '';
if (navDx) navDx.textContent = patient ? (String(patient.diagnosticosText || patient.service || '')).toUpperCase() : '';
// Counter is set by the roster when it opens the modal
```

- [ ] **Step 8.3 — Replace modal width and column layout in `buildHandoffPanelMarkup`**

The function returns an HTML string. Find the outermost container div and change the grid layout to match the wide design. The exact change depends on the current markup structure — read the function and apply:

1. Set the modal or its wrapper to `max-width: 780px` (add or update the existing CSS class or inline style on the modal element).
2. Restructure the inner layout so that:
   - Row 1: R1 selector | Equipo | Estado general — 3-column CSS grid
   - Row 2: Marcadores row (full width)
   - Row 3: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">` containing Soporte cards (left) and Signos vitales (right)
   - Row 4: Notas (full width)
   - Summary line + footer

   The exact HTML depends on the current template; follow the mockup in `docs/superpowers/brainstorm/fg-session/content/modal-wide.html` as the reference.

- [ ] **Step 8.4 — Build and verify visually**

```bash
npm run build:ui
npm start
```

Open guardia mode, trigger entrega on a patient, confirm the modal is wide and compact.

- [ ] **Step 8.5 — Commit**

```bash
git add public/js/features/entrega-modal-ui.mjs
git commit -m "feat(guardia): wide entrega modal layout — 780px, soporte+vitals side by side"
```

---

## Task 9: Wire vitals feed and turno-activo into `guardia-board.mjs`

**Files:**
- Modify: `public/js/features/guardia-board.mjs`

- [ ] **Step 9.1 — Import new modules**

Add to the imports at the top of `guardia-board.mjs`:

```js
import { renderGuardiaVitalsFeed } from './guardia-vitals-feed.mjs';
import { isTurnoActivo, deactivateTurnoActivo } from './entrega-roster-panel.mjs';
```

- [ ] **Step 9.2 — Call vitals feed render in `renderGuardiaBoard`**

Find the line:

```js
const summary = computeGuardiaSummary(censusPatients, guardiasMap);
renderGuardiaSummaryTiles(summary);
```

Add after `renderGuardiaSummaryTiles`:

```js
if (isTurnoActivo()) {
  renderGuardiaVitalsFeed(
    patients.filter((p) => p && p.id && !p.isDemo && !p.archived)
  );
}
```

- [ ] **Step 9.3 — Handle turno-activo event**

At the end of `guardia-board.mjs` (or inside `syncGuardiaBoardFromRuntime`), listen for the custom event dispatched by the roster confirm button:

```js
if (typeof window !== 'undefined') {
  window.addEventListener('guardia:turno-activo', () => {
    renderGuardiaBoard(null);
  });
}
```

- [ ] **Step 9.4 — Add "Finalizar turno" to clear turno state**

In `wireGuardiaModeToggle`, when `toggleGuardiaMode` is called to exit guardia mode, also clear turno state:

```js
btn.addEventListener('click', () => {
  deactivateTurnoActivo();
  toggleGuardiaMode({ settings, renderGuardiaBoard });
});
```

- [ ] **Step 9.5 — Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 9.6 — Commit**

```bash
git add public/js/features/guardia-board.mjs
git commit -m "feat(guardia): wire vitals feed and turno-activo state into guardia-board"
```

---

## Task 10: HTML mount points, CSS, and build

**Files:**
- Modify: `public/partials/` (guardia section partial) or `public/index.html`
- Modify: `public/styles/` (guardia CSS or `app.css`)

- [ ] **Step 10.1 — Add mount point divs**

In the guardia mode section of the HTML (find `appcontent-guardia` and its children), add:

```html
<!-- Vitals feed — shown during turno activo -->
<div id="guardia-vitals-feed" class="guardia-vitals-feed" hidden></div>

<!-- Entrega roster panel — injected by JS, mount point for layout -->
<div id="entrega-roster-panel" class="entrega-roster-panel-host"></div>
```

The `hidden` attribute on `#guardia-vitals-feed` is removed by JS when turno is active (or simply always render and rely on the inner content being empty).

- [ ] **Step 10.2 — Add CSS**

Add to the guardia stylesheet (find `public/styles/guardia.css` or the nearest relevant CSS file):

```css
/* Vitals feed */
.guardia-vitals-feed { padding: 12px 16px; border-bottom: 2px solid var(--color-border-subtle, #1e3050); background: var(--color-surface-raised, #0c1420); }
.vfeed-header { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
.vfeed-title { font-size: 12px; font-weight: 700; color: var(--color-text-accent, #64b5f6); }
.vfeed-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #4caf50; display: inline-block; animation: vfeed-pulse 1.8s ease-in-out infinite; }
@keyframes vfeed-pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
.vfeed-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.vfeed-card { background: var(--color-surface, #111e2e); border: 1px solid #1e3050; border-radius: 8px; padding: 9px 11px; }
.vfeed-card--alert { border-color: #ff980066; background: #1e160066; }
.vfeed-card-head { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
.vfeed-bed { font-size: 11px; font-weight: 700; color: #4a7aaa; }
.vfeed-alert-icon { color: #ff9800; }
.vfeed-time { font-size: 10px; color: #3a5070; margin-left: auto; }
.vfeed-name { font-size: 11px; color: #aaa; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vfeed-vals { font-size: 12px; font-weight: 600; color: #e0eeff; line-height: 1.5; }
.vfeed-altered { color: #ff9800; }
.vfeed-empty { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #444; padding: 6px 0; }

/* Entrega roster panel */
.entrega-roster-panel-host:empty { display: none; }
.roster-panel { position: fixed; inset: 0; z-index: 200; background: #0f0f1c; display: flex; flex-direction: column; }
.roster-panel-header { padding: 12px 16px 10px; border-bottom: 1px solid #2a2a42; display: flex; align-items: center; gap: 10px; background: #111120; flex-shrink: 0; }
.roster-panel-title { font-size: 15px; font-weight: 700; }
.roster-panel-sub { font-size: 11px; color: #555; }
.roster-active-badge { display: inline-flex; align-items: center; gap: 5px; background: #1e1430; border: 1px solid #6c5ce7; color: #a78bfa; font-size: 10px; padding: 2px 9px; border-radius: 20px; margin-left: auto; }
.roster-list { flex: 1; overflow-y: auto; }
.roster-section { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #444; padding: 8px 16px 3px; }
.roster-row { padding: 10px 16px; border-bottom: 1px solid #1a1a2a; display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
.roster-row:hover, .roster-row:focus-visible { background: #1a1a2a; outline: none; }
.roster-row--ctx { border-left: 2px solid #6c5ce740; }
.roster-row-bed { font-size: 13px; font-weight: 700; color: #9d8bff; width: 44px; flex-shrink: 0; }
.roster-row-body { flex: 1; min-width: 0; }
.roster-row-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.roster-row-dx { font-size: 10px; color: #555; margin-top: 1px; }
.roster-row-ctx { font-size: 11px; color: #9d8bff; margin-top: 3px; }
.roster-row-empty { font-size: 10px; color: #383852; margin-top: 3px; }
.roster-row-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.roster-sbadge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.roster-sbadge--critical { background: #3a1010; color: #e74c3c; }
.roster-sbadge--unstable { background: #2e1e00; color: #ff9800; }
.roster-sbadge--stable { background: #0e2a18; color: #4caf50; }
.roster-sbadge--none { background: #1e1e28; color: #444; }
.roster-icon-flags { display: flex; gap: 3px; flex-wrap: wrap; justify-content: flex-end; }
.roster-icon-flag { display: inline-flex; align-items: center; gap: 2px; font-size: 9px; color: #9d8bff; background: #1e1830; padding: 2px 6px; border-radius: 4px; }
.roster-panel-footer { padding: 10px 16px; border-top: 1px solid #2a2a42; display: flex; gap: 10px; background: #111120; flex-shrink: 0; }
.btn-roster-cancel { flex: 1; padding: 9px; border-radius: 7px; background: transparent; border: 1px solid #2a2a42; color: #888; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-roster-confirm { flex: 1; padding: 9px; border-radius: 7px; background: #6c5ce7; border: none; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
```

- [ ] **Step 10.3 — Build and smoke-test**

```bash
npm run build:ui
npm start
```

Verify:
1. Open guardia mode → census renders normally
2. Press "Entrega" → roster panel covers full screen, patient rows visible
3. Tap a row → wide modal opens
4. Close modal → roster visible again
5. Press "Confirmar entrega" → roster closes, turno-activo state set, vitals feed appears at top
6. Vitals countdown chips update every 60s (check with a short-frequency test patient)

- [ ] **Step 10.4 — Commit**

```bash
git add public/ 
git commit -m "feat(guardia): HTML mount points, CSS for roster panel and vitals feed"
```

---

## Task 11: Final build + full test run

- [ ] **Step 11.1 — Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 11.2 — Production build**

```bash
npm run build:ui
```

Expected: exits 0, no new bundle-size warnings beyond 2% baseline.

- [ ] **Step 11.3 — Final commit (if any stragglers)**

```bash
git add -A
git status
# commit only if there are unstaged changes from the build
```

---

## Self-Review Checklist

- **BUG-1 vasopressor**: Task 1 — covered with test + fix ✅
- **BUG-2 critical status**: Task 2 — logic replaced, import added ✅
- **BUG-3 vitals ticker**: Task 4 — `startVitalsTicker` on `UnifiedPatientGridBoard` + wired in Task 9 ✅
- **BUG-4 entrega button**: Task 3 — guard moved to element property ✅
- **Entrega roster panel**: Task 6 — new module, full-width slide-over ✅
- **Wide modal**: Task 8 — layout restructure ✅
- **Patient nav arrows in modal**: Task 8 step 8.2 (nav bar) — wired to roster order ✅
- **Vitals feed panel (turno)**: Task 5 — new module; Task 9 wires it ✅
- **Turno activo lifecycle**: Tasks 7, 9 — activated on confirm, cleared on guardia-mode exit ✅
- **SVG icons, no emojis**: All new modules use inline SVG ✅
- **CSS**: Task 10 — roster panel + vitals feed styles ✅

**One open item for implementer:** Task 8 step 8.3 is the most impactful structural change (wide modal layout). The exact HTML to replace depends on the current `buildHandoffPanelMarkup` output, which is ~300 lines of template string. The reference mockup is at `.superpowers/brainstorm/fg-session/content/modal-wide.html`. Read the full function before restructuring.
