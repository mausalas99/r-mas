# Patient dashboard home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After selecting a patient, R+ opens a one-viewport glance (Resumen) instead of Laboratorio paste, with locked nav, IC chips (palette A), labs-of-day, and Estado clínico KPIs in a 2×2 grid.

**Architecture:** Pure models under `public/js/features/patient-dashboard/` assemble glance data from existing patient JSON, lab history, and EA helpers. A mount module paints the bento into the Paciente composite. Nav changes drop Resultados from Expediente and add Labs | Tendencias | Cultivos under the Laboratorio app tab. Persist `interconsultServiceIds` on the patient blob (no schema bump). Visual SoT: `docs/mocks/patient-dashboard-nav.html`. Spec: `docs/superpowers/specs/2026-08-13-patient-dashboard-home-design.md`.

**Tech Stack:** Electron renderer ESM (`.mjs`), colocated `node:test` via `npm run test:one`, esbuild `build:ui`, Spanish UI copy, existing CSS tokens.

---

## File map

| File | Responsibility |
|------|----------------|
| Create `public/js/features/patient-dashboard/interconsult-catalog.mjs` | Catalog + palette A hues + toggle helpers |
| Create `public/js/features/patient-dashboard/interconsult-catalog.test.mjs` | Sala excluded; palette A; toggle |
| Create `public/js/features/patient-dashboard/labs-glance-model.mjs` | Today’s envíos, alteraciones-only groups, `wide` flag |
| Create `public/js/features/patient-dashboard/labs-glance-model.test.mjs` | Day grouping, omit PaFi, dense/sparse |
| Create `public/js/features/patient-dashboard/ea-glance-model.mjs` | KPI list (omit empty) + SOAP buckets; no vitals |
| Create `public/js/features/patient-dashboard/ea-glance-model.test.mjs` | 2×2 data (4 KPIs), omit PaFi, no T/A |
| Create `public/js/features/patient-dashboard/dashboard-model.mjs` | Identity + vitals + labs + EA + events + todos |
| Create `public/js/features/patient-dashboard/dashboard-model.test.mjs` | No cama/sala on identity; pendientes child flag |
| Create `public/js/features/patient-dashboard/dashboard-html.mjs` | Spanish HTML for bento + IC modal |
| Create `public/js/features/patient-dashboard/dashboard-mount.mjs` | Mount, clicks, persist IC, `windowHandlers` |
| Create `public/styles/patient-dashboard.css` | Port mock CSS; `.ea-kpis` is `1fr 1fr` |
| Modify `public/js/expediente-tabs.mjs` | Drop `resultados` from Paciente inner; add `resumen` granular |
| Modify `public/js/expediente-tabs-migrate.mjs` | Default `resumen`; `datos` → `resumen` |
| Modify `public/js/expediente-group-row.mjs` | Label Paciente → Resumen; no Resultados group |
| Modify `public/partials/layout/app-body.html` | Tab order Paciente first; lab inner pills + dashboard mount |
| Modify `public/js/app.js` | `activeAppTab = 'nota'` |
| Modify `public/js/features/chrome.mjs` | `appTab.nota` = Paciente |
| Modify `public/js/features/patients-select.mjs` | Do not force Lab on normal select |
| Modify `public/js/features/patients-round.mjs` | Ronda overview uses the same dashboard mount |
| Modify `public/js/app-runtimes.mjs` + `public/js/app.js` | Register dashboard runtime |
| Modify `public/index.src.html` | Link `patient-dashboard.css` |
| Modify `package.json` `scripts.test` | Register every new `*.test.mjs` |
| Modify `docs/features/features-index.md` | New row (if not already added) |
| Modify `docs/core/03-user-journey.md` | Select patient → Resumen |

Do **not** hand-edit `public/js/app.bundle.mjs` or `public/index.html` (except via `build:ui`). Do **not** add boot-graph static imports of the dashboard from `app.js` beyond the existing features pattern (`windowHandlers` import is OK if other features do the same; prefer registering from `app-runtimes.mjs`).

Tests run: `npm run test:one -- path/to/file.test.mjs` (Electron Node). Never full `npm test` during this plan.

---

### Task 1: Interconsult catalog (palette A)

