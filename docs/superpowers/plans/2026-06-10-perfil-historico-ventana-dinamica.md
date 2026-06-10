# Perfil histórico — ventana dinámica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grilla de Perfil histórico con columnas dinámicas (solape cross-mes + sin días vacíos), filas continuas por `rowKey`, y FAB Copiar ocultos fuera de contexto.

**Architecture:** Lógica pura nueva en `med-pharm-view-window.mjs`; persistencia mensual sin cambios; `med-pharm-profile-panel.mjs` renderiza `PharmViewWindow` en lugar de un solo `month`; fix FAB en `switchAppTab`.

**Tech stack:** Vanilla JS (ESM), `node --test`, CSS en `public/css/med-pharm-profile.css`.

**Spec:** `docs/superpowers/specs/2026-06-10-perfil-historico-ventana-dinamica-design.md`

---

## File map

| File | Rol |
|------|-----|
| `public/js/med-pharm-view-window.mjs` | Ventana, unificación filas, lectura/escritura por columna |
| `public/js/med-pharm-view-window.test.mjs` | Tests unitarios |
| `public/js/features/med-pharm-profile-panel.mjs` | Grilla/lista/modales con ventana |
| `public/css/med-pharm-profile.css` | `day-hdr-month` |
| `public/js/features/pase-board.mjs` | Sync FAB al cambiar `switchAppTab` |
| `public/js/features/lab-panel.mjs` | `labOutputHasCopyableContent` |
| `public/js/features/estado-actual-panel.mjs` | `eaHasCopyableContent` |
| `package.json` | Registrar test si falta |

---

### Task 1: Núcleo — helpers de fecha y columnas

**Files:**
- Create: `public/js/med-pharm-view-window.mjs`
- Create: `public/js/med-pharm-view-window.test.mjs`
- Modify: `package.json` (script `test` si no incluye el archivo)

- [ ] **Step 1: Write failing tests for `parseFimiFecha` and `columnKey`**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseFimiFecha, columnKey, daysInCalendarMonth } from './med-pharm-view-window.mjs';

describe('parseFimiFecha', () => {
  it('parsea ISO YYYY-MM-DD', () => {
    const p = parseFimiFecha('2026-05-22');
    assert.deepEqual(p, { year: 2026, monthIndex: 4, day: 22 });
  });
  it('vacío → null', () => {
    assert.equal(parseFimiFecha(''), null);
  });
});

