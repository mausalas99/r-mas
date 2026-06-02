# Drive import (HC + Eventualidades) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Clínico modal to paste Google Drive ward documents, auto-detect the writing format, preview HC + eventualidades mapping, and apply to the active patient or create a new patient.

**Architecture:** Pure parsing in `lib/drive-import/` (Node-testable, no DOM). Renderer modal orchestrates preview/apply, reuses `historia-clinica-panel` persistence patterns and `appendEventualidad` from `eventualidades-panel.mjs`. Four format profiles with scored auto-detection.

**Spec:** `docs/superpowers/specs/2026-06-02-drive-import-hc-eventualidades-design.md`

**Tech Stack:** Node built-in test runner, vanilla ES modules, existing HC/eventualidades patient fields, `applyClinicalHistoryUppercase` from `lib/historia-clinica/clinical-text.mjs`.

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/drive-import/normalize.mjs` | CRLF, blank lines, trim lines |
| `lib/drive-import/segment.mjs` | Split by section headers; exclude ESTADO ACTUAL |
| `lib/drive-import/parse-header.mjs` | Pipe header + ficha NOMBRE/EDAD/SEXO |
| `lib/drive-import/eventualidad-dates.mjs` | Parse `d/m`, infer year, ISO via noon local |
| `lib/drive-import/map-to-eventualidades.mjs` | Dated blocks → `{ at, text }[]` |
| `lib/drive-import/map-to-hc.mjs` | Section bodies → partial HC data |
| `lib/drive-import/merge-hc-patch.mjs` | `fill` / `replace` merge on `HistoriaClinicaData` |
| `lib/drive-import/merge-eventualidades.mjs` | Dedup keys + filter new entries |
| `lib/drive-import/registry.mjs` | Profiles + `detectProfile` + `parseWithProfile` |
| `lib/drive-import/profiles/drive-pipe-hc-v1.mjs` | Andrés-style |
| `lib/drive-import/profiles/drive-ficha-hc-v1.mjs` | Víctor-style |
| `lib/drive-import/profiles/drive-eventos-only-v1.mjs` | Fragment / short bullets |
| `lib/drive-import/profiles/drive-fragment-v1.mjs` | Fallback |
| `lib/drive-import/parse-drive-document.mjs` | Public `parseDriveDocument(text, profileId?)` |
| `lib/drive-import/fixtures/*.txt` | Golden paste samples (trimmed) |
| `lib/drive-import/*.test.mjs` | Unit tests |
| `public/js/features/drive-import-modal.mjs` | Modal UI + apply |
| `public/js/features/drive-import-apply.mjs` | Create patient + persist HC + EV (keeps modal thin) |
| `public/partials/chrome/overlays.html` | Modal markup |
| `public/styles/expediente.css` (or `modals.css`) | Layout `.drive-import-*` |
| `public/partials/layout/app-body.html` | Button on Clínico segment bar |
| `public/index.html` | Sync if duplicated |
| `public/js/features/pase-board.mjs` | Show button in Sala + `switchInnerTab` after success |
| `public/js/app-runtimes.mjs` | `registerDriveImportRuntime` |
| `public/js/app.js` | `window.openDriveImportModal` / close / confirm |
| `package.json` | Add `lib/drive-import/**/*.test.mjs` to `test` script |

---

### Task 1: Normalize + segment + header parser

**Files:**
- Create: `lib/drive-import/normalize.mjs`
- Create: `lib/drive-import/segment.mjs`
- Create: `lib/drive-import/parse-header.mjs`
- Create: `lib/drive-import/segment.test.mjs`
- Create: `lib/drive-import/parse-header.test.mjs`

- [ ] **Step 1: Write failing segment test**

```js
// lib/drive-import/segment.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitDocumentSections } from './segment.mjs';