**Files:**
- Create: `public/js/features/patient-dashboard/interconsult-catalog.mjs`
- Create: `public/js/features/patient-dashboard/interconsult-catalog.test.mjs`
- Modify: `package.json` (`scripts.test` — append the new test path next to other `public/js/features/` tests)

- [ ] **Step 1: Write the failing test**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERCONSULT_SERVICES,
  INTERCONSULT_CAT_HUE,
  serviceById,
  toggleInterconsultId,
  hueForService,
} from './interconsult-catalog.mjs';

describe('interconsult catalog', () => {
  it('never includes Sala as a consulting service', () => {
    const names = INTERCONSULT_SERVICES.map((s) => s.name.toLowerCase());
    const ids = INTERCONSULT_SERVICES.map((s) => s.id);
    assert.equal(names.some((n) => n === 'sala' || n.includes('sala 1')), false);
    assert.equal(ids.includes('sala'), false);
  });

  it('uses palette A hues by category only', () => {
    assert.deepEqual(INTERCONSULT_CAT_HUE, { med: 245, qx: 168, sop: 52 });
    const card = serviceById('card');
    assert.equal(card.cat, 'med');
    assert.equal(hueForService(card), 245);
    assert.equal(hueForService(serviceById('cxgen')), 168);
    assert.equal(hueForService(serviceById('uti')), 52);
  });

  it('toggles assigned ids without duplicates', () => {
    assert.deepEqual(toggleInterconsultId(['card'], 'nef'), ['card', 'nef']);
    assert.deepEqual(toggleInterconsultId(['card', 'nef'], 'card'), ['nef']);
    assert.deepEqual(toggleInterconsultId(['card'], 'nope'), ['card']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:one -- public/js/features/patient-dashboard/interconsult-catalog.test.mjs
```

Expected: FAIL (module not found). Then add the path to `package.json` `scripts.test`.

- [ ] **Step 3: Write minimal implementation**

Export:

- `INTERCONSULT_CAT_HUE = { med: 245, qx: 168, sop: 52 }`
- `INTERCONSULT_SERVICES` — exact v1 catalog from the spec (id, name, cat). No `hSem`. No Sala.
- `serviceById(id)`
- `hueForService(svc)` → `INTERCONSULT_CAT_HUE[svc.cat]`
- `toggleInterconsultId(ids, id)` — ignore unknown ids; return a new array

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:one -- public/js/features/patient-dashboard/interconsult-catalog.test.mjs
```

Expected: PASS

- [ ] **Step 5: Commit** (only when the user asked to commit, or when executing this plan with commit permission)

```bash
git add public/js/features/patient-dashboard/interconsult-catalog.mjs public/js/features/patient-dashboard/interconsult-catalog.test.mjs package.json
git commit -m "$(cat <<'EOF'
feat(dashboard): interconsult catalog palette A

Sala is not a consulting service. Colors are category hues only.
EOF
)"
```

---

### Task 2: Labs-of-day glance model

**Files:**
- Create: `public/js/features/patient-dashboard/labs-glance-model.mjs`
- Create: `public/js/features/patient-dashboard/labs-glance-model.test.mjs`
- Modify: `package.json` `scripts.test`

Reuse `groupLabHistoryByDay` from `public/js/lab-history-format.mjs`, `splitResLabsByTipo` from `public/js/cultivo-block-core.mjs`, `normalizeHoraLabHistory` from `public/js/tend-core.mjs`. Altered tokens end with `*` (same as `renderToken` in `labs-display.mjs`). **Do not** emit a PaFi chip.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';

function set(id, hora, resLabs) {
  return { id, fecha: '13/08/2026', hora, resLabs };
}

describe('labs glance', () => {
  it('keeps each envío separate and only altered chips', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-08-13',
      orderedSets: [
        set('a', '07:14', ['BH\tHb 8.2* Hto 36', 'QS\tCr 1.1', 'GASES\tpH 7.31* PaO2 62*']),
        set('b', '14:20', ['GASES\tpH 7.40 PaO2 90']),
        set('c', '18:05', ['BH\tHb 8.0*']),
      ],
    });
    assert.equal(model.envios.length, 3);
    assert.equal(model.envios[0].hora.slice(0, 5), '07:14');
    assert.equal(model.envios[0].wide, true);
    const chips = model.envios[0].groups.flatMap((g) => g.chips.map((c) => c.raw));
    assert.ok(chips.some((t) => t.endsWith('*')));
    assert.equal(chips.some((t) => t === 'Cr' || t.includes('1.1')), false);
    assert.equal(chips.some((t) => /pafi/i.test(t)), false);
    assert.equal(model.envios[1].groups.length, 0);
    assert.equal(model.envios[1].wide, false);
    assert.equal(model.envios[2].wide, false);
  });

  it('does not merge different hours on the same day', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-08-13',
      orderedSets: [
        set('a', '07:14', ['BH\tHb 8.2*']),
        set('b', '18:05', ['BH\tHb 8.0*']),
      ],
    });
    assert.deepEqual(model.envios.map((e) => e.id), ['a', 'b']);
  });
});
```

Use whatever chronological order `groupLabHistoryByDay` already uses (do not re-sort in a new way). If the helper returns newest-first, assert that order instead of `['a','b']`.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:one -- public/js/features/patient-dashboard/labs-glance-model.test.mjs
```

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

