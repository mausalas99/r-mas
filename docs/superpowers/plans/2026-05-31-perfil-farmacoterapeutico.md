# Perfil farmacoterapéutico histórico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir subvista **Perfil histórico** en Medicamentos con calendario mensual SOME (lista + modal pantalla completa), persistencia por paciente, pegado mensual, merge desde Receta y marcas no administrado por celda.

**Architecture:** Lógica pura en `med-pharm-profile-core.mjs`; UI en `med-pharm-profile-panel.mjs`; hook en `medications.mjs` tras Receta; estado `medPharmProfileByPatient` en `storage.js` / `app-state.mjs` / respaldo-LAN como `medRecetaByPatient`.

**Tech stack:** Vanilla JS (ESM), `node --test`, CSS en `public/css/`, markup en `app-body.html` + `index.html`.

**Spec:** `docs/superpowers/specs/2026-05-31-perfil-farmacoterapeutico-design.md`  
**Mockup:** `docs/mockups/perfil-farmacoterapeutico-mockup.html` (v12)

---

## File map

| File | Rol |
|------|-----|
| `public/js/med-pharm-profile-core.mjs` | Parse mes SOME, merge Receta, stats, keys, helpers mes |
| `public/js/med-pharm-profile-core.test.mjs` | Tests unitarios |
| `public/js/features/med-pharm-profile-panel.mjs` | Toggle, lista, modales, eventos |
| `public/js/features/medications.mjs` | Subvista, `procesarRecetaMed` → merge |
| `public/js/storage.js` | get/save `rpc-medPharmProfileByPatient`, `saveAll` |
| `public/js/app-state.mjs` | export/import estado |
| `public/js/features/platform.mjs` | backup ZIP |
| `public/js/features/lan-sync.mjs` | sync paciente |
| `public/css/med-pharm-profile.css` | Estilos tabla unificada (variables mockup) |
| `public/partials/layout/app-body.html` | Markup perfil + modales |
| `public/index.html` | Mismo markup (duplicado proyecto) |
| `package.json` | Añadir test al script `test` |

---

### Task 1: Núcleo — adherencia y claves

**Files:**
- Create: `public/js/med-pharm-profile-core.mjs`
- Create: `public/js/med-pharm-profile-core.test.mjs`
- Modify: `package.json` (script `test`)

- [ ] **Step 1: Test adherencia y rowKey**

Crear `public/js/med-pharm-profile-core.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMedPharmRowKey,
  adherenceStats,
  toggleNotAdmin,
  splitMonthAt,
} from './med-pharm-profile-core.mjs';

describe('buildMedPharmRowKey', () => {
  it('normaliza y concatena campos', () => {
    const k = buildMedPharmRowKey({
      med: '  Metamizol 2.5 G ',
      dosis: '1 G //',
      freq: 'Q8H',
      via: 'VIA INTRAVENOSA',
    });
    assert.equal(k, 'METAMIZOL 2.5 G|1 G //|Q8H|VIA INTRAVENOSA');
  });
});

describe('adherenceStats', () => {
  it('cuenta efectivos y no pasados', () => {
    const days = { 1: 1, 2: 1, 5: 1 };
    const notAdmin = { 5: true };
    const s = adherenceStats(days, notAdmin);
    assert.equal(s.indicated, 3);
    assert.equal(s.missed, 1);
    assert.equal(s.effective, 2);
    assert.deepEqual(s.missedDays, [5]);
  });
});

describe('toggleNotAdmin', () => {
  it('solo alterna si el día está indicado', () => {
    const days = { 3: 1 };
    let na = {};
    na = toggleNotAdmin(days, na, 3);
    assert.equal(na[3], true);
    na = toggleNotAdmin(days, na, 3);
    assert.equal(na[3], undefined);
    assert.equal(toggleNotAdmin(days, {}, 9), {});
  });
});

describe('splitMonthAt', () => {
  it('divide 31 días en 16 + 15', () => {
    assert.equal(splitMonthAt(31), 16);
    assert.equal(splitMonthAt(30), 15);
  });
});
```

- [ ] **Step 2: Ejecutar test (debe fallar)**

Run: `node --test public/js/med-pharm-profile-core.test.mjs`  
Expected: FAIL — cannot find module / export missing

- [ ] **Step 3: Implementar núcleo mínimo**

Crear `public/js/med-pharm-profile-core.mjs`:

