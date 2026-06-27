# Lab repo scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import intrahospital lab PDFs from `http://148.234.140.71/laboratorio/index.aspx` into R+ lab historial by registro + date range, reusing `procesarLabs` and bulk-import paths; delete PDFs immediately after text extraction.

**Architecture:** Main-process HTTP client (`lib/lab-repo/`) handles ASP.NET ViewState, REGISTRO toggle, table parse, PDF download, and `pdf-parse` text extraction. Renderer modal calls IPC, runs hybrid import gate, then `buildBulkLabPreview` / `finalizeBulkLabPaste` or review modal.

**Spec:** `docs/superpowers/specs/2026-06-27-lab-repo-scraper-design.md`

**Tech Stack:** Node `fetch` (Electron 41), `pdf-parse`, vanilla ESM, existing `procesarLabs` / `lab-bulk-paste` / `lab-bulk-preview-modal`, IPC via `preload.js`.

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/lab-repo/constants.mjs` | `LAB_REPO_BASE_URL`, search mode labels |
| `lib/lab-repo/portal-html.mjs` | Parse ViewState fields, results table, date filter |
| `lib/lab-repo/portal-client.mjs` | GET session, set REGISTRO mode, POST Buscar |
| `lib/lab-repo/portal-select.mjs` | Row **Seleccionar** postback → PDF bytes |
| `lib/lab-repo/pdf-text.mjs` | PDF buffer → SOME text |
| `lib/lab-repo/fetch-run.mjs` | Temp dir lifecycle, orchestrate N folios |
| `lib/lab-repo/lab-repo-fetch.mjs` | Public `fetchLabRepoStudies(opts)` for IPC |
| `lib/lab-repo/fixtures/*.html` | Recorded portal HTML (no PHI in committed fixtures — use synthetic/registro-only rows) |
| `lib/lab-repo/fixtures/sample-some.pdf` | Anonymized SOME PDF golden (optional; can use text fixture if PDF unavailable in CI) |
| `lib/lab-repo/*.test.mjs` | Unit tests (no live network) |
| `main.js` | `ipcMain.handle('lab-repo-fetch', …)` |
| `preload.js` | `electronAPI.labRepoFetch(payload)` |
| `public/js/features/lab-repo-import-gate.mjs` | Hybrid silent vs review decision |
| `public/js/features/lab-repo-import.mjs` | Modal UI, IPC, import orchestration |
| `public/js/features/lab-repo-import.test.mjs` | Gate + block builder tests |
| `public/partials/chrome/overlays.html` | Modal markup (via `build-ui`) |
| `public/styles/lab-panel.css` (or existing lab styles) | `.lab-repo-import-*` |
| `public/index.html` / partial source | **Importar del repositorio** button in lab card actions |
| `public/js/features/lab-panel.mjs` | Register runtime + `windowHandlers.openLabRepoImportModal` |
| `public/js/lazy-feature-routes.mjs` | Export handler name if needed |
| `package.json` | Add `pdf-parse` dependency; append `lib/lab-repo/*.test.mjs` + renderer test to `test` script |
| `docs/features/features-index.md` | Link spec |

---

### Task 0: Capture portal fixtures (manual, hospital LAN)

**Files:**
- Create: `lib/lab-repo/fixtures/index-initial.html`
- Create: `lib/lab-repo/fixtures/search-results-registro.html`
- Create: `lib/lab-repo/fixtures/README.md`

- [ ] **Step 1: Save initial page HTML**

On hospital LAN, open `http://148.234.140.71/laboratorio/index.aspx` in browser → View Source → save as `index-initial.html`. Redact patient names if committing real data; keep form field `name=` attributes and `__VIEWSTATE` structure.

- [ ] **Step 2: Save post-search HTML with REGISTRO mode**

Toggle **REGISTRO**, search a test registro with known results → save results page as `search-results-registro.html`.

- [ ] **Step 3: Document control names in README**

In `lib/lab-repo/fixtures/README.md`, record:
- Dropdown/listbox `name` for NOMBRE/REGISTRO toggle
- Input `name` for search text
- **Buscar** button `name` / `value`
- **Seleccionar** link pattern (`__doPostBack` target + argument per row)

- [ ] **Step 4: Optional — save one anonymized PDF**

Download one PDF via **Seleccionar** → redact if needed → `fixtures/sample-some.pdf`.

---

### Task 1: Portal HTML parsing + date filter

**Files:**
- Create: `lib/lab-repo/constants.mjs`
- Create: `lib/lab-repo/portal-html.mjs`
- Create: `lib/lab-repo/portal-html.test.mjs`
- Test: `lib/lab-repo/portal-html.test.mjs`

- [ ] **Step 1: Write failing table parse test**

```js
// lib/lab-repo/portal-html.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAspNetHiddenFields, parseLabResultRows, filterRowsByDateRange } from './portal-html.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const FIX = (name) => fs.readFileSync(path.join(__dir, 'fixtures', name), 'utf8');

test('parseAspNetHiddenFields extracts ViewState trio', () => {
  const html = FIX('index-initial.html');
  const h = parseAspNetHiddenFields(html);
  assert.ok(h.__VIEWSTATE);
  assert.ok(h.__EVENTVALIDATION);
});

test('parseLabResultRows reads Fecha Solicitud, Folio, Seleccionar target', () => {
  const html = FIX('search-results-registro.html');
  const rows = parseLabResultRows(html);
  assert.ok(rows.length >= 1);
  assert.match(rows[0].fechaSolicitud, /^\d{4}-\d{2}-\d{2}/);
  assert.ok(rows[0].folio);
  assert.ok(rows[0].selectEventTarget);
});

test('filterRowsByDateRange keeps rows inside inclusive window', () => {
  const rows = [
    { fechaSolicitud: '2026-06-27 03:35', folio: '1' },
    { fechaSolicitud: '2026-06-26 08:00', folio: '2' },
  ];
  const desde = new Date('2026-06-27T00:00:00');
  const hasta = new Date('2026-06-27T23:59:59');
  const out = filterRowsByDateRange(rows, desde, hasta);
  assert.equal(out.length, 1);
  assert.equal(out[0].folio, '1');
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test:one -- lib/lab-repo/portal-html.test.mjs`  
Expected: cannot find module `./portal-html.mjs`

- [ ] **Step 3: Implement `constants.mjs`**

```js
export const LAB_REPO_BASE_URL =
  'http://148.234.140.71/laboratorio/index.aspx';
export const LAB_REPO_SEARCH_MODE_REGISTRO = 'REGISTRO';
export const LAB_REPO_SEARCH_MODE_NOMBRE = 'NOMBRE';
```

- [ ] **Step 4: Implement `portal-html.mjs`**

```js
import { LAB_REPO_SEARCH_MODE_REGISTRO } from './constants.mjs';

export function parseAspNetHiddenFields(html) {
  const pick = (name) => {
    const re = new RegExp(
      'name="' + name + '"[^>]*value="([^"]*)"',
      'i'
    );
    const m = String(html || '').match(re);
    return m ? m[1] : '';
  };
  return {
    __VIEWSTATE: pick('__VIEWSTATE'),
    __VIEWSTATEGENERATOR: pick('__VIEWSTATEGENERATOR'),
    __EVENTVALIDATION: pick('__EVENTVALIDATION'),
  };
}

/** @returns {{ fechaSolicitud: string, nombre: string, registro: string, departamento: string, tipo: string, folio: string, selectEventTarget: string, selectEventArgument: string }[]} */
export function parseLabResultRows(html) {
  // Parse GridView/table: one <tr> per study after header row.
  // Extract columns by header index map (Fecha Solicitud, Nombre, Registro, Departamento, Tipo de Estudio, Folio).
  // Seleccionar: parse href __doPostBack('target','arg') or input name/value.
  // Return [] if no table (caller treats as error).
  return [];
}