`buildLabsGlanceForDay({ todayKey, orderedSets })`:

1. `groupLabHistoryByDay(orderedSets)` and pick the group whose `dayKey` matches `todayKey` (if none, use the first group or return `{ envios: [] }`).
2. For each set, split labs vs cultivo; **drop cultivo** from the bento.
3. Split remaining rows by section label (BH / QS / ESC / PFHs / GASES / …).
4. In each section, keep only space-tokens that `endWith('*')` as chips `{ raw, label, value }`.
5. Drop groups with zero chips. `wide = groups.length >= 3`.
6. Return `{ envios: [{ id, hora, wide, groups: [{ tipo, chips }] }] }`.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:one -- public/js/features/patient-dashboard/labs-glance-model.test.mjs
```

Expected: PASS

- [ ] **Step 5: Commit** (when executing with commit permission)

---

### Task 3: Estado clínico glance model (KPIs 2×2 data)

**Files:**
- Create: `public/js/features/patient-dashboard/ea-glance-model.mjs`
- Create: `public/js/features/patient-dashboard/ea-glance-model.test.mjs`
- Modify: `package.json` `scripts.test`

Reuse `computePafi` / `buildVentilatorioCalcHints` / soporte helpers from `public/js/features/estado-actual-ventilatorio.mjs` and `estado-actual-ventilatorio-labs.mjs`. Reuse `bucketsFromRecetaItems` from `estado-actual-meds-receta-buckets.mjs`. Glance SOAP labels: `Diuréticos`, `Antihipertensivos`, `Tromboprofilaxis`, `NM` (short), plus any other **non-empty** EA bucket using `EA_MED_FIELD_LABELS` (NM display = `NM`).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEaGlance } from './ea-glance-model.mjs';

describe('EA glance', () => {
  it('emits up to four plan-of-care KPIs and never vitals', () => {
    const glance = buildEaGlance({
      soporte: 'Puntillas nasales',
      soporteLitros: '2',
      dieta: 'Hiposódica',
      bombaOn: true,
      bombaRate: '2 U/h',
      pafi: 210,
      soap: {
        diureticos: ['Furosemida 40 mg'],
        antihta: ['Enalapril 10 mg'],
        antitromboticos: ['ASA 100 mg'],
        nm: ['Insulina glargina'],
      },
      vitals: { tas: 110, fc: 88 },
    });
    assert.deepEqual(glance.kpis.map((k) => k.label), ['Soporte', 'PaFi', 'Dieta', 'Bomba']);
    assert.equal(glance.kpis.length, 4);
    assert.equal(JSON.stringify(glance).includes('110'), false);
    assert.equal(JSON.stringify(glance).includes('"fc"'), false);
  });

  it('omits PaFi when it is not computable', () => {
    const glance = buildEaGlance({
      soporte: 'Aire ambiente',
      dieta: 'Hiposódica',
      bombaOn: false,
      pafi: null,
      soap: {},
    });
    assert.equal(glance.kpis.some((k) => k.label === 'PaFi'), false);
    assert.equal(glance.kpis.some((k) => k.label === 'Bomba'), false);
  });
});
```

Adapt property names to whatever the implementation reads from real EA state (flatten in the model). The test may call a thin adapter `buildEaGlanceFromPatient(patient)` later; this task can take a normalized input object.