```javascript
export function buildMedPharmRowKey({ med, dosis, freq, via }) {
  const norm = (s) =>
    String(s || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  return [norm(med), norm(dosis), norm(freq), norm(via)].join('|');
}

export function splitMonthAt(daysInMonth) {
  return Math.ceil(daysInMonth / 2);
}

export function adherenceStats(days, notAdmin) {
  const indicated = [];
  const missed = [];
  const dmap = days || {};
  const na = notAdmin || {};
  for (const key of Object.keys(dmap)) {
    const d = Number(key);
    if (!(dmap[key] > 0)) continue;
    indicated.push(d);
    if (na[d] || na[String(d)]) missed.push(d);
  }
  indicated.sort((a, b) => a - b);
  missed.sort((a, b) => a - b);
  return {
    indicated: indicated.length,
    effective: indicated.length - missed.length,
    missed: missed.length,
    missedDays: missed,
  };
}

export function toggleNotAdmin(days, notAdmin, dayNum) {
  if (!(days && days[dayNum] > 0) && !(days && days[String(dayNum)] > 0)) {
    return notAdmin || {};
  }
  const next = Object.assign({}, notAdmin || {});
  const k = dayNum;
  if (next[k] || next[String(k)]) {
    delete next[k];
    delete next[String(k)];
  } else {
    next[k] = true;
  }
  return next;
}

export function formatFreqShort(raw) {
  const t = String(raw || '').trim().toUpperCase();
  if (!t) return '—';
  if (t === 'ONCE' || t === 'PRN') return t;
  const m = t.match(/^Q?(\d+)\s*H$/);
  if (m) return m[1] + 'H';
  if (t.indexOf('Q') === 0) return t.slice(1);
  return t;
}

export function formatViaShort(raw) {
  return String(raw || '').replace(/^VIA\s+/i, '').trim() || '—';
}
```

- [ ] **Step 4: Añadir test a package.json y verificar PASS**

En `package.json`, dentro del script `test`, añadir `public/js/med-pharm-profile-core.test.mjs` junto a `med-receta-core.test.mjs`.

Run: `node --test public/js/med-pharm-profile-core.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/med-pharm-profile-core.mjs public/js/med-pharm-profile-core.test.mjs package.json
git commit -m "feat(med-pharm): núcleo adherencia y claves de fila"
```

---

### Task 2: Parse SOME mensual + merge Receta

**Files:**
- Modify: `public/js/med-pharm-profile-core.mjs`
- Modify: `public/js/med-pharm-profile-core.test.mjs`

- [ ] **Step 1: Tests parse y merge**

Añadir al test file:

```javascript
import {
  parseSomePharmMonthPaste,
  looksLikeSomePharmMonthPaste,
  mergeRecetaIntoMonth,
  parseRecetaDateToDay,
} from './med-pharm-profile-core.mjs';

const SAMPLE_HEADER = 'Medicamento\t01\t02\t03\n';
const SAMPLE_ROW =
  'METAMIZOL 2.5 G SOL INY 5 ML (*)\t1 G //\tQ8H\tVIA INTRAVENOSA\t1\t\t1\n';

describe('parseSomePharmMonthPaste', () => {
  it('extrae fila con días 1 y 3', () => {
    const raw = SAMPLE_HEADER + SAMPLE_ROW;
    const res = parseSomePharmMonthPaste(raw, { year: 2026, monthIndex: 4 });
    assert.ok(res.rows.length >= 1);
    const row = res.rows.find((r) => r.med.includes('METAMIZOL'));
    assert.ok(row);
    assert.equal(row.days[1], 1);
    assert.equal(row.days[3], 1);
    assert.equal(res.skipped, 0);
  });
});

describe('mergeRecetaIntoMonth', () => {
  it('marca día de receta y rellena huecos', () => {
    const month = {
      monthKey: '2026-05',
      year: 2026,
      monthIndex: 4,
      daysInMonth: 31,
      rows: [
        {
          rowKey: 'LEVETIRACETAM|1 G //|Q12H|VIA NASOGASTRICA',
          med: 'LEVETIRACETAM',
          dosis: '1 G //',
          freq: 'Q12H',
          via: 'VIA NASOGASTRICA',
          cat: '',
          days: { 1: 1, 2: 1 },
          notAdmin: {},
        },
      ],
    };
    const recetaItems = [
      {
        nombre: 'LEVETIRACETAM 500 MG TABLETA',
        dosis: '1 G //',
        freq: 'Q12H',
        via: 'VIA NASOGASTRICA',
        suspendido: false,
      },
    ];
    const out = mergeRecetaIntoMonth(month, recetaItems, '05/05/2026');
    const row = out.rows[0];
    assert.equal(row.days[5], 1);
    assert.equal(row.days[3], 1);
    assert.equal(row.days[4], 1);
  });
});

describe('parseRecetaDateToDay', () => {
  it('parsea DD/MM/YYYY', () => {
    assert.deepEqual(parseRecetaDateToDay('05/05/2026', 2026, 4), { ok: true, day: 5 });
  });
});
```