export function parseFechaSolicitudMs(fechaSolicitud) {
  // '2026-06-27 03:35' → local Date ms
  const m = String(fechaSolicitud || '').match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/
  );
  if (!m) return NaN;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5])
  ).getTime();
}

export function filterRowsByDateRange(rows, desde, hasta) {
  const lo = desde instanceof Date ? desde.getTime() : NaN;
  const hi = hasta instanceof Date ? hasta.getTime() : NaN;
  return (rows || []).filter(function (row) {
    const ms = parseFechaSolicitudMs(row.fechaSolicitud);
    return Number.isFinite(ms) && ms >= lo && ms <= hi;
  });
}

/** Discover search controls from initial HTML — names filled from fixture README. */
export function parseSearchFormControls(html) {
  return {
    modeFieldName: '', // e.g. ctl00$ContentPlaceHolder1$ddlCriterio
    searchFieldName: '',
    searchButtonName: '',
    currentMode: '', // NOMBRE | REGISTRO
  };
}

export function isRegistroSearchMode(controls) {
  return String(controls.currentMode || '').toUpperCase() === LAB_REPO_SEARCH_MODE_REGISTRO;
}
```

Fill selector logic using fixture README control names during implementation — tests use real fixture HTML.

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm run test:one -- lib/lab-repo/portal-html.test.mjs`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/lab-repo/
git commit -m "feat(lab-repo): parse portal HTML table and date filter"
```

---

### Task 2: Portal client — REGISTRO toggle + search

**Files:**
- Create: `lib/lab-repo/portal-client.mjs`
- Create: `lib/lab-repo/portal-client.test.mjs`
- Modify: `lib/lab-repo/fixtures/README.md`

- [ ] **Step 1: Write failing client test with mocked fetch**

```js
// lib/lab-repo/portal-client.test.mjs
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLabRepoPortalClient } from './portal-client.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const initialHtml = fs.readFileSync(path.join(__dir, 'fixtures', 'index-initial.html'), 'utf8');
const resultsHtml = fs.readFileSync(path.join(__dir, 'fixtures', 'search-results-registro.html'), 'utf8');