describe('columnKey', () => {
  it('serializa columna', () => {
    assert.equal(columnKey({ year: 2026, monthIndex: 4, day: 28 }), '2026-05-28');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test public/js/med-pharm-view-window.test.mjs`  
Expected: module not found

- [ ] **Step 3: Implement helpers**

```javascript
import { monthKeyFromParts, splitMonthAt, dayValueInMap } from './med-pharm-profile-core.mjs';

export const OVERLAP_CUTOFF_DAY = 14;

export function parseFimiFecha(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: +m[1], monthIndex: +m[2] - 1, day: +m[3] };
}

export function columnKey(col) {
  return monthKeyFromParts(col.year, col.monthIndex) + '-' + String(col.day).padStart(2, '0');
}

export function daysInCalendarMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function makeColumn(year, monthIndex, day) {
  return { year, monthIndex, day, monthKey: monthKeyFromParts(year, monthIndex) };
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add public/js/med-pharm-view-window.mjs public/js/med-pharm-view-window.test.mjs package.json
git commit -m "feat(med-pharm): add view-window date helpers"
```

---

### Task 2: `buildPharmViewWindow` — mes actual con solape

**Files:**
- Modify: `public/js/med-pharm-view-window.mjs`
- Modify: `public/js/med-pharm-view-window.test.mjs`

- [ ] **Step 1: Write failing tests**

```javascript
import { buildPharmViewWindow } from './med-pharm-view-window.mjs';
import { buildMedPharmRowKey } from './med-pharm-profile-core.mjs';

function profileWithCrossMonth() {
  const key = buildMedPharmRowKey({
    med: 'CEFALOTINA 1 G',
    dosis: '2 G',
    freq: 'Q8H',
    via: 'VIA INTRAVENOSA',
  });
  const row = { rowKey: key, med: 'CEFALOTINA 1 G', dosis: '2 G', freq: 'Q8H', via: 'VIA INTRAVENOSA', days: {}, notAdmin: {} };
  const mayDays = {};
  for (let d = 20; d <= 31; d += 1) mayDays[d] = 1;
  const junDays = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
  return {
    months: {
      '2026-05': { monthKey: '2026-05', year: 2026, monthIndex: 4, daysInMonth: 31, rows: [{ ...row, days: mayDays }] },
      '2026-06': { monthKey: '2026-06', year: 2026, monthIndex: 5, daysInMonth: 30, rows: [{ ...row, days: junDays }] },
    },
  };
}

describe('buildPharmViewWindow current month early', () => {
  it('incluye cola mayo cuando hoy es 5 jun y hay continuidad', () => {
    const w = buildPharmViewWindow({
      profile: profileWithCrossMonth(),
      viewYear: 2026,
      viewMonthIndex: 5,
      today: { year: 2026, monthIndex: 5, day: 5 },
      fimiFecha: '2026-05-20',
    });
    assert.equal(w.columns[0].monthIndex, 4);
    assert.equal(w.columns[0].day, 20);
    assert.equal(w.columns[w.columns.length - 1].day, 5);
    assert.equal(w.columns[w.columns.length - 1].monthIndex, 5);
  });
});

describe('buildPharmViewWindow current month mid', () => {
  it('solo junio 1-15 sin mayo cuando hoy es 15 jun', () => {
    const w = buildPharmViewWindow({
      profile: profileWithCrossMonth(),
      viewYear: 2026,
      viewMonthIndex: 5,
      today: { year: 2026, monthIndex: 5, day: 15 },
      fimiFecha: '',
    });
    assert.ok(w.columns.every((c) => c.monthIndex === 5));
    assert.equal(w.columns[0].day, 1);
    assert.equal(w.columns[w.columns.length - 1].day, 15);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `buildPharmViewWindow` (mes actual)**

Implementar:
- `collectIndicatedDays(month, rowKey?)`
- `rowKeysContinuingAcrossMonths(profile, prevY, prevM, curY, curM, curEndDay)`
- `buildCurrentMonthWindow(...)` según spec §5.1
- `splitAt: splitMonthAt(columns.length)`
- `label` con abreviaturas si hay más de un `monthKey` en columnas

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(med-pharm): dynamic view window for current month"
```

---

### Task 3: `buildPharmViewWindow` — mes pasado (ingreso → último indicado)

**Files:**
- Modify: `public/js/med-pharm-view-window.mjs`
- Modify: `public/js/med-pharm-view-window.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
describe('buildPharmViewWindow past month', () => {
  it('mayo pasado: 22-31 con fimi 22 may', () => {
    const w = buildPharmViewWindow({
      profile: profileWithCrossMonth(),
      viewYear: 2026,
      viewMonthIndex: 4,
      today: { year: 2026, monthIndex: 5, day: 15 },
      fimiFecha: '2026-05-22',
    });
    assert.ok(w.columns.every((c) => c.monthIndex === 4));
    assert.equal(w.columns[0].day, 22);
    assert.equal(w.columns[w.columns.length - 1].day, 31);
  });
});
```

- [ ] **Step 2–4: Implement §5.2, run tests**

- [ ] **Step 5: Commit**

---

### Task 4: Unificación de filas y lectura/escritura por columna

**Files:**
- Modify: `public/js/med-pharm-view-window.mjs`
- Modify: `public/js/med-pharm-view-window.test.mjs`

- [ ] **Step 1: Write failing tests**

```javascript
import {
  unifyRowsForWindow,
  cellValueAtColumn,
  toggleNotAdminAtColumn,
} from './med-pharm-view-window.mjs';
import { toggleNotAdmin } from './med-pharm-profile-core.mjs';

describe('cellValueAtColumn', () => {
  it('lee día del bucket mensual correcto', () => {
    const profile = profileWithCrossMonth();
    const w = buildPharmViewWindow({ profile, viewYear: 2026, viewMonthIndex: 5, today: { year: 2026, monthIndex: 5, day: 5 }, fimiFecha: '' });
    const rows = unifyRowsForWindow(profile, w.columns);
    const colMay28 = w.columns.find((c) => c.monthIndex === 4 && c.day === 28);
    assert.equal(cellValueAtColumn(profile, rows[0].rowKey, colMay28), 1);
  });
});

describe('toggleNotAdminAtColumn', () => {
  it('muta notAdmin en mes mayo desde vista junio', () => {
    let profile = profileWithCrossMonth();
    const w = buildPharmViewWindow({ profile, viewYear: 2026, viewMonthIndex: 5, today: { year: 2026, monthIndex: 5, day: 5 }, fimiFecha: '' });
    const col = w.columns.find((c) => c.monthIndex === 4 && c.day === 25);
    profile = toggleNotAdminAtColumn(profile, rows[0].rowKey, col);
    const mayRow = profile.months['2026-05'].rows[0];
    assert.equal(mayRow.notAdmin[25], true);
  });
});
```

- [ ] **Step 2–4: Implement `unifyRowsForWindow`, `findRowInMonth`, `cellValueAtColumn`, `toggleNotAdminAtColumn` (clone profile months al mutar)**

- [ ] **Step 5: Commit**

---

### Task 5: Panel — grilla multi-mes

**Files:**
- Modify: `public/js/features/med-pharm-profile-panel.mjs`
- Modify: `public/css/med-pharm-profile.css`

- [ ] **Step 1: Add `getFimiFechaForPatient(patientId)` using `patients` from app-state (import at top)**

- [ ] **Step 2: Replace `getViewMonth` usage in render path with:**

```javascript
import { buildPharmViewWindow, unifyRowsForWindow } from '../med-pharm-view-window.mjs';

function getViewWindow(pid) {
  const profile = getProfile(pid);
  const t = todayParts();
  const patient = patients.find((p) => p.id === pid);
  return buildPharmViewWindow({
    profile: profile || { months: {} },
    viewYear,
    viewMonthIndex,
    today: t,
    fimiFecha: patient ? patient.fimiFecha : '',
  });
}
```

- [ ] **Step 3: Refactor `buildSomeGridTable(month, rows)` → `buildSomeGridTable(window, rows, profile)`**
  - Loop `window.columns` in headers and cells
  - `appendDayHeader(tr, columnsSlice)` with optional `day-hdr-month` span
  - `appendDayCell(tr, profile, row, column)` with `dataset.year`, `dataset.month`, `dataset.day`
  - `isToday(column.year, column.monthIndex, column.day)`

- [ ] **Step 4: Update `onGridDayClick`**

```javascript
function onGridDayClick(rowKey, year, monthIndex, day) {
  const pid = rt.getActiveId();
  if (!pid) return;
  const col = makeColumn(year, monthIndex, day);
  let profile = getProfile(pid) || { months: {} };
  profile = toggleNotAdminAtColumn(profile, rowKey, col);
  medPharmProfileByPatient[pid] = profile;
  saveState();
  refreshOpenMedPharmGrids();
  renderMedPharmProfilePanel();
}
```

- [ ] **Step 5: Update `adherenceDayDetail` to accept `columns` array**

- [ ] **Step 6: CSS for `.day-hdr-month` (font-size muted, border-left at month boundary)**

- [ ] **Step 7: Manual smoke — build UI**

Run: `npm run build:ui`

- [ ] **Step 8: Commit**

---

### Task 6: Lista, modales y etiqueta de mes

**Files:**
- Modify: `public/js/features/med-pharm-profile-panel.mjs`

- [ ] **Step 1: `renderMedPharmProfilePanel` — use `window.label` for `#med-pharm-month-label` when overlap**
- [ ] **Step 2: `openMedPharmFullModal` / modal one — pass `window` + unified rows**
- [ ] **Step 3: Empty state when `window.columns.length === 0`**
- [ ] **Step 4: Run full test suite**

Run: `npm test`  
Expected: all pass

- [ ] **Step 5: Commit**

---

### Task 7: Fix FAB Copiar huérfano

**Files:**
- Modify: `public/js/features/lab-panel.mjs`
- Modify: `public/js/features/estado-actual-panel.mjs`
- Modify: `public/js/features/pase-board.mjs`

- [ ] **Step 1: Add exports**

```javascript
// lab-panel.mjs
export function labOutputHasCopyableContent() {
  const sec = document.getElementById('lab-output-section');
  return !!(sec && sec.style.display !== 'none' && activeLab && activeLab.resLabs && activeLab.resLabs.length);
}

// estado-actual-panel.mjs
export function eaHasCopyableContent() {
  const patient = findActivePatient();
  if (!patient) return false;
  const text = getEstadoActualTextForPatient(patient);
  return !!String(text || '').trim();
}
```

- [ ] **Step 2: In `switchAppTab`, after tab visibility sync:**

```javascript
import { labOutputHasCopyableContent, syncLabCopyFab } from './lab-panel.mjs';
import { eaHasCopyableContent, syncEaCopyFab } from './estado-actual-panel.mjs';

// inside switchAppTab, before return:
var inner = migrateGranularInner(rt.getActiveInner() || 'todo', rt.getSettings());
syncLabCopyFab(tab === 'lab' && labOutputHasCopyableContent());
syncEaCopyFab(tab === 'nota' && inner === 'estadoActual' && eaHasCopyableContent());
if (tab !== 'lab') syncLabCopyFab(false);
if (tab !== 'nota' || inner !== 'estadoActual') syncEaCopyFab(false);
```

(Simplificar a una sola llamada por FAB con la condición compuesta.)

- [ ] **Step 3: Manual — procesar labs, ir a Manejo → FAB oculto**

- [ ] **Step 4: Commit**

---

### Task 8: Docs y contexto

**Files:**
- Modify: `.cursor/rules/project-context.mdc` (changelog)
- Modify: `docs/features/features-index.md` (si aplica una línea)

- [ ] **Step 1: Changelog entry `perfil-historico-ventana`**
- [ ] **Step 2: `docs/logs/agent-changelog.md` session note**

---

## Plan self-review (spec coverage)

| Spec § | Task |
|--------|------|
| Ventana mes actual solape | Task 2 |
| Mes pasado B + fimi | Task 3 |
| Filas continuas A | Task 4 |
| UI grilla | Task 5–6 |
| FAB fix | Task 7 |
| Tests | Tasks 1–4, 6 |
| Persistencia sin cambio | Tasks 4–5 (solo lectura/escritura por bucket) |

No placeholders remaining.