(Ajustar columnas del `SAMPLE_ROW` al contrato real del parser una vez definido el índice de columnas meta vs días en implementación.)

- [ ] **Step 2: Run test — FAIL**

Run: `node --test public/js/med-pharm-profile-core.test.mjs`

- [ ] **Step 3: Implementar parse + merge**

Implementar en `med-pharm-profile-core.mjs`:

- `looksLikeSomePharmMonthPaste(raw)` — al menos 2 líneas TSV y una celda `01` o `1` en cabecera.
- `parseSomePharmMonthPaste(raw, { year, monthIndex })` → `{ rows, skipped, daysInMonth }`.
  - Detectar fila cabecera con tokens día.
  - Por fila datos: primeras columnas fijas (med, dosis, freq, via) según heurística: si columna tras vía es numérica, empiezan días ahí.
  - `rowKey` con `buildMedPharmRowKey`.
- `parseRecetaDateToDay(fecha, year, monthIndex)` → `{ ok, day }`.
- `mergeRecetaIntoMonth(month, recetaItems, fechaActualizacion)`:
  - Por ítem no suspendido, encontrar o crear fila por key derivada de campos receta (`nombre`, `dosis`, etc. — alinear nombres con `med-receta-core` ítem).
  - `targetDay` desde fecha; marcar `days[targetDay]=1`.
  - `lastIndicated = max(días existentes)`; para `d` en `(lastIndicated, targetDay)` rellenar `days[d]=1` si vacío.
  - No borrar `notAdmin` existentes.

- [ ] **Step 4: Run test — PASS** (ajustar fixture hasta verde)

- [ ] **Step 5: Commit**

```bash
git add public/js/med-pharm-profile-core.mjs public/js/med-pharm-profile-core.test.mjs
git commit -m "feat(med-pharm): parse mes SOME y merge desde Receta"
```

---

### Task 3: Persistencia

**Files:**
- Modify: `public/js/storage.js`
- Modify: `public/js/app-state.mjs`
- Modify: `public/js/storage.test.mjs` (si existe patrón para nuevas claves)

- [ ] **Step 1: storage getters/setters**

En `storage.js`, patrón idéntico a `medRecetaByPatient`:

```javascript
  getMedPharmProfileByPatient() {
    return safeParseObject(localStorage.getItem('rpc-medPharmProfileByPatient'));
  },

  saveMedPharmProfileByPatient(medPharmProfileByPatient) {
    const persist = {};
    Object.keys(medPharmProfileByPatient || {}).forEach((k) => {
      if (medPharmProfileByPatient[k] && !k.startsWith('demo-')) {
        persist[k] = medPharmProfileByPatient[k];
      }
    });
    localStorage.setItem('rpc-medPharmProfileByPatient', JSON.stringify(persist));
  },
```

Extender `saveAll` y el objeto de export interno para incluir `medPharmProfileByPatient` (misma posición que otros mapas opcionales — leer firma actual de `saveAll` en archivo y añadir parámetro al final o en objeto de opciones si ya refactorizado).

- [ ] **Step 2: app-state**

```javascript
export let medPharmProfileByPatient = {};

export function setMedPharmProfileByPatient(next) {
  medPharmProfileByPatient = next;
}
```

En `initAppState`: `setMedPharmProfileByPatient(storage.getMedPharmProfileByPatient());`  
En `replaceAppStateFromBackupData`: `setMedPharmProfileByPatient(clonePlainRecord(data.medPharmProfileByPatient));`  
En `runSaveNow` / `storage.saveAll`: pasar `medPharmProfileByPatient`.

- [ ] **Step 3: Test storage round-trip** (añadir caso mínimo en `storage.test.mjs` si aplica)

- [ ] **Step 4: Commit**