- [ ] **Step 2: Run to verify fail** → implement → **Step 4: pass**

KPI order: Soporte (if not empty / not omitted aire-only if you still show it — mock shows O₂), PaFi if number, Dieta if text, Bomba if on. CSS in Task 6 is `grid-template-columns: 1fr 1fr` so four items render 2×2. Do not invent a fifth placeholder.

- [ ] **Step 5: Commit** (when allowed)

---

### Task 4: Nav model — Resumen default, Resultados under Lab

**Files:**
- Modify: `public/js/expediente-tabs.mjs`
- Modify: `public/js/expediente-tabs-migrate.mjs`
- Modify: `public/js/expediente-group-row.mjs`
- Modify: `public/js/expediente-tabs.test.mjs`
- Modify: `public/js/expediente-group-row.test.mjs`
- Modify: `public/js/features/patients-tab-preserve.test.mjs`

Locked shape:

- `CONSOLIDATED_TABS_* = ['paciente', 'clinico', 'salida']` (drop `resultados`)
- `GROUP_LABELS.paciente = 'Resumen'`
- New granular `'resumen'` maps to `{ tab: 'paciente', section: null }`
- `defaultGranularForConsolidatedTab('paciente')` = `'resumen'`
- `migrateGranularInner(null | 'datos')` = `'resumen'` (not `todo`)
- `'todo'` still valid (Pendientes child). Preserve `'tend'` / `'cult'` on patient switch.
- Export `LAB_INNER_SECTIONS = ['labs', 'tend', 'cult']` and labels Labs / Tendencias / Cultivos from `expediente-group-row.mjs` (`SECTION_LABELS.labs = 'Labs'`).

- [ ] **Step 1: Update tests first**

In `expediente-tabs.test.mjs`:

```js
test('CONSOLIDATED_TABS_SALA has Resumen Clínico Salida (no Resultados)', () => {
  assert.deepEqual(CONSOLIDATED_TABS_SALA, ['paciente', 'clinico', 'salida']);
});

test('default paciente granular is resumen', () => {
  assert.equal(defaultGranularForConsolidatedTab('paciente', SALA), 'resumen');
});

test('resolveConsolidatedTarget resumen and todo both map to paciente', () => {
  assert.deepEqual(resolveConsolidatedTarget('resumen', SALA), { tab: 'paciente', section: null });
  assert.deepEqual(resolveConsolidatedTarget('todo', SALA), { tab: 'paciente', section: null });
});
```

Change existing `migrateGranularInner(null)` / `'datos'` expectations from `'todo'` to `'resumen'`. Keep `'tend'` / `'cult'` preservation tests.

In `expediente-group-row.test.mjs`:

- `buildGroupRowModel` ids = `['paciente', 'clinico', 'salida']`
- `GROUP_LABELS.paciente === 'Resumen'`
- `groupSections('paciente')` still `[]` (leaf)
- Add: `SECTION_LABELS.labs === 'Labs'`

- [ ] **Step 2: Run tests — they must fail**

```bash
npm run test:one -- public/js/expediente-tabs.test.mjs public/js/expediente-group-row.test.mjs public/js/features/patients-tab-preserve.test.mjs
```

- [ ] **Step 3: Implement nav maps**

Update `granularToConsolidatedMap` with `resumen: { tab: 'paciente', section: null }`. Keep `tend` / `cult` mapped (they will render under the Lab app tab in Task 7, but granular ids stay).

`paneMountSpec` for `resumen`: `{ composite: 'paciente', selector: '#patient-dashboard-mount' }` (add the mount in Task 7). Until the DOM exists, keep selector as a string constant.

`migrateGranularInner`: if `!granularTab` or `'datos'` return `'resumen'`. Unknown still `'resumen'`.

- [ ] **Step 4: Re-run the three test files — PASS**

- [ ] **Step 5: Commit** (when allowed)

---

### Task 5: Dashboard assemble model (identity without cama/sala)

**Files:**
- Create: `public/js/features/patient-dashboard/dashboard-model.mjs`
- Create: `public/js/features/patient-dashboard/dashboard-model.test.mjs`
- Modify: `package.json` `scripts.test`

- [ ] **Step 1: Failing test**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardModel } from './dashboard-model.mjs';