test('searchByRegistro posts REGISTRO mode then returns parsed rows', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body || '' });
    if (calls.length === 1) return { ok: true, text: async () => initialHtml };
    if (calls.length === 2) return { ok: true, text: async () => initialHtml }; // mode set
    return { ok: true, text: async () => resultsHtml };
  };
  const client = createLabRepoPortalClient({ fetch: fetchFn });
  const rows = await client.searchByRegistro('2203912-1');
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => r.registro === '2203912-1' || r.registro.includes('2203912')));
  // Assert middle POST body includes REGISTRO mode value (exact string from fixture)
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test:one -- lib/lab-repo/portal-client.test.mjs`

- [ ] **Step 3: Implement `portal-client.mjs`**

```js
import {
  LAB_REPO_BASE_URL,
  LAB_REPO_SEARCH_MODE_REGISTRO,
} from './constants.mjs';
import {
  parseAspNetHiddenFields,
  parseLabResultRows,
  parseSearchFormControls,
  isRegistroSearchMode,
} from './portal-html.mjs';

function formBody(fields) {
  return new URLSearchParams(fields).toString();
}

export function createLabRepoPortalClient(deps) {
  const fetch = deps.fetch || globalThis.fetch;
  let cookieJar = deps.initialCookie || '';

  async function get(url) {
    const res = await fetch(url, {
      headers: cookieJar ? { Cookie: cookieJar } : {},
    });
    storeCookies(res);
    if (!res.ok) throw new Error('lab-repo-http-' + res.status);
    return res.text();
  }

  async function post(url, fields) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(cookieJar ? { Cookie: cookieJar } : {}),
      },
      body: formBody(fields),
    });
    storeCookies(res);
    if (!res.ok) throw new Error('lab-repo-http-' + res.status);
    return res.text();
  }

  function storeCookies(res) {
    const raw = res.headers.getSetCookie?.() || [];
    if (raw.length) cookieJar = raw.map((c) => c.split(';')[0]).join('; ');
  }

  async function ensureRegistroMode(html) {
    const controls = parseSearchFormControls(html);
    if (isRegistroSearchMode(controls)) return html;
    const hidden = parseAspNetHiddenFields(html);
    // POST __EVENTTARGET = mode dropdown change to REGISTRO (values from fixture README)
    const next = await post(LAB_REPO_BASE_URL, {
      ...hidden,
      __EVENTTARGET: controls.modeFieldName,
      __EVENTARGUMENT: '',
      [controls.modeFieldName]: LAB_REPO_SEARCH_MODE_REGISTRO,
    });
    return next;
  }

  async function searchByRegistro(registro) {
    const first = await get(LAB_REPO_BASE_URL);
    const modeHtml = await ensureRegistroMode(first);
    const hidden = parseAspNetHiddenFields(modeHtml);
    const controls = parseSearchFormControls(modeHtml);
    const resultHtml = await post(LAB_REPO_BASE_URL, {
      ...hidden,
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      [controls.modeFieldName]: LAB_REPO_SEARCH_MODE_REGISTRO,
      [controls.searchFieldName]: String(registro || '').trim(),
      [controls.searchButtonName]: 'Buscar',
    });
    return parseLabResultRows(resultHtml);
  }

  return { searchByRegistro, get, post, ensureRegistroMode };
}
```

Adjust POST field names to match fixture README; add `export { createLabRepoPortalClient }`.

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test:one -- lib/lab-repo/portal-client.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add lib/lab-repo/portal-client.mjs lib/lab-repo/portal-client.test.mjs
git commit -m "feat(lab-repo): ASP.NET client with REGISTRO search mode"
```

