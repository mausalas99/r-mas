# Historia Clínica Institutional Format — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace five textareas with a fast 3-step institutional HC form and a **lectura** view that compiles a coherent, readable historia; keep LAN versioning and APP safety.

**Architecture:** Catalog JSON for checklists; pure `compile-narrative.mjs` for read/copy; `historia-clinica-panel.mjs` split into step form + read view modes. Depends on navigation plan (`2026-05-31-sala-clinico-navigation-eventualidades.md`) for segment label **Historia Clínica**.

**Spec:** `docs/superpowers/specs/2026-05-31-historia-clinica-institutional-format-design.md`

**Tech Stack:** Node test runner, ES modules, existing `clinical-history-safety.mjs`, `lan-sync.mjs`, `historia-clinica-validate.js`.

**Prerequisite:** Navigation plan merged or worked in same branch.

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/historia-clinica/catalogs/*.json` | APP, AHF, IPAS option ids |
| `lib/historia-clinica/compile-narrative.mjs` | Lectura + clipboard text |
| `lib/historia-clinica/compile-narrative.test.mjs` | Golden narrative tests |
| `lib/historia-clinica/defaults.mjs` | `HC_INTERROGADO_NEGADO`, `defaultHistoriaClinicaData(catalogs)` |
| `lib/historia-clinica/migrate-legacy.mjs` | Flat → nested on load |
| `lib/historia-clinica/migrate-legacy.test.mjs` | Legacy fixture |
| `public/js/features/historia-clinica-checklist.mjs` | **Create** — Negado/Ninguno UI helper |
| `public/js/features/historia-clinica-panel.mjs` | Stepper + lectura (refactor) |
| `public/js/clinical-history-safety.mjs` | Build APP scan string from nested `app` |
| `lan-squad/historia-clinica-validate.js` | Nested schema |
| `package.json` | Test entries |

---

### Task 1: Narrative compiler (read coherence)

**Files:**
- Create: `lib/historia-clinica/compile-narrative.mjs`
- Create: `lib/historia-clinica/compile-narrative.test.mjs`

- [ ] **Step 1: Failing test — motivo + APP checklist prose**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileHistoriaClinicaNarrative } from './compile-narrative.mjs';

const catalogs = {
  appConditions: { dm: 'Diabetes mellitus', hta: 'Hipertensión arterial' },
  ipasSystems: { general: 'General', tegumentos: 'Tegumentos' },
};

test('compile orders sections and formats APP conditions', () => {
  const data = {
    motivoConsulta: 'Sangrado por traqueostomía',
    app: {
      conditions: ['dm', 'hta'],
      descripcionDetallada: 'DM2 dx 2010.',
      medicamentosActuales: 'Metformina 850 mg c/12h',
      hospitalizacionesPrevias: '',
    },
    apnp: { tabaquismo: 'Negado' },
    ahf: { conditions: [], descripcionDetallada: 'Madre: DM2.' },
    padecimientoActual: 'Paciente masculino de 49 años...',
    datosNegados: 'Fiebre, disnea.',
    ipas: {
      general: { checks: [], descripcion: 'INTERROGADO Y NEGADO', negado: true },
    },
    signosVitalesIngreso: 'TA 120/60, FC 69',
    labAnchor: { egfr: 45, creatinineMgDl: 1.4, fecha: '24/05/26' },
  };
  const sections = compileHistoriaClinicaNarrative(data, catalogs);
  const titles = sections.map((s) => s.title);
  assert.ok(titles.indexOf('Motivo de consulta') < titles.indexOf('Antecedentes personales patológicos'));
  const appSec = sections.find((s) => s.id === 'app');
  assert.match(appSec.body, /Diabetes mellitus/);
  assert.match(appSec.body, /Metformina/);
});

test('compile omits empty hospitalizaciones', () => {
  const sections = compileHistoriaClinicaNarrative(
    { motivoConsulta: 'Dolor', app: { conditions: [], descripcionDetallada: '', medicamentosActuales: '', hospitalizacionesPrevias: '' }, apnp: {}, ahf: { conditions: [], descripcionDetallada: '' }, padecimientoActual: '', datosNegados: '', ipas: {}, signosVitalesIngreso: '' },
    { appConditions: {}, ipasSystems: {} }
  );
  assert.ok(!sections.some((s) => s.body.trim() === ''));
});
```

- [ ] **Step 2: Run — FAIL**

Run: `node --test lib/historia-clinica/compile-narrative.test.mjs`

- [ ] **Step 3: Implement `compile-narrative.mjs`**

Export:

- `compileHistoriaClinicaNarrative(data, catalogs) -> CompiledHcSection[]`
- `compileHistoriaClinicaPlainText(sections) -> string` (join with `\n\n` and `TITLE:\nbody`)

Helper `formatChecklist(ids, catalog, descripcion, negadoLabel)` for consistent prose.

IPAS: if every system `negado`, optional single line `IPAS: interrogado y negado en todos los sistemas.` (per spec).

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Add to `package.json` test script**

---

### Task 2: Defaults, catalogs + legacy migration

**Files:**
- Create: `lib/historia-clinica/defaults.mjs`
- Create: `lib/historia-clinica/defaults.test.mjs`
- Create: `lib/historia-clinica/catalogs/app-conditions.json`
- Create: `lib/historia-clinica/catalogs/ahf-conditions.json`
- Create: `lib/historia-clinica/catalogs/ipas-systems.json`
- Create: `lib/historia-clinica/migrate-legacy.mjs`
- Create: `lib/historia-clinica/migrate-legacy.test.mjs`

- [ ] **Step 1: Test defaults — all IPAS systems start interrogado y negado**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultHistoriaClinicaData, HC_INTERROGADO_NEGADO } from './defaults.mjs';

test('defaultHistoriaClinicaData seeds every ipas system negado', () => {
  const catalogs = { ipasSystems: { general: 'General', tegumentos: 'Tegumentos' } };
  const data = defaultHistoriaClinicaData('p1', catalogs, { labLookbackHours: 48 });
  assert.equal(data.ipas.general.negado, true);
  assert.equal(data.ipas.general.descripcion, HC_INTERROGADO_NEGADO);
  assert.equal(data.genero.negado, true);
  assert.equal(data.datosNegados, HC_INTERROGADO_NEGADO);
  assert.deepEqual(data.app.conditions, []);
});
```

- [ ] **Step 2: Test legacy migration**

```js
import { migrateLegacyHistoriaData } from './migrate-legacy.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('migrateLegacy maps flat app into app.descripcionDetallada', () => {
  const out = migrateLegacyHistoriaData({
    patientId: 'p1',
    ficha: 'Juan, 49 años',
    app: 'Metformina. DM2.',
    ahf: 'Madre DM',
    apnp: 'Tabaco negado',
    peea: 'Ingreso por sangrado',
  });
  assert.equal(out.app.descripcionDetallada, 'Metformina. DM2.');
  assert.equal(out.padecimientoActual, 'Ingreso por sangrado');
  assert.equal(out.ficha, undefined);
});
```

- [ ] **Step 3: Implement `defaults.mjs` + migration + catalogs**

`defaultHistoriaClinicaData` must pre-fill every `ipas` key from `catalogs.ipasSystems` with `{ checks: [], descripcion: HC_INTERROGADO_NEGADO, negado: true }`, plus `genero` and `datosNegados`. APP/AHF stay empty.

- [ ] **Step 4: Run tests — PASS**

---

### Task 3: Safety scan string from nested APP

**Files:**
- Modify: `public/js/clinical-history-safety.mjs`
- Modify: `public/js/clinical-history-safety.test.mjs` (if exists) or add test

- [ ] **Step 1: Export `buildAppTextForSafety(data, catalogs)`**

Concatenate: `medicamentosActuales`, `descripcionDetallada`, selected condition labels.

- [ ] **Step 2: Update `scanHistoriaClinicaSafety` call sites in panel** to use builder instead of `appText` flat string.

- [ ] **Step 3: Run clinical safety tests**

Run: `node --test lib/clinical-safety-rules/evaluate.test.mjs` and panel-related tests.

---

### Task 4: Server validation — nested shape

**Files:**
- Modify: `lan-squad/historia-clinica-validate.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Extend validator** to accept nested `data`; run `migrateLegacyHistoriaData` server-side on PUT if legacy keys detected (optional normalize once).

- [ ] **Step 2: Add router test** with minimal nested payload + `changedKeys: ['app']`.

Run: `node --test lan-squad/host-router.test.js`

---

### Task 5: Checklist UI helper

**Files:**
- Create: `public/js/features/historia-clinica-checklist.mjs`

- [ ] **Step 1: Implement `renderChecklistBlock(container, spec, value, onChange)`**

Props: `options`, `selectedIds`, `detailText`, `negado`, `quickActions: ['reset_negado'|'ninguno']`.

On first render, show default descripcion (already in value). Checking any option sets `negado: false`.

- [ ] **Step 2: Export `applyInterrogadoNegadoAllIpas(ipas, systemIds)`** — reset all systems to default (same as create).

---

### Task 6: Panel — stepper (fast fill) + lectura mode

**Files:**
- Modify: `public/js/features/historia-clinica-panel.mjs`

- [ ] **Step 1: Load data through `migrateLegacyHistoriaData` on fetch; on create use `defaultHistoriaClinicaData`**

- [ ] **Step 2: Mode switch**

```js
if (!_editMode) {
  renderLecturaView(root, compileHistoriaClinicaNarrative(_data, catalogs));
  return;
}
renderStepperView(root, _data, _step);
```

Toolbar: **Editar historia** | **Copiar historia** (lectura) | **Guardar** (edición step 3).

- [ ] **Step 3: Stepper UI**

- Header: steps 1–3 with completeness dots (`meta.lastStep` on open edit).
- Footer: Anterior / Siguiente; step 2 includes **IPAS — Restablecer interrogado y negado** (bulk reset to defaults).
- Step fields per spec (use checklist helper).

- [ ] **Step 4: On save success** — `_editMode = false`, re-render lectura.

- [ ] **Step 5: Copiar** — `rt.copyToClipboardSafe(compileHistoriaClinicaPlainText(...))` + toast.

- [ ] **Step 6: Register test** for step completeness helper in `public/js/features/historia-clinica-panel.test.mjs` (optional small extract).

Run: `npm test` (subset) + `npm run bundle:renderer`

---

### Task 7: Styles

**Files:**
- Create or extend: `public/styles/historia-clinica.css`
- Link from `public/index.html`

- [ ] **Step 1: `.hc-read-view`** — section title typography matches `card-header`; body `line-height: 1.5`; labs block `pre` or muted box.

- [ ] **Step 2: `.hc-stepper`** — horizontal steps, active state, complete dot (reuse `--accent` tokens).

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| 3-step institutional form | Task 6 |
| Negado/Ninguno/bulk IPAS | Task 5–6 |
| Lectura coherent read | Task 1, 6 |
| Copiar historia | Task 6 |
| Nested data + changedKeys | Task 2, 4, 6 |
| APP safety | Task 3 |
| Prefill patient | Task 6 (create flow) |
| Mobile lectura summary | Task 6 |

---

## Verification

```bash
node --test lib/historia-clinica/compile-narrative.test.mjs lib/historia-clinica/migrate-legacy.test.mjs
node --test lan-squad/host-router.test.js
npm run bundle:renderer
```

Manual Sala: new HC opens with IPAS/género already “interrogado y negado” → fill motivo + padecimiento + APP meds only → Guardar → lectura coherent → Copiar.