describe('dashboard identity', () => {
  it('omits cama and sala (those live in the census sidebar)', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'PEREZ GOMEZ ANA',
        edad: '72',
        sexo: 'F',
        cama: '12',
        sala: '1',
        diagnosticosList: ['ICC'],
        interconsultServiceIds: ['card', 'nef'],
      },
      inner: 'resumen',
    });
    assert.equal(model.identity.nombre, 'PEREZ GOMEZ ANA');
    assert.match(model.identity.meta, /72/);
    assert.equal(model.identity.cama, undefined);
    assert.equal(JSON.stringify(model.identity).includes('Cama'), false);
    assert.deepEqual(model.identity.interconsultServiceIds, ['card', 'nef']);
    assert.equal(model.view, 'resumen');
  });

  it('marks pendientes as a child of resumen', () => {
    const model = buildDashboardModel({ patient: { nombre: 'X' }, inner: 'todo' });
    assert.equal(model.view, 'pendientes');
  });
});
```

- [ ] **Step 2–4:** Implement `buildDashboardModel` composing identity, vitals snapshot (from EA monitoreo — do not invent), labs glance, EA glance, last 3 eventualidades, last 3 pendientes. Keep the function under 80 lines by delegating.

- [ ] **Step 5: Commit** (when allowed)

---

### Task 6: CSS 2×2 KPIs + bento layout

**Files:**
- Create: `public/styles/patient-dashboard.css`
- Modify: `public/index.src.html` (add `<link rel="stylesheet" href="/styles/patient-dashboard.css">` next to `pase-board.css`)
- Optional test: assert the CSS file contains `.ea-kpis` with `grid-template-columns: 1fr 1fr` (same pattern as `clinical-teams.test.mjs` reading `pase-board.css`). Put that assertion in `dashboard-model.test.mjs` **or** a tiny `patient-dashboard-css.test.mjs` if you add a new file (then register it).

Port layout from `docs/mocks/patient-dashboard-nav.html`:

- `.dash` container queries + clamp
- `.bento.rest` three columns stretching
- `.labs-card` hug height
- `.draw.is-wide { flex: 1 1 100%; }`
- chips `flex: 1 1 auto`
- **HARD:** `.ea-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35em; }` — never 3+1
- Narrow fallback: single column (Layout C)

Do not shrink Electron window chrome. Use existing tokens (`--color-elevated`, `--border`, `--radius-container`, `--font-mono`). No glass.

- [ ] **Step 1:** Write CSS + link in `index.src.html`
- [ ] **Step 2:** Grep/test that `.ea-kpis` is two columns
- [ ] **Step 3:** Commit (when allowed)

---

### Task 7: Mount HTML, lab inner pills, default Paciente tab

**Files:**
- Create: `public/js/features/patient-dashboard/dashboard-html.mjs`
- Create: `public/js/features/patient-dashboard/dashboard-mount.mjs`
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/js/app.js` (`var activeAppTab = 'nota';`)
- Modify: `public/js/features/chrome.mjs` (`'appTab.nota': 'Paciente'`)
- Modify: `public/js/app-runtimes.mjs` (register mount)
- Modify: `public/js/app.js` (spread `windowHandlers` like other features)
- Modify existing inner-tab render so `resumen` paints the mount and `todo` shows pendientes + “Volver al resumen”

**HTML (Paciente composite):** add `#patient-dashboard-mount` inside the paciente pane (next to `.exp-pendientes-mount`). When inner is `resumen`, show dashboard and hide pendientes. When inner is `todo`, reverse; header button “Volver al resumen” calls `switchInner('resumen')`.

**Top tabs in `app-body.html`:** Paciente (`apptab-nota`) first and `active`; Laboratorio second, not active. Default `aria-selected` matches.

**Laboratorio inner:** inside `#appcontent-lab`, a row of three buttons: Labs | Tendencias | Cultivos. Labs shows the existing lab workbench (paste collapsed / secondary). Tendencias / Cultivos: move or show the existing `#itab-content-tend` / cult (or resultados composite children) inside lab mounts so they are visible while `activeAppTab === 'lab'`. Do not leave them trapped in hidden `#appcontent-nota`.

Clicking Tendencias must `switchAppTab('lab')` + set inner `tend`, **not** open Expediente.

**Clicks (Spanish copy):**