---

### Task 3: PDF text extraction + temp file cleanup

**Files:**
- Modify: `package.json` (add `pdf-parse`)
- Create: `lib/lab-repo/pdf-text.mjs`
- Create: `lib/lab-repo/temp-run.mjs`
- Create: `lib/lab-repo/pdf-text.test.mjs`

- [ ] **Step 1: Add dependency**

Run: `npm install pdf-parse@1.1.1 --save`

- [ ] **Step 2: Write failing PDF text test**

```js
// lib/lab-repo/pdf-text.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSomeTextFromPdfBuffer, looksLikeExtractedSome } from './pdf-text.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(__dir, 'fixtures', 'sample-some.pdf');

test('extractSomeTextFromPdfBuffer returns Expediente header', async () => {
  if (!fs.existsSync(pdfPath)) {
    // CI fallback: skip if fixture not committed
    return;
  }
  const buf = fs.readFileSync(pdfPath);
  const text = await extractSomeTextFromPdfBuffer(buf);
  assert.ok(looksLikeExtractedSome(text));
  assert.match(text, /Expediente\s*:/i);
});
```

- [ ] **Step 3: Implement `temp-run.mjs`**

```js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createTempRunDir() {
  const dir = path.join(os.tmpdir(), 'rplus-lab-repo', randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeTempPdf(dir, folio, buffer) {
  const file = path.join(dir, folio + '.pdf');
  fs.writeFileSync(file, buffer);
  return file;
}

export function deleteTempFile(file) {
  try {
    fs.unlinkSync(file);
  } catch (_) {}
}

export function deleteTempRunDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}
```

- [ ] **Step 4: Implement `pdf-text.mjs`**

```js
import pdf from 'pdf-parse/lib/pdf-parse.js';

export function looksLikeExtractedSome(text) {
  const t = String(text || '');
  return /Expediente\s*:/i.test(t) && /Nombre\s*:/i.test(t);
}

/** Collapse broken column gaps common in PDF extract. */
export function normalizePdfExtract(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractSomeTextFromPdfBuffer(buffer) {
  const data = await pdf(buffer);
  return normalizePdfExtract(data.text || '');
}
```

- [ ] **Step 5: Run test**

Run: `npm run test:one -- lib/lab-repo/pdf-text.test.mjs`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/lab-repo/pdf-text.mjs lib/lab-repo/temp-run.mjs lib/lab-repo/pdf-text.test.mjs
git commit -m "feat(lab-repo): PDF text extraction with temp file helpers"
```

---

### Task 4: Seleccionar postback + fetch orchestration

**Files:**
- Create: `lib/lab-repo/portal-select.mjs`
- Create: `lib/lab-repo/fetch-run.mjs`
- Create: `lib/lab-repo/lab-repo-fetch.mjs`
- Create: `lib/lab-repo/fetch-run.test.mjs`

- [ ] **Step 1: Write failing fetch-run test with mocked client + PDF**

```js
// lib/lab-repo/fetch-run.test.mjs
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { runLabRepoFetch } from './fetch-run.mjs';