test('splitDocumentSections finds EVENTUALIDADES and excludes ESTADO ACTUAL body', () => {
  const text = [
    'EVENTUALIDADES',
    '01/06',
    'NOTA DEL DIA',
    'ESTADO ACTUAL',
    'N: ALERTA',
    '01/06',
    'OTRA NOTA',
  ].join('\n');
  const s = splitDocumentSections(text);
  assert.ok(s.eventualidadesBlocks.length >= 1);
  const evText = s.eventualidadesBlocks.join('\n');
  assert.match(evText, /OTRA NOTA/);
  assert.doesNotMatch(evText, /N: ALERTA/);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test lib/drive-import/segment.test.mjs`  
Expected: cannot find module

- [ ] **Step 3: Implement `normalize.mjs`**

```js
export function normalizeDrivePaste(text) {
  return String(text == null ? '' : text)
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

- [ ] **Step 4: Implement `segment.mjs`**

Key exports:

```js
export const SECTION_MARKERS = [
  { key: 'eventualidades', re: /^EVENTUALIDADES(\s+EN ESTE INTERNAMIENTO)?\s*$/i },
  { key: 'estadoActual', re: /^ESTADO ACTUAL\b/i },
  { key: 'historiaClinica', re: /^HISTORIA CL[IÍ]NICA\s*$/i },
  { key: 'ficha', re: /^FICHA DE IDENTIFICACI[ÓO]N\s*$/i },
  { key: 'peea', re: /^(PADECIMIENTO ACTUAL\s*\/\s*PEEA|PEEA)\s*$/i },
  // ... DX:, MOTIVO DE CONSULTA, ANTECEDENTES..., etc.
];

export function splitDocumentSections(rawText) {
  const text = normalizeDrivePaste(rawText);
  const lines = text.split('\n');
  // Walk lines; on marker line start new section bucket
  // Return { headerLine, sections: Record<string,string>, eventualidadesBlocks: string[], warnings: string[] }
  // When inside estadoActual, set flag skipUntilNextMarker — do not append to eventualidades
}
```

- [ ] **Step 5: Implement `parse-header.mjs`**

```js
const PIPE_RE =
  /^(\d+-\d+)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*AÑOS\s*\|\s*([\d-]+)\s*\|\s*(.+)$/i;

export function parsePipeHeader(firstLines) {
  for (const line of firstLines.slice(0, 5)) {
    const m = PIPE_RE.exec(line.trim());
    if (m) {
      return {
        cama: m[1],
        nombre: m[2].trim(),
        edad: m[3],
        registro: m[4].trim(),
        resumenDx: m[5].trim(),
      };
    }
  }
  return null;
}

export function parseFichaIdentificacion(block) {
  // NOMBRE:, EDAD:, SEXO:, ORIGEN:, ... → identificacion object + sexo M/F
}
```

- [ ] **Step 6: Header test**

```js
import { parsePipeHeader } from './parse-header.mjs';
test('parsePipeHeader', () => {
  const h = parsePipeHeader([
    '214-4 | VÍCTOR IRACHETA TORRES | 64 AÑOS | 1123383-2 | CHOQUE SÉPTICO',
  ]);
  assert.equal(h.registro, '1123383-2');
  assert.equal(h.edad, '64');
});
```

- [ ] **Step 7: Run tests — expect PASS**

Run: `node --test lib/drive-import/segment.test.mjs lib/drive-import/parse-header.test.mjs`

- [ ] **Step 8: Commit**

```bash
git add lib/drive-import/normalize.mjs lib/drive-import/segment.mjs lib/drive-import/parse-header.mjs lib/drive-import/*.test.mjs
git commit -m "feat(drive-import): add normalize, segment, and header parsers"
```

---

### Task 2: Eventualidad dates + map-to-eventualidades

**Files:**
- Create: `lib/drive-import/eventualidad-dates.mjs`
- Create: `lib/drive-import/map-to-eventualidades.mjs`
- Create: `lib/drive-import/map-to-eventualidades.test.mjs`
- Create: `lib/drive-import/fixtures/eventos-short.txt` (Variante 2 sample)

- [ ] **Step 1: Failing test — short bullets**

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapSectionsToEventualidades } from './map-to-eventualidades.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(join(dir, 'fixtures/eventos-short.txt'), 'utf8');

test('mapSectionsToEventualidades parses dd/mm bullet days', () => {
  const { entries, warnings } = mapSectionsToEventualidades(
    { eventualidadesBlocks: [sample], referenceYear: 2026 },
  );
  assert.ok(entries.length >= 2);
  assert.ok(entries[0].text.includes('HEMODIALISIS') || entries[0].text.includes('HEMODIÁLISIS'));
  assert.match(entries[0].at, /^2026-/);
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `eventualidad-dates.mjs`**

```js
/** @returns {{ day: number, month: number, year?: number } | null} */
export function parseDateLine(line) {
  const t = line.trim();
  let m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(t);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return { day: +m[1], month: +m[2], year: y };
  }
  m = /^(\d{1,2})[\/.\-](\d{1,2})$/.exec(t);
  if (m) return { day: +m[1], month: +m[2] };
  return null;
}

export function resolveYear(partial, hints) {
  if (partial.year) return partial.year;
  if (hints.referenceYear) return hints.referenceYear;
  // FIUX / ingreso year from hints.documentYear
  const now = new Date();
  let y = hints.documentYear || now.getFullYear();
  if (partial.month > now.getMonth() + 1) y -= 1;
  return y;
}

export function toNoonIso({ day, month, year }) {
  const dt = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
}
```

- [ ] **Step 4: Implement `map-to-eventualidades.mjs`**

```js
const DATE_LINE_RE = /^(\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?)\s*$/;
const MONITOREO_RE = /^(N|V|HD|HI|NM):/i;

export function mapSectionsToEventualidades({ eventualidadesBlocks, referenceYear, documentYear }) {
  const entries = [];
  const warnings = [];
  for (const block of eventualidadesBlocks) {
    const lines = block.split('\n');
    let curDate = null;
    let buf = [];
    function flush() {
      const text = buf.join('\n').trim();
      if (curDate && text) entries.push({ at: curDate, text });
      buf = [];
    }
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (MONITOREO_RE.test(line)) continue;
      const d = parseDateLine(line);
      if (d && DATE_LINE_RE.test(line)) {
        flush();
        const y = resolveYear(d, { referenceYear, documentYear });
        curDate = toNoonIso({ ...d, year: y });
        continue;
      }
      buf.push(line);
    }
    flush();
  }
  return { entries, warnings };
}
```

- [ ] **Step 5: Add fixture `eventos-short.txt`** (user Variante 2: `02/06` … `01/06/2026` …)

- [ ] **Step 6: Test long boilerplate does not split on ESTADO ACTUAL**

```js
test('ignores monitoreo lines inside eventualidades block', () => {
  const { entries } = mapSectionsToEventualidades({
    eventualidadesBlocks: ['23/05\nSE INDICA DIETA\nN: ALERTA\n24/05\nOTRO'],
    referenceYear: 2026,
  });
  assert.equal(entries.length, 2);
  assert.doesNotMatch(entries[0].text, /N: ALERTA/);
});
```

- [ ] **Step 7: Run tests — PASS**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(drive-import): map dated eventualidades blocks"
```

---

### Task 3: HC mapping + merge patch

**Files:**
- Create: `lib/drive-import/map-to-hc.mjs`
- Create: `lib/drive-import/merge-hc-patch.mjs`
- Create: `lib/drive-import/merge-hc-patch.test.mjs`
- Create: `lib/drive-import/profiles/drive-pipe-hc-v1.mjs`
- Create: `lib/drive-import/profiles/drive-ficha-hc-v1.mjs`
- Create: `lib/drive-import/fixtures/pipe-andres.txt` (trimmed Andrés HC portions)
- Create: `lib/drive-import/fixtures/ficha-victor.txt` (trimmed Víctor HC portions)

- [ ] **Step 1: Failing merge test**

```js
import { mergeHcPatch } from './merge-hc-patch.mjs';

test('mergeHcPatch fill mode only writes empty strings', () => {
  const existing = { motivoConsulta: 'DOLOR', padecimientoActual: '' };
  const patch = { motivoConsulta: 'OTRO', padecimientoActual: 'PEEA LARGO' };
  const out = mergeHcPatch(existing, patch, 'fill');
  assert.equal(out.motivoConsulta, 'DOLOR');
  assert.equal(out.padecimientoActual, 'PEEA LARGO');
});

test('mergeHcPatch replace overwrites present sections', () => {
  const existing = { motivoConsulta: 'DOLOR' };
  const patch = { motivoConsulta: 'OTRO' };
  const out = mergeHcPatch(existing, patch, 'replace');
  assert.equal(out.motivoConsulta, 'OTRO');
});
```

- [ ] **Step 2: Implement `merge-hc-patch.mjs`**

```js
function isEmptyString(v) {
  return v == null || (typeof v === 'string' && !v.trim());
}

function mergeObjectFill(tgt, src) {
  const out = { ...tgt };
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = mergeObjectFill(
        tgt[k] && typeof tgt[k] === 'object' ? tgt[k] : {},
        v,
      );
    } else if (isEmptyString(out[k])) {
      out[k] = v;
    }
  }
  return out;
}

export function mergeHcPatch(existing, patch, mode) {
  if (mode === 'replace') return deepMergeReplace(existing, patch);
  return mergeObjectFill(existing, patch);
}
```

- [ ] **Step 3: Implement profile mappers**

`drive-pipe-hc-v1.mjs`:

```js
export const id = 'drive-pipe-hc-v1';
export const label = 'Guardia — encabezado | y HC clásica';
export function score(sections, header) {
  let s = 0;
  if (header) s += 30;
  if (sections.historiaClinica) s += 25;
  if (sections.peea) s += 20;
  if (sections.ficha) s -= 40;
  return s;
}
export function mapHc(sections) {
  return {
    identificacion: parseKeyValueBlock(sections.historiaClinica),
    motivoConsulta: sections.motivoConsulta || '',
    signosVitalesIngreso: sections.signosVitales || '',
    apnp: parseApnpBlock(sections.antecedentesPersonales),
    ahf: { descripcionDetallada: sections.antecedentesHeredofamiliares || '' },
    app: parseAppPipeSections(sections),
    padecimientoActual: sections.peea || '',
  };
}
```

`drive-ficha-hc-v1.mjs` — map `sections.ficha`, `apnpNoPat`, `apnpPat`, combined `peea`.

- [ ] **Step 4: Pipe fixture test**

```js
test('drive-pipe-hc-v1 maps PEEA and motivo', () => {
  const doc = splitDocumentSections(readFixture('pipe-andres.txt'));
  const patch = drivePipe.mapHc(doc.sections);
  assert.ok(patch.padecimientoActual.length > 100);
  assert.ok(patch.motivoConsulta || patch.identificacion);
});
```

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

---

### Task 4: Profile registry + parse orchestrator

**Files:**
- Create: `lib/drive-import/registry.mjs`
- Create: `lib/drive-import/profiles/drive-eventos-only-v1.mjs`
- Create: `lib/drive-import/profiles/drive-fragment-v1.mjs`
- Create: `lib/drive-import/parse-drive-document.mjs`
- Create: `lib/drive-import/parse-drive-document.test.mjs`
- Create: `lib/drive-import/fixtures/ficha-victor-full.txt` (header + HC + dual EV sections — trimmed)

- [ ] **Step 1: Failing detect test**

```js
import { detectProfile, parseDriveDocument } from './parse-drive-document.mjs';
import { readFileSync } from 'node:fs';
// ...

test('detectProfile picks ficha for Victor sample', () => {
  const text = readFileSync(join(fixtures, 'ficha-victor-full.txt'), 'utf8');
  const r = parseDriveDocument(text);
  assert.equal(r.profileId, 'drive-ficha-hc-v1');
  assert.ok(r.eventualidades.entries.length >= 3);
  assert.ok(r.header.registro);
});
```

- [ ] **Step 2: Implement `registry.mjs`**

```js
import * as pipe from './profiles/drive-pipe-hc-v1.mjs';
import * as ficha from './profiles/drive-ficha-hc-v1.mjs';
import * as evOnly from './profiles/drive-eventos-only-v1.mjs';
import * as fragment from './profiles/drive-fragment-v1.mjs';

const PROFILES = [ficha, pipe, evOnly, fragment];

export function detectProfile(sections, header) {
  const scored = PROFILES.map((p) => ({
    id: p.id,
    label: p.label,
    score: p.score(sections, header),
  })).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const id = top && top.score >= 40 ? top.id : 'drive-fragment-v1';
  return { profileId: id, scored };
}
```

- [ ] **Step 3: Implement `parse-drive-document.mjs`**

```js
export function parseDriveDocument(rawText, profileIdOverride) {
  const sections = splitDocumentSections(rawText);
  const header = parsePipeHeader(sections.headerLines) || null;
  const fichaHeader = parseFichaIdentificacion(sections.sections.ficha || '');
  const detected = detectProfile(sections, header);
  const profileId = profileIdOverride || detected.profileId;
  const profile = getProfile(profileId);
  const hcPatch = profile.mapHc ? profile.mapHc(sections) : {};
  const { entries, warnings: evWarn } = mapSectionsToEventualidades({
    eventualidadesBlocks: sections.eventualidadesBlocks,
    referenceYear: inferReferenceYear(sections),
    documentYear: inferDocumentYear(sections),
  });
  return {
    profileId,
    profileLabel: profile.label,
    detected,
    header: mergeHeader(header, fichaHeader),
    hcPatch,
    eventualidades: { entries, skipped: [] },
    warnings: [...sections.warnings, ...evWarn],
    preview: buildPreviewSummary(...),
  };
}
```

- [ ] **Step 4: `drive-eventos-only-v1` scores high when no HC markers**

- [ ] **Step 5: Run full lib tests**

Run: `node --test lib/drive-import/*.test.mjs`

- [ ] **Step 6: Commit**

---

### Task 5: Dedup + merge eventualidades (lib)

**Files:**
- Create: `lib/drive-import/merge-eventualidades.mjs`
- Create: `lib/drive-import/merge-eventualidades.test.mjs`

- [ ] **Step 1: Failing dedup test**

```js
import { dedupeEventualidadKey, filterNewEventualidades } from './merge-eventualidades.mjs';

test('filterNewEventualidades skips duplicate keys', () => {
  const existing = [{ at: '2026-06-01T18:00:00.000Z', text: 'SE INDICA DIETA' }];
  const incoming = [
    { at: '2026-06-01T18:00:00.000Z', text: 'SE INDICA DIETA' },
    { at: '2026-06-02T18:00:00.000Z', text: 'NUEVO' },
  ];
  const { toAdd, skipped } = filterNewEventualidades(existing, incoming);
  assert.equal(toAdd.length, 1);
  assert.equal(skipped, 1);
});
```

- [ ] **Step 2: Implement**

```js
import { normalizeEventualidadText } from '../../public/js/features/eventualidades-panel.mjs';
// Prefer: extract normalize to lib/historia-clinica/clinical-text already has toClinicalHistoryText
import { toClinicalHistoryText } from '../historia-clinica/clinical-text.mjs';

export function dedupeEventualidadKey(entry) {
  const day = String(entry.at || '').slice(0, 10);
  const prefix = toClinicalHistoryText(entry.text).trim().slice(0, 160);
  return day + '|' + prefix;
}
```

If importing from `public/js/features/eventualidades-panel.mjs` in Node tests causes bundle issues, duplicate thin normalizer in `merge-eventualidades.mjs` using `toClinicalHistoryText` only (same as panel).

- [ ] **Step 3: Run test — PASS**

- [ ] **Step 4: Commit**

---

### Task 6: Modal markup + styles

**Files:**
- Modify: `public/partials/chrome/overlays.html`
- Modify: `public/index.html` (overlay block if mirrored)
- Modify: `public/styles/modals.css` or `public/styles/expediente.css`

- [ ] **Step 1: Add backdrop** (after `lab-bulk-preview-backdrop`):

```html
<div id="drive-import-backdrop" class="modal-backdrop" aria-hidden="true">
  <div class="modal drive-import-modal" role="dialog" aria-modal="true"
    aria-labelledby="drive-import-title" onclick="event.stopPropagation()">
    <header class="drive-import-head">
      <h3 id="drive-import-title">Importar desde Drive</h3>
      <p class="drive-import-hint">Pega el documento copiado desde Google Docs. Revisa el perfil detectado antes de aplicar.</p>
    </header>
    <div class="drive-import-body">
      <textarea id="drive-import-input" class="drive-import-input" rows="14"
        spellcheck="false" aria-label="Texto del documento"></textarea>
      <div class="drive-import-controls">
        <label>Formato <select id="drive-import-profile"></select></label>
        <fieldset id="drive-import-mode-fieldset" class="drive-import-modes">
          <legend>Modo</legend>
          <label><input type="radio" name="drive-import-mode" value="fill" checked /> Completar vacíos en HC</label>
          <label><input type="radio" name="drive-import-mode" value="replace" /> Reemplazar HC</label>
          <label><input type="radio" name="drive-import-mode" value="eventos" /> Solo eventualidades</label>
        </fieldset>
      </div>
      <div id="drive-import-preview" class="drive-import-preview" aria-live="polite"></div>
      <p id="drive-import-warning" class="drive-import-warning" hidden></p>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn-med-secondary btn-med-secondary--muted"
        onclick="closeDriveImportModal()">Cancelar</button>
      <button type="button" class="btn-generate" id="drive-import-confirm"
        onclick="confirmDriveImport()">Aplicar</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: CSS grid** — `.drive-import-body { display: grid; grid-template-columns: 1fr 280px; gap: 1rem; }` with `@media (max-width: 900px)` stack.

- [ ] **Step 3: Run `npm run build:ui`**

- [ ] **Step 4: Commit**

---

### Task 7: Clínico entry button (Sala only)

**Files:**
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/index.html`
- Modify: `public/js/features/pase-board.mjs`

- [ ] **Step 1: Add button inside `#exp-segment-clinico` bar**

```html
<button type="button" class="btn-med-secondary drive-import-trigger"
  id="btn-drive-import" onclick="openDriveImportModal()"
  style="display:none;" aria-label="Importar desde Drive">
  Importar desde Drive
</button>
```

- [ ] **Step 2: In `pase-board.mjs` (or `syncConsolidatedSegmentBar` caller), show `#btn-drive-import` when `isSalaMode()` and hide in Interconsulta**

```js
function syncDriveImportButtonVisibility() {
  const btn = document.getElementById('btn-drive-import');
  if (!btn) return;
  const sala = /* existing isSala helper */;
  btn.style.display = sala ? '' : 'none';
}
```

Call from existing expediente tab sync path.

- [ ] **Step 3: Manual check** — button visible in Sala Clínico only.

- [ ] **Step 4: Commit**

---

### Task 8: `drive-import-modal.mjs` — preview + open/close

**Files:**
- Create: `public/js/features/drive-import-modal.mjs`
- Modify: `public/js/app-runtimes.mjs`
- Modify: `public/js/app.js`

- [ ] **Step 1: Implement preview wiring**

```js
import { parseDriveDocument } from '../../../lib/drive-import/parse-drive-document.mjs';

let rt = { getActiveId() { return null; }, showToast() {}, getActivePatient() { return null; } };

export function registerDriveImportRuntime(partial) {
  Object.assign(rt, partial);
}

function refreshPreview() {
  const ta = document.getElementById('drive-import-input');
  const profileSel = document.getElementById('drive-import-profile');
  const prev = document.getElementById('drive-import-preview');
  const text = ta ? ta.value : '';
  const parsed = parseDriveDocument(text, profileSel.value || undefined);
  // populate profile dropdown options from registry labels once
  prev.textContent = formatPreview(parsed); // sections filled, N ev, M skipped estimate
}

export function openDriveImportModal() {
  const bd = document.getElementById('drive-import-backdrop');
  if (!bd) return rt.showToast('Importación Drive no disponible', 'error');
  const patient = rt.getActivePatient();
  const modeFs = document.getElementById('drive-import-mode-fieldset');
  if (modeFs) modeFs.style.display = patient ? '' : 'none';
  document.getElementById('drive-import-confirm').textContent =
    patient ? 'Aplicar a ' + (patient.nombre || 'paciente') : 'Crear paciente e importar';
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  refreshPreview();
}
```

Debounce `input` on textarea (~200ms) and `change` on profile select.

- [ ] **Step 2: Register runtime in `app-runtimes.mjs`**

```js
import { registerDriveImportRuntime, openDriveImportModal, closeDriveImportModal, confirmDriveImport } from './features/drive-import-modal.mjs';

registerDriveImportRuntime({
  getActiveId: () => getActivePatientId(),
  getActivePatient: () => patients.find(...),
  showToast: showToast,
  pushUndoSnapshot,
  selectPatient,
  switchInnerTab: (tab) => window.switchInnerTab(tab),
});
```

- [ ] **Step 3: Expose on `window` in `app.js`**

```js
window.openDriveImportModal = openDriveImportModal;
window.closeDriveImportModal = closeDriveImportModal;
window.confirmDriveImport = confirmDriveImport;
```

- [ ] **Step 4: Commit**

---

### Task 9: Apply flow — create + active patient

**Files:**
- Create: `public/js/features/drive-import-apply.mjs`
- Modify: `public/js/features/drive-import-modal.mjs`

- [ ] **Step 1: `applyDriveImport(parsed, options)`**

```js
import { patients, saveState } from '../app-state.mjs';
import { defaultHistoriaClinicaData } from '../../../lib/historia-clinica/defaults.mjs';
import { applyClinicalHistoryUppercase } from '../../../lib/historia-clinica/clinical-text.mjs';
import { migrateLegacyHistoriaData } from '../../../lib/historia-clinica/migrate-legacy.mjs';
import { mergeHcPatch } from '../../../lib/drive-import/merge-hc-patch.mjs';
import { filterNewEventualidades } from '../../../lib/drive-import/merge-eventualidades.mjs';
import { appendEventualidad } from './eventualidades-panel.mjs';
import { generatePatientId, selectPatient } from './patients.mjs';
import { normalizeData } from './historia-clinica-panel.mjs'; // export normalizeData if needed

export async function applyDriveImport(parsed, { mode, patientId, createNew }) {
  // createNew: build patient from parsed.header, unshift patients
  // HC: start from defaultHistoriaClinicaData + normalizeData
  // if mode !== 'eventos': mergeHcPatch + applyClinicalHistoryUppercase on data
  // patient.historiaClinica = { version: 1, data }
  // EV: filterNewEventualidades; loop appendEventualidad
  // saveState(); return { evAdded, evSkipped, navigatedTo: 'historia'|'eventualidades' }
}
```

Export `normalizeData` from `historia-clinica-panel.mjs` if not already exported (small export addition).

- [ ] **Step 2: Registro mismatch warning in `confirmDriveImport`**

```js
const active = rt.getActivePatient();
if (active && parsed.header?.registro && parsed.header.registro !== active.registro) {
  if (!confirm('El registro del documento (' + parsed.header.registro + ') no coincide con el paciente activo. ¿Continuar?')) return;
}
if (mode === 'replace' && !confirm('Se sobrescribirán secciones de Historia clínica presentes en el documento. ¿Continuar?')) return;
```

- [ ] **Step 3: Undo + audit**

```js
rt.pushUndoSnapshot('Importar desde Drive');
// after save:
addAuditEntry('drive-import', 'ok', evAdded, JSON.stringify({ profileId: parsed.profileId, mode }));
```

Wire `addAuditEntry` via runtime from `platform.mjs` or existing audit helper.

- [ ] **Step 4: Post-success navigation**

```js
rt.switchInnerTab(navigatedTo === 'eventualidades' ? 'eventualidades' : 'historia');
rt.showToast(`HC actualizada · ${evAdded} eventualidades nuevas · ${evSkipped} duplicadas omitidas`, 'success');
```

- [ ] **Step 5: Commit**

---

### Task 10: Tests in package.json + build + manual QA

**Files:**
- Modify: `package.json`
- Modify: `public/js/app-boot-imports.test.mjs` (if exists — assert drive-import-modal importable)

- [ ] **Step 1: Append to `npm test` script**

```
lib/drive-import/segment.test.mjs
lib/drive-import/parse-header.test.mjs
lib/drive-import/map-to-eventualidades.test.mjs
lib/drive-import/merge-hc-patch.test.mjs
lib/drive-import/merge-eventualidades.test.mjs
lib/drive-import/parse-drive-document.test.mjs
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`  
Expected: all pass

- [ ] **Step 3: `npm run build:ui`**

- [ ] **Step 4: Manual QA checklist**

1. Sala → Clínico → **Importar desde Drive** visible; Interconsulta hidden.
2. Paste Andrés fixture → profile `drive-pipe-hc-v1` → preview shows HC sections + eventualidades count.
3. Active patient → **Completar vacíos** → only empty HC fields filled; eventualidades appended.
4. Paste same doc again → duplicadas omitidas in toast.
5. **Reemplazar HC** → confirm dialog → motivo/PEEA overwritten.
6. **Solo eventualidades** → HC unchanged.
7. No active patient → **Crear paciente** → new row with registro/cama; HC + EV populated.
8. Victor ficha doc → `drive-ficha-hc-v1`; `NOMBRE` in identificacion.
9. Short `02/06` variante → events parsed; no `N:` lines in EV text.
10. Document with `ESTADO ACTUAL` → preview warns not imported.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(drive-import): modal, apply flow, and Clínico entry"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Paste-only modal | Task 6–8 |
| 4 profiles + auto-detect | Task 4 |
| HC + eventualidades only | Tasks 3–5, 9 |
| Apply modes fill/replace/eventos | Tasks 3, 8–9 |
| Dedup | Task 5 |
| Create vs active patient | Task 9 |
| Exclude ESTADO ACTUAL | Task 2 |
| Dual EVENTUALIDADES sections merged | Task 1–2 |
| Clínico button Sala only | Task 7 |
| Undo + audit | Task 9 |
| Fixtures from user samples | Tasks 2–4 |
| LAN HC versioning | Task 9 uses local `patient.historiaClinica` first; follow-up: call `lanPushHistoriaClinica` when LAN active (add sub-step in Task 9 if `isLanSessionConfiguredForRest()` — mirror `saveHistoria` in panel) |

**LAN follow-up (include in Task 9 Step 3b):** If `isLanSessionConfiguredForRest()` and room id present, push HC via `createMutationBuilder` + `lanPushHistoriaClinica` instead of only local assign — same as `historia-clinica-panel.mjs` save path.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-02-drive-import-hc-eventualidades.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with executing-plans and checkpoints  

Which approach do you want?