| Control | Action |
|---------|--------|
| Name | existing datos modal |
| + Agregar / IC chips | catalog modal (palette A only — no A/B switcher) |
| Labs envío / Reportes completos | `switchAppTab('lab')` + select that historial set |
| Estado clínico | Clínico → `estadoActual` |
| Eventualidades | Clínico → `eventualidades` |
| Pendientes widget | inner `todo` |
| Actualizar labs | existing `openLabRepoBatchModal()` |

Persist IC: `patient.interconsultServiceIds = next`; `persistClinicalState()`.

Keep `paste-smart.mjs` `switchAppTab('lab')`. Keep `handleLabTabAfterPatientChange` when already on Lab.

- [ ] **Step 1:** Add a focused test in `public/js/features/chrome.mjs` if `t('appTab.nota')` is unit-tested; otherwise assert in `expediente-group-row.test.mjs` that the label is Resumen and add:

```js
// public/js/features/patients-tab-preserve.test.mjs
it('does not map a normal Paciente landing to lab', () => {
  assert.equal(innerAfterPatientSwitch('resumen', SALA), 'resumen');
});
```

- [ ] **Step 2:** Implement mount + markup + default tab
- [ ] **Step 3:**

```bash
npm run test:one -- public/js/expediente-tabs.test.mjs public/js/expediente-group-row.test.mjs public/js/features/patients-tab-preserve.test.mjs public/js/features/patient-dashboard/interconsult-catalog.test.mjs public/js/features/patient-dashboard/labs-glance-model.test.mjs public/js/features/patient-dashboard/ea-glance-model.test.mjs public/js/features/patient-dashboard/dashboard-model.test.mjs
```

Expected: PASS

- [ ] **Step 4:** `npm run build:ui` — must exit 0. Never edit the bundle by hand.
- [ ] **Step 5:** Commit (when allowed)

---

### Task 8: Unify Pase ronda overview + copy/docs

**Files:**
- Modify: `public/js/features/patients-round.mjs` — when round overview mode is on, render the same dashboard mount (or call `renderPatientDashboard(patientId)`) instead of the old ronda labs/todo summary. Keep “open full” jumps as dashboard click map.
- Modify: `docs/core/03-user-journey.md` happy path: select patient → **Paciente → Resumen**; paste SOME still Laboratorio.
- Modify: `docs/features/features-index.md` row for Patient dashboard (if missing).
- Modify: `public/js/features/settings-help/help-content.mjs` and tour copy that still says Expediente as the home tab / “select patient → Laboratorio”.
- Modify: `.cursor/rules/project-context.mdc` changelog **only in the commit that lands the feature** (`2026-08-13` `patient-dashboard`: …).

Do not rewrite Guardia board or Interno.

- [ ] **Step 1:** Update help/tour tests if they assert the string `Expediente` as the first app tab label (`appTab.nota`). Replace user-facing “Expediente” with “Paciente” where it means the top tab. Keep “Expediente:” in SOME paste placeholders (that is hospital letterhead).
- [ ] **Step 2:** Run the tests you touched + `npm run build:ui`
- [ ] **Step 3:** Commit (when allowed)

---

## Spec coverage

| Spec lock | Task |
|-----------|------|
| Default Paciente / Resumen | 4, 7 |
| Resultados under Laboratorio | 4, 7 |
| Identity without cama/sala | 5 |
| IC catalog + palette A, no Sala | 1, 7 |
| Labs day / envío / alteraciones / chip-grow / PaFi not a lab | 2, 6 |
| EA no vitals; KPIs 2×2 | 3, 6 |
| Pendientes child of Resumen | 5, 7 |
| Paste-smart still Lab | 7 (do not change paste-smart) |
| Pase unify | 8 |
| No Generar nota on glance | 7 (do not add that button) |
| Actualizar labs CTA | 7 |
| Silent updates | already shipped — do not touch |

## Placeholder scan

No TBD. Test commands are `npm run test:one`. CSS 2×2 is explicit. Schema is not bumped.

## Handoff

After Task 8, `npm run test:one` on all dashboard + nav tests above, then `npm run build:ui`, then `npm run lint:tier1` on touched `public/js/**/*.mjs` if the script is available. File length ≤ 600, functions ≤ 80, complexity ≤ 15 on new files.