test('runLabRepoFetch deletes temp PDF after extract', async () => {
  const deleted = [];
  const result = await runLabRepoFetch(
    {
      registro: '2203912-1',
      desde: new Date('2026-06-27T00:00:00'),
      hasta: new Date('2026-06-27T23:59:59'),
    },
    {
      searchByRegistro: async () => [
        {
          folio: '2606270175',
          fechaSolicitud: '2026-06-27 03:35',
          tipo: 'HEMATOLOGIA',
          selectEventTarget: 't',
          selectEventArgument: 'a',
        },
      ],
      downloadPdfForRow: async () => Buffer.from('%PDF-1.4 fake'),
      extractText: async () => 'Expediente: 2203912-1\nNombre: TEST\nFecha Registro\nHEMATOLOGIA',
      deleteTempFile: (p) => deleted.push(p),
      deleteTempRunDir: () => {},
      createTempRunDir: () => '/tmp/x',
      writeTempPdf: () => '/tmp/x/2606270175.pdf',
    }
  );
  assert.equal(result.studies.length, 1);
  assert.equal(deleted.length, 1);
});
```

- [ ] **Step 2: Implement `portal-select.mjs`**

```js
export async function downloadPdfForRow(client, rowHtmlContext, row, hidden) {
  // POST __EVENTTARGET/ARGUMENT from row.selectEventTarget/Argument
  // Response: application/pdf bytes OR HTML wrapper with iframe/src — follow redirect
  // Return Buffer
}
```

Wire using same cookie session from `portal-client` (export session helpers or pass `client.post` returning `{ html, buffer, contentType }`).

- [ ] **Step 3: Implement `fetch-run.mjs`**

```js
import { filterRowsByDateRange } from './portal-html.mjs';
import { createTempRunDir, writeTempPdf, deleteTempFile, deleteTempRunDir } from './temp-run.mjs';
import { extractSomeTextFromPdfBuffer, looksLikeExtractedSome } from './pdf-text.mjs';
import { createLabRepoPortalClient } from './portal-client.mjs';
import { downloadPdfForRow } from './portal-select.mjs';

export async function runLabRepoFetch(opts, deps) {
  const runDeps = deps || buildDefaultDeps();
  const dir = runDeps.createTempRunDir();
  /** @type {{ folio: string, fechaSolicitud: string, tipo: string, departamento: string, text: string, error?: string }[]} */
  const studies = [];
  /** @type {{ folio: string, message: string }[]} */
  const errors = [];
  try {
    const rows = await runDeps.searchByRegistro(opts.registro);
    const filtered = filterRowsByDateRange(rows, new Date(opts.desde), new Date(opts.hasta));
    if (!filtered.length) {
      return { studies: [], errors: [{ folio: '', message: 'no-rows-in-range' }] };
    }
    for (const row of filtered) {
      let tempPath = '';
      try {
        const pdfBuf = await runDeps.downloadPdfForRow(row);
        tempPath = runDeps.writeTempPdf(dir, row.folio, pdfBuf);
        const text = await runDeps.extractText(pdfBuf);
        if (!looksLikeExtractedSome(text)) {
          errors.push({ folio: row.folio, message: 'pdf-not-some' });
          continue;
        }
        studies.push({
          folio: row.folio,
          fechaSolicitud: row.fechaSolicitud,
          tipo: row.tipo,
          departamento: row.departamento || '',
          text,
        });
      } catch (e) {
        errors.push({ folio: row.folio, message: String(e.message || e) });
      } finally {
        if (tempPath) runDeps.deleteTempFile(tempPath);
      }
    }
    return { studies, errors };
  } finally {
    runDeps.deleteTempRunDir(dir);
  }
}

function buildDefaultDeps() {
  const client = createLabRepoPortalClient({});
  return {
    searchByRegistro: (reg) => client.searchByRegistro(reg),
    downloadPdfForRow: (row) => downloadPdfForRow(client, row),
    extractText: extractSomeTextFromPdfBuffer,
    createTempRunDir,
    writeTempPdf,
    deleteTempFile,
    deleteTempRunDir,
  };
}
```

- [ ] **Step 4: Implement `lab-repo-fetch.mjs`**

```js
import { runLabRepoFetch } from './fetch-run.mjs';

export async function fetchLabRepoStudies(payload) {
  const registro = String(payload?.registro || '').trim();
  if (!registro) throw new Error('lab-repo-missing-registro');
  if (!payload?.desde || !payload?.hasta) throw new Error('lab-repo-missing-range');
  return runLabRepoFetch({
    registro,
    desde: payload.desde,
    hasta: payload.hasta,
  });
}
```

- [ ] **Step 5: Run test — expect PASS**

Run: `npm run test:one -- lib/lab-repo/fetch-run.test.mjs`

- [ ] **Step 6: Commit**

```bash
git add lib/lab-repo/portal-select.mjs lib/lab-repo/fetch-run.mjs lib/lab-repo/lab-repo-fetch.mjs lib/lab-repo/fetch-run.test.mjs
git commit -m "feat(lab-repo): fetch PDFs, extract text, delete temp files"
```

---

### Task 5: IPC wiring (main + preload)

**Files:**
- Modify: `main.js`
- Modify: `preload.js`

- [ ] **Step 1: Register IPC handler in `main.js`**

```js
import { fetchLabRepoStudies } from './lib/lab-repo/lab-repo-fetch.mjs';