```bash
git add public/js/storage.js public/js/app-state.mjs public/js/storage.test.mjs
git commit -m "feat(med-pharm): persistencia local por paciente"
```

---

### Task 4: Respaldo e importación

**Files:**
- Modify: `public/js/features/platform.mjs`
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Incluir en export/import paciente**

En payload de paciente (donde está `medReceta`), añadir `medPharmProfile: medPharmProfileByPatient[aid] || null`.  
En import: asignar o borrar como `medReceta`.  
En ZIP global de respaldo: clave `medPharmProfileByPatient` junto a `medRecetaByPatient`.

- [ ] **Step 2: LAN sync**

En `lan-sync.mjs`, mismos puntos que `medReceta` al fusionar entrada remota.

- [ ] **Step 3: Commit**

```bash
git add public/js/features/platform.mjs public/js/features/lan-sync.mjs
git commit -m "feat(med-pharm): respaldo e import LAN"
```

---

### Task 5: CSS tabla unificada

**Files:**
- Create: `public/css/med-pharm-profile.css`
- Modify: `public/partials/layout/app-body.html` (link stylesheet si el proyecto enlaza CSS por partial)
- Modify: `public/index.html` si los estilos se enlazan ahí

- [ ] **Step 1: Extraer variables y clases del mockup v12**

Copiar de `docs/mockups/perfil-farmacoterapeutico-mockup.html` las reglas:
- `--some-day-band-h`, `--some-med-block-h`, `--some-day-w`, `--some-hdr-row-h`
- `.some-grid-unified` y descendientes (thead sticky, `.col-med`, `.day-pad`, `.indicated`, `.not-admin`, `.today`, `.row-has-miss`)
- `.med-pharm-list-*`, modales `.modal-full`

Prefijo opcional `.med-pharm-profile` en contenedor para no colisionar globalmente.

- [ ] **Step 2: Verificar carga en app** (seguir patrón de otros `public/css/*.css`)

- [ ] **Step 3: Commit**

```bash
git add public/css/med-pharm-profile.css public/index.html public/partials/layout/app-body.html
git commit -m "feat(med-pharm): estilos calendario SOME unificado"
```

---

### Task 6: Markup subvista y modales

**Files:**
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/index.html`

- [ ] **Step 1: Toggle y contenedores**

Dentro de `#appcontent-med` / card Medicamentos, añadir:

- `div.subview-toggle` con botones `data-med-subview="receta"|"perfil"`
- `div#med-subview-receta` (envolver textarea + lista receta actual existente)
- `div#med-subview-perfil` (`display:none` por defecto) con:
  - toolbar (filtro, último pegado, btn fullscreen, month nav)
  - textarea `#med-pharm-paste` + botón **Importar mes SOME**
  - `#med-pharm-list`
  - leyenda
- Modales `#med-pharm-modal-one`, `#med-pharm-modal-full` (estructura mockup)

- [ ] **Step 2: Duplicar en index.html** (mantener paridad con partial)

- [ ] **Step 3: Commit**

```bash
git add public/partials/layout/app-body.html public/index.html
git commit -m "feat(med-pharm): markup subvista y modales"
```

---

### Task 7: Panel UI (`med-pharm-profile-panel.mjs`)

**Files:**
- Create: `public/js/features/med-pharm-profile-panel.mjs`
- Modify: `public/js/app-runtimes.mjs` o bundle entry (registrar imports)
- Modify: `public/js/features/medications.mjs`

- [ ] **Step 1: Registrar runtime**

```javascript
import { medPharmProfileByPatient, saveState } from '../app-state.mjs';
import {
  parseSomePharmMonthPaste,
  mergeRecetaIntoMonth,
  adherenceStats,
  toggleNotAdmin,
  formatFreqShort,
  formatViaShort,
  splitMonthAt,
} from '../med-pharm-profile-core.mjs';

let rt = { getActiveId() { return null; }, showToast() {} };

export function registerMedPharmProfileRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

let viewYear = new Date().getFullYear();
let viewMonthIndex = new Date().getMonth();
let listFilter = 'TODOS';

export function setMedSubview(mode) { /* receta | perfil — toggle display + render */ }
export function renderMedPharmProfilePanel() { /* lista colapsada */ }
export function importMedPharmMonthPaste() { /* leer #med-pharm-paste, parse, save */ }
export function openMedPharmFullModal() { /* buildUnifiedTable en #med-pharm-modal-full */ }
export function openMedPharmRowModal(rowKey) { /* modal un med */ }
```