ipcMain.handle('lab-repo-fetch', async (_e, payload) => {
  try {
    return await fetchLabRepoStudies(payload);
  } catch (err) {
    return {
      studies: [],
      errors: [{ folio: '', message: String(err?.message || err) }],
    };
  }
});
```

Place import with other ESM imports if main uses dynamic import, or use `createRequire` pattern already in `main.js` — match existing style for `.mjs` lib imports.

- [ ] **Step 2: Expose in `preload.js`**

```js
labRepoFetch: (payload) => ipcRenderer.invoke('lab-repo-fetch', payload),
```

- [ ] **Step 3: Manual smoke (LAN)**

Run app → DevTools console:

```js
await window.electronAPI.labRepoFetch({
  registro: '2203912-1',
  desde: '2026-06-27T00:00:00',
  hasta: '2026-06-27T23:59:59',
});
```

Expected: `{ studies: [...], errors: [] }` with `text` containing `Expediente:`.

- [ ] **Step 4: Commit**

```bash
git add main.js preload.js
git commit -m "feat(lab-repo): IPC channel lab-repo-fetch"
```

---

### Task 6: Hybrid import gate + block builder

**Files:**
- Create: `public/js/features/lab-repo-import-gate.mjs`
- Create: `public/js/features/lab-repo-import-gate.test.mjs`

- [ ] **Step 1: Write failing gate tests**

```js
// public/js/features/lab-repo-import-gate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSilentImportLabRepo, buildLabRepoBulkText } from './lab-repo-import-gate.mjs';

test('shouldSilentImportLabRepo false when fetch errors present', () => {
  const d = shouldSilentImportLabRepo({
    blocks: [{ status: 'ok', canProcess: true, okReportCount: 1 }],
    fetchErrors: [{ folio: '1', message: 'x' }],
    requestedRegistro: '2203912-1',
    activePatientRegistro: '2203912-1',
  });
  assert.equal(d.silent, false);
});

test('buildLabRepoBulkText joins reports for one patient block', () => {
  const text = buildLabRepoBulkText([
    { text: 'Expediente: 1\nNombre: A' },
    { text: 'Expediente: 1\nNombre: A\nBH' },
  ]);
  assert.match(text, /Expediente: 1/);
});
```

- [ ] **Step 2: Implement `lab-repo-import-gate.mjs`**

```js
import { buildBulkLabPreview } from '../lab-bulk-paste.mjs';

export function buildLabRepoBulkText(studies) {
  return (studies || [])
    .map(function (s) {
      return String(s.text || '').trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * @param {{
 *   blocks: import('../lab-bulk-paste.mjs').BulkBlockPreview[],
 *   fetchErrors: { folio: string, message: string }[],
 *   requestedRegistro: string,
 *   activePatientRegistro: string,
 *   activePatientId: string | null,
 * }} ctx
 */
export function shouldSilentImportLabRepo(ctx) {
  if (ctx.fetchErrors && ctx.fetchErrors.length) {
    return { silent: false, reason: 'fetch-errors' };
  }
  if (!ctx.blocks.length) {
    return { silent: false, reason: 'no-blocks' };
  }
  var bad = ctx.blocks.filter(function (b) {
    return b.status !== 'ok' || !b.canProcess || !b.okReportCount;
  });
  if (bad.length) {
    return { silent: false, reason: 'block-issues' };
  }
  if (
    ctx.activePatientId &&
    ctx.activePatientRegistro &&
    ctx.requestedRegistro &&
    ctx.activePatientRegistro.trim() !== ctx.requestedRegistro.trim()
  ) {
    return { silent: false, reason: 'registro-mismatch' };
  }
  return { silent: true, reason: 'ok' };
}

export function buildLabRepoPreviewBlocks(studies, findPatientByRegistro) {
  const text = buildLabRepoBulkText(studies);
  return buildBulkLabPreview(text, { findPatientByRegistro: findPatientByRegistro });
}
```

- [ ] **Step 3: Run test**

Run: `npm run test:one -- public/js/features/lab-repo-import-gate.test.mjs`

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lab-repo-import-gate.mjs public/js/features/lab-repo-import-gate.test.mjs
git commit -m "feat(lab-repo): hybrid import gate helpers"
```

---

### Task 7: Renderer modal + import orchestration

**Files:**
- Create: `public/js/features/lab-repo-import.mjs`
- Modify: `public/js/features/lab-panel-workbench.mjs` or `lab-panel-workbench-finalize.mjs` (reuse `finalizeBulkLabPaste` export)

- [ ] **Step 1: Implement modal + fetch handler**

```js
// public/js/features/lab-repo-import.mjs
import { rt } from './lab-panel-runtime-state.mjs';
import {
  buildLabRepoPreviewBlocks,
  shouldSilentImportLabRepo,
} from './lab-repo-import-gate.mjs';
import { openLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';
import { storeProcessableBulkBlocks, toastBulkStoreSummary } from './lab-panel-workbench-finalize.mjs';

function defaultDateRange() {
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - 48 * 60 * 60 * 1000);
  return { desde, hasta };
}

function getRegistroInitial() {
  var p = rt.getActivePatient?.() || null;
  return p && p.registro ? String(p.registro).trim() : '';
}

function registroReadOnly() {
  return !!getRegistroInitial();
}

export function openLabRepoImportModal() {
  // Build/show modal #lab-repo-import-modal (markup from Task 8)
  // Fields: #lab-repo-registro, #lab-repo-desde, #lab-repo-hasta
  // Pre-fill registro; readonly if active patient has registro
}

export async function confirmLabRepoImport() {
  var registro = String(document.getElementById('lab-repo-registro').value || '').trim();
  var desde = document.getElementById('lab-repo-desde').value;
  var hasta = document.getElementById('lab-repo-hasta').value;
  if (!registro) {
    rt.showToast('Indica el registro', 'error');
    return;
  }
  rt.showToast('Consultando repositorio…', 'info');
  var res = await window.electronAPI.labRepoFetch({ registro, desde, hasta });
  if (!res.studies.length && res.errors.length) {
    rt.showToast('No se pudo conectar al repositorio de laboratorio', 'error');
    return;
  }
  if (!res.studies.length) {
    rt.showToast('Sin estudios en el rango seleccionado', 'info');
    return;
  }
  var blocks = buildLabRepoPreviewBlocks(res.studies, rt.findPatientByRegistro);
  var active = rt.getActivePatient?.() || null;
  var gate = shouldSilentImportLabRepo({
    blocks: blocks,
    fetchErrors: res.errors,
    requestedRegistro: registro,
    activePatientRegistro: active ? active.registro : '',
    activePatientId: rt.getActiveId?.() || null,
  });
  var text = blocks.map(function () {
    return res.studies.map(function (s) { return s.text; }).join('\n\n');
  })[0] || '';
  var totalOk = blocks.reduce(function (n, b) { return n + (b.okReportCount || 0); }, 0);
  if (gate.silent) {
    finalizeBulkLabPaste(text, blocks, totalOk);
    closeLabRepoImportModal();
    return;
  }
  openLabBulkPreviewModal({
    blocks: blocks,
    sourceText: text,
    title: 'Importar del repositorio',
    onConfirm: function () {
      finalizeBulkLabPaste(text, blocks, totalOk);
      closeLabRepoImportModal();
    },
  });
}

export function closeLabRepoImportModal() {
  var el = document.getElementById('lab-repo-import-modal');
  if (el) el.hidden = true;
}

export function registerLabRepoImportRuntime(ctx) {
  Object.assign(rt, ctx);
}
```

Refine `openLabBulkPreviewModal` call if it lacks `title` — add optional param or reuse default copy «Revisar importación del repositorio».

- [ ] **Step 2: Wire runtime from `lab-panel.mjs`**

```js
import { openLabRepoImportModal, registerLabRepoImportRuntime } from './lab-repo-import.mjs';

// inside registerLabPanelRuntime or dedicated call from app-runtimes:
registerLabRepoImportRuntime(ctx);

export const windowHandlers = {
  // ...
  openLabRepoImportModal,
  closeLabRepoImportModal,
  confirmLabRepoImport,
};
```

- [ ] **Step 3: Commit**

```bash
git add public/js/features/lab-repo-import.mjs public/js/features/lab-panel.mjs
git commit -m "feat(lab-repo): renderer import modal and hybrid flow"
```

---

### Task 8: UI markup + styles + build

**Files:**
- Modify: lab panel partial (source for `public/index.html` — locate via `scripts/build-ui.mjs` partial for lab section)
- Modify: `public/partials/chrome/overlays.html`
- Modify: `public/styles/lab-panel.css` (or nearest lab stylesheet)

- [ ] **Step 1: Add button next to Procesar**

In lab card action row (`public/index.html` or partial):

```html
<button type="button" id="btn-lab-repo-import" class="btn-med-secondary" onclick="openLabRepoImportModal()">
  Importar del repositorio
</button>
```

- [ ] **Step 2: Add modal overlay**

```html
<div id="lab-repo-import-modal" class="modal-overlay" hidden>
  <div class="modal-card lab-repo-import-modal" role="dialog" aria-labelledby="lab-repo-import-title">
    <h2 id="lab-repo-import-title">Importar del repositorio</h2>
    <div class="field-group">
      <label for="lab-repo-registro">Registro</label>
      <input id="lab-repo-registro" type="text" autocomplete="off" />
    </div>
    <div class="field-group">
      <label for="lab-repo-desde">Desde</label>
      <input id="lab-repo-desde" type="datetime-local" />
    </div>
    <div class="field-group">
      <label for="lab-repo-hasta">Hasta</label>
      <input id="lab-repo-hasta" type="datetime-local" />
    </div>
    <div class="modal-actions">
      <button type="button" class="btn-med-secondary" onclick="closeLabRepoImportModal()">Cancelar</button>
      <button type="button" class="btn-generate" onclick="confirmLabRepoImport()">Importar</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Rebuild UI**

Run: `npm run build:ui`

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/partials/ public/styles/
git commit -m "feat(lab-repo): lab panel button and import modal UI"
```

---

### Task 9: Test manifest, docs, metrics

**Files:**
- Modify: `package.json` (`test` script entries)
- Modify: `docs/features/features-index.md`
- Modify: `docs/superpowers/specs/2026-06-27-lab-repo-scraper-design.md` (status → Approved)
- Modify: `.cursor/rules/project-context.mdc` (changelog on final commit)

- [ ] **Step 1: Add tests to CI manifest**

Append to `package.json` `"test"` script:

```
lib/lab-repo/portal-html.test.mjs lib/lab-repo/portal-client.test.mjs lib/lab-repo/pdf-text.test.mjs lib/lab-repo/fetch-run.test.mjs public/js/features/lab-repo-import-gate.test.mjs
```

- [ ] **Step 2: Run targeted tests**

```bash
npm run test:one -- lib/lab-repo/portal-html.test.mjs
npm run test:one -- lib/lab-repo/portal-client.test.mjs
npm run test:one -- lib/lab-repo/fetch-run.test.mjs
npm run test:one -- public/js/features/lab-repo-import-gate.test.mjs
```

- [ ] **Step 3: Tier 1 lint on touched files**

Run: `npm run lint:tier1`

- [ ] **Step 4: Update features index**

Add row: **Lab repo import** → `lib/lab-repo/`, `lab-repo-import.mjs` → link spec.

- [ ] **Step 5: Update spec status to Approved**

- [ ] **Step 6: Commit**

```bash
git add package.json docs/
git commit -m "docs(lab-repo): tests manifest and feature index"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Built-in lab panel button | Task 8 |
| REGISTRO toggle (not NOMBRE default) | Task 2 |
| Date range on Fecha Solicitud | Task 1, 4 |
| PDF → SOME text → procesarLabs | Task 3, 6, 7 |
| Delete PDF after extract | Task 3, 4 |
| Hybrid silent vs review | Task 6, 7 |
| Registro auto-fill + manual | Task 7, 8 |
| Main-process fetch / IPC | Task 5 |
| No auth v1 | (default — no login step) |
| LAN-only / no cloud | constants URL; no cloud code |
| Reuse bulk preview / Agregar paciente | Task 7 |

---

## Manual QA (hospital LAN)

- [ ] Patient with registro → Importar → silent import → historial + tendencias updated
- [ ] Wrong date range → «Sin estudios…»
- [ ] New patient (no match) → review modal → Agregar paciente
- [ ] Duplicate re-import → review or skip toast
- [ ] Confirm no PDF files remain in `/tmp/rplus-lab-repo/` after run