Portar `buildUnifiedTable` / `appendDayHeaderCells` / `padDayRow` del mockup (script v12) al módulo; usar `cellTag 'th'` en encabezados.

- [ ] **Step 2: Wire en medications.mjs**

```javascript
import {
  registerMedPharmProfileRuntime,
  setMedSubview,
  renderMedPharmProfilePanel,
  onRecetaMergedToProfile,
} from './med-pharm-profile-panel.mjs';

// en registerMedicationsRuntime o boot:
registerMedPharmProfileRuntime({ getActiveId: rt.getActiveId, showToast: rt.showToast });

// al final de procesarRecetaMed después saveState:
onRecetaMergedToProfile(activeId, medRecetaByPatient[activeId]);
```

- [ ] **Step 3: Exponer funciones globales** si el HTML usa `onclick` (patrón app): `setMedSubview`, `importMedPharmMonthPaste`, etc. vía `window` en el mismo sitio que `procesarRecetaMed`.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/med-pharm-profile-panel.mjs public/js/features/medications.mjs public/js/app-runtimes.mjs
git commit -m "feat(med-pharm): panel lista y modales SOME"
```

---

### Task 8: Tabla unificada y interacción celda

**Files:**
- Modify: `public/js/features/med-pharm-profile-panel.mjs`

- [ ] **Step 1: buildUnifiedTable**

Generar una sola `<table class="some-grid-unified">` por mockup:
- thead 2 filas días (`splitMonthAt(daysInMonth)`)
- tbody: por fila med, dos `<tr>` (band 1 y band 2) con mismas celdas meta `rowspan=2`
- celdas día: clase `indicated` si `days[d]>0`, `not-admin` si `notAdmin[d]`, `today` si coincide

- [ ] **Step 2: Delegación clic**

En contenedor modal, `click` en `td.day-pad.indicated` → `toggleNotAdmin` → `saveState()` → re-render modal abierto.

- [ ] **Step 3: Prueba manual**

1. Paciente demo con pegado mes en textarea perfil → Importar  
2. Vista SOME pantalla completa → columnas alineadas  
3. Clic celda → borde rojo + stats actualizados en lista  

- [ ] **Step 4: Commit**

```bash
git add public/js/features/med-pharm-profile-panel.mjs
git commit -m "feat(med-pharm): grid unificado y toggle no administrado"
```

---

### Task 9: Integración final y regresión

**Files:**
- Modify: `public/js/features/medications.mjs`
- Optional: `public/js/app-boot-imports.test.mjs`

- [ ] **Step 1: `renderMedRecetaPanel` respeta subvista**

Si subvista activa es `perfil`, llamar `renderMedPharmProfilePanel()` y ocultar bloques receta.

- [ ] **Step 2: Borrado paciente**

Donde se borra `medRecetaByPatient[pid]`, borrar también `medPharmProfileByPatient[pid]`.

- [ ] **Step 3: Run suite**

Run: `npm test`  
Expected: all pass (o solo fallos preexistentes documentados)

- [ ] **Step 4: Build UI check**

Run: `npm run build:ui:check`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/features/medications.mjs public/js/features/med-pharm-profile-panel.mjs
git commit -m "feat(med-pharm): integración Medicamentos y limpieza paciente"
```

---

## Plan self-review (spec coverage)

| Requisito spec | Task |
|----------------|------|
| Toggle Receta / Perfil | 6, 7 |
| Lista + Freq/Vía/adherencia | 7 |
| Modal fullscreen tabla única | 5, 8 |
| Parse SOME mensual | 2, 7 |
| Merge Receta + huecos | 2, 7 |
| notAdmin por celda | 1, 8 |
| Persistencia + backup/LAN | 3, 4 |
| Sin export TSV v1 | — (omitido) |
| Relleno solo con Receta v1 | 2 (documentado) |

Placeholder scan: ningún TBD en pasos de código.

---

## Execution handoff

**Plan guardado en** `docs/superpowers/plans/2026-05-31-perfil-farmacoterapeutico.md`.

**Spec guardada en** `docs/superpowers/specs/2026-05-31-perfil-farmacoterapeutico-design.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — un subagente por task, revisión entre tasks.  
2. **Inline Execution** — implementar en esta sesión con checkpoints.

¿Con cuál seguimos?
