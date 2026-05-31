# Native Document Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Python DOCX subprocesses with JSZip + XML porting, stream binaries from `server.js`, and persist exports via hardened Electron IPC or browser download—no server-side PHI files.

**Architecture:** Port `generate_*.py` logic into `lib/doc-generators/*` using string/regex XML mutation (not docxtemplater). Server returns `application/vnd...document` streams only. Renderer uses `document-export-client.mjs` for hybrid save. See `docs/superpowers/specs/2026-05-30-native-document-generation-design.md`.

**Tech Stack:** Node.js CommonJS (`server.js`, `lib/`), JSZip, `node:test`, Electron IPC, existing ESM renderer modules.

---

## File map

| File | Action |
|------|--------|
| `package.json` | Add `jszip`; remove python from `test` + `build` |
| `lib/doc-generators/shared.js` | Create — `esc`, `replaceT`, zip helpers, template paths |
| `lib/doc-generators/listado.js` | Create — port of `generate_listado.py` |
| `lib/doc-generators/indicaciones.js` | Create — port of `generate_indicaciones.py` |
| `lib/doc-generators/note.js` | Create — port of `generate_note.py` |
| `lib/doc-generators/listado.test.js` | Create — port of `tests/test_generate_listado.py` |
| `lib/doc-generators/golden-compare.test.js` | Create — optional byte-compare vs Python baseline |
| `lib/doc-export-audit.js` | Create — safe audit log helper |
| `lib/doc-export-http.js` | Create — `streamDocxResponse`, `finally` cleanup |
| `server.js` | Remove Python; wire three streaming routes |
| `main.js` | `set-approved-output-dir`, `save-exported-document` |
| `preload.js` | Expose new IPC methods |
| `public/js/document-export-client.mjs` | Create — hybrid fetch/save |
| `public/js/document-export-client.test.mjs` | Create |
| `public/js/app-shell.mjs` | Sync `setApprovedOutputDir` on settings load |
| `public/js/features/notes-indicaciones.mjs` | Use export client |
| `public/js/features/expediente.mjs` | Use export client |
| `scripts/fetch-python*.js` | Remove from `prebuild:*` scripts |
| `generate_*.py`, `tests/test_generate_listado.py` | Delete after parity |

---

### Task 1: Dependencies and shared DOCX utilities

**Files:**
- Modify: `package.json`
- Create: `lib/doc-generators/shared.js`
- Create: `lib/doc-generators/shared.test.js`

- [ ] **Step 1: Add JSZip**

```bash
npm install jszip
```

- [ ] **Step 2: Write failing test for `esc` and `replaceT`**

Create `lib/doc-generators/shared.test.js`:

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { esc, replaceT } = require('./shared.js');

describe('doc-generators/shared', () => {
  it('esc escapes XML entities without touching namespace prefixes', () => {
    assert.equal(esc('a & b <c>'), 'a &amp; b &lt;c&gt;');
    assert.equal(esc('w:val'), 'w:val');
  });

  it('replaceT updates both plain and xml:space preserve w:t nodes', () => {
    const xml = '<w:t>OLD</w:t><w:t xml:space="preserve">OLD</w:t>';
    const out = replaceT(xml, 'OLD', 'NEW');
    assert.match(out, /<w:t>NEW<\/w:t>/);
    assert.match(out, /<w:t xml:space="preserve">NEW<\/w:t>/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
node --test lib/doc-generators/shared.test.js
```

Expected: FAIL — cannot find `./shared.js`

- [ ] **Step 4: Implement `lib/doc-generators/shared.js`**

```javascript
'use strict';
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

function esc(text) {
  if (text == null || text === '') return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceT(xml, oldVal, newVal) {
  const eOld = esc(oldVal);
  const eNew = esc(newVal);
  let out = xml.split(`<w:t>${eOld}</w:t>`).join(`<w:t>${eNew}</w:t>`);
  out = out
    .split(`<w:t xml:space="preserve">${eOld}</w:t>`)
    .join(`<w:t xml:space="preserve">${eNew}</w:t>`);
  return out;
}

function resolveGeneratorBaseDir() {
  const dir = __dirname;
  if (dir.includes('app.asar')) {
    return dir.replace('app.asar', 'app.asar.unpacked');
  }
  return path.join(dir, '..', '..');
}

function resolveTemplatePath(fileName) {
  const base = resolveGeneratorBaseDir();
  const p = path.join(base, fileName);
  if (!fs.existsSync(p)) throw new Error(`Plantilla no encontrada: ${fileName}`);
  return p;
}

async function loadDocxTemplate(templateFileName) {
  const templatePath = resolveTemplatePath(templateFileName);
  const data = await fs.promises.readFile(templatePath);
  const zip = await JSZip.loadAsync(data);
  const files = {};
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  for (const name of names) {
    files[name] = await zip.files[name].async('nodebuffer');
  }
  return { names, files };
}

async function packDocxBuffer(files, names) {
  const zip = new JSZip();
  for (const name of names) {
    zip.file(name, files[name]);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = {
  esc,
  replaceT,
  resolveTemplatePath,
  loadDocxTemplate,
  packDocxBuffer,
};
```

- [ ] **Step 5: Run test — expect PASS**

```bash
node --test lib/doc-generators/shared.test.js
```

- [ ] **Step 6: Add test file to `package.json` `test` script**

Append: `lib/doc-generators/shared.test.js`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/doc-generators/shared.js lib/doc-generators/shared.test.js
git commit -m "feat(doc): add JSZip shared helpers for DOCX generators"
```

---

### Task 2: Port `generate_listado.py` → `listado.js` (TDD)

**Files:**
- Create: `lib/doc-generators/listado.js`
- Create: `lib/doc-generators/listado.test.js`
- Reference: `generate_listado.py`, `tests/test_generate_listado.py`

- [ ] **Step 1: Port Python tests to Node**

Create `lib/doc-generators/listado.test.js` mirroring `GenerateListadoTests` — parse `word/document.xml` with regex helpers (no namespace-stripping parser):

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateListadoBuffer } = require('./listado.js');

const BASE_PATIENT = {
  nombre: 'TEST',
  registro: '1',
  edad: '1',
  sexo: 'M',
  area: 'MI',
  servicio: 'MI',
  cuarto: '1',
  cama: '1',
};

function problemRows(docxBytes) {
  const JSZip = require('jszip');
  return JSZip.loadAsync(docxBytes).then((zip) =>
    zip.file('word/document.xml').async('string')
  ).then((xml) => {
    const rows = [];
    const trRe = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
    let m;
    while ((m = trRe.exec(xml))) {
      const tr = m[0];
      if (!/TEST/.test(tr)) continue;
      const cells = [...tr.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) =>
        [...c[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
          .map((t) => t[1])
          .join('')
      );
      if (cells.length === 4) rows.push(cells);
    }
    return rows;
  });
}

describe('generateListadoBuffer', () => {
  it('activo e inactivo del mismo índice comparten fila', async () => {
    const buf = await generateListadoBuffer({
      patient: BASE_PATIENT,
      listado: {
        activos: [{ fecha: '2026-05-07', descripcion: 'ACTIVO TEST\na) detalle' }],
        inactivos: [{ fecha: '2026-05-07', descripcion: 'INACTIVO TEST\na) detalle' }],
      },
      medicos: {},
    });
    const rows = await problemRows(buf);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][1], '1.');
    assert.match(rows[0][2], /ACTIVO TEST/);
    assert.match(rows[0][3], /INACTIVO TEST/);
  });
});
```

Add remaining three test cases from Python file before implementing.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
node --test lib/doc-generators/listado.test.js
```

- [ ] **Step 3: Port `generate_listado.py` line-for-line into `listado.js`**

Export:

```javascript
async function generateListadoBuffer({ patient, listado, medicos }) {
  const { loadDocxTemplate, packDocxBuffer, esc, replaceT } = require('./shared.js');
  // ... port fmt_fecha, text_to_paragraphs, build_problem_row, numbering inject ...
  return packDocxBuffer(files, names);
}
module.exports = { generateListadoBuffer };
```

**Critical:** Keep `~~SENTINEL~~` replacements, `<!--LISTADO_TABLE_BODY-->`, mini-table split, `numbering.xml` synth numIds — copy logic from Python, do not simplify.

- [ ] **Step 4: Run tests — expect PASS**

```bash
node --test lib/doc-generators/listado.test.js
```

- [ ] **Step 5: Golden byte comparison (baseline capture)**

While Python still exists, run once:

```bash
node scripts/doc-golden-capture.mjs listado
```

Create `scripts/doc-golden-capture.mjs` that writes `test/fixtures/golden/listado.bin` from Python stdout and `test/fixtures/golden/listado-js.bin` from JS — add `lib/doc-generators/golden-compare.test.js` asserting equal length and hash. (Skip capture script commit if Python already removed; use captured fixture only.)

- [ ] **Step 6: Commit**

```bash
git add lib/doc-generators/listado.js lib/doc-generators/listado.test.js
git commit -m "feat(doc): native listado DOCX generator"
```

---

### Task 3: Port `generate_indicaciones.py`

**Files:**
- Create: `lib/doc-generators/indicaciones.js`
- Create: `lib/doc-generators/indicaciones.test.js`

- [ ] **Step 1: Smoke test — table cells contain servicio + patient nombre**

```javascript
it('fills patient and indicaciones table', async () => {
  const buf = await generateIndicacionesBuffer({ /* minimal payload */ });
  const xml = await readDocumentXml(buf);
  assert.match(xml, /INDICACIONES POR CARDIOLOG/);
  assert.match(xml, /PACIENTE PRUEBA/);
});
```

- [ ] **Step 2: Port Python `cell_r0c0`, `cell_r1c1`, `section_xml`, header `replace_t` block**

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(doc): native indicaciones DOCX generator"
```

---

### Task 4: Port `generate_note.py`

**Files:**
- Create: `lib/doc-generators/note.js`
- Create: `lib/doc-generators/note.test.js`

- [ ] **Step 1: Smoke test — fecha, nombre, one evolucion line**

- [ ] **Step 2: Port in order matching Python main():**
  1. fecha/hora
  2. interrogatorio **before** servicio replace
  3. patient fields
  4. evolucion line slots
  5. estudios + QS/ESC/BH/PFHs tab strip
  6. diagnosticos, vitals, P68 paragraph rebuild, tratamiento lines, medico regex, profesor

- [ ] **Step 3: Manual open in Word (dev checklist)**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(doc): native nota evolución DOCX generator"
```

---

### Task 5: HTTP streaming layer + audit logging

**Files:**
- Create: `lib/doc-export-audit.js`
- Create: `lib/doc-export-http.js`
- Modify: `server.js`

- [ ] **Step 1: `lib/doc-export-audit.js`**

```javascript
'use strict';

function safeRegistro(patient) {
  const r = patient && patient.registro;
  if (r) return String(r).slice(0, 64);
  return null;
}

function logDocExport({ type, patient, status, bytes, error }) {
  const payload = {
    type,
    registro: safeRegistro(patient),
    status,
    bytes: bytes ?? null,
    error: error ? String(error).slice(0, 200) : null,
  };
  const line = JSON.stringify(payload);
  if (status >= 400) console.error('[doc-export]', line);
  else console.log('[doc-export]', line);
}

module.exports = { logDocExport };
```

**Never** pass `note`, `indicaciones`, `listado`, or buffers into this function.

- [ ] **Step 2: `lib/doc-export-http.js`**

```javascript
'use strict';
const { logDocExport } = require('./doc-export-audit.js');

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function sendDocxBuffer(res, { buf, fileName, type, patient }) {
  let tmpPath = null;
  try {
    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName.replace(/"/g, '')}"`
    );
    res.send(buf);
    logDocExport({ type, patient, status: 200, bytes: buf.length });
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
    logDocExport({ type, patient, status: 500, error: e.message });
    throw e;
  } finally {
    if (tmpPath) {
      const fs = require('fs');
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
}

module.exports = { sendDocxBuffer, DOCX_MIME };
```

Prefer in-memory `buf` only; `tmpPath` reserved if a future converter needs a file handle.

- [ ] **Step 3: Replace Python routes in `server.js`**

Remove: `resolvePython`, `runPython`, `PYTHON`, `SCRIPTS_DIR`, `spawn` import (if unused).

```javascript
const { generateNoteBuffer } = require('./lib/doc-generators/note.js');
const { generateIndicacionesBuffer } = require('./lib/doc-generators/indicaciones.js');
const { generateListadoBuffer } = require('./lib/doc-generators/listado.js');
const { sendDocxBuffer } = require('./lib/doc-export-http.js');

appExpress.post('/generate', async (req, res) => {
  const { patient, note } = req.body;
  if (!patient || !note) return res.status(400).json({ error: 'Missing patient or note' });
  try {
    const buf = await generateNoteBuffer({ patient, note });
    const fileName = `Nota_Evolucion_${safeName(patient.nombre)}_${safeName(note.fecha || '')}.docx`;
    await sendDocxBuffer(res, { buf, fileName, type: 'nota', patient });
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});
```

Repeat for `/generate-indicaciones` and `/generate-listado` (listado keeps time stamp in filename).

Remove `outputDir`, `DOWNLOADS` usage, and `fs.writeFileSync` from these three handlers.

- [ ] **Step 4: Smoke curl**

```bash
curl -sS -X POST http://localhost:3738/generate \
  -H 'Content-Type: application/json' \
  -d '{"patient":{"nombre":"X","registro":"1"},"note":{"fecha":"01/01/2026"}}' \
  -o /tmp/nota.docx && file /tmp/nota.docx
```

Expected: `Microsoft Word 2007+`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(doc): stream DOCX from server without PHI persistence"
```

---

### Task 6: Electron IPC (approved output dir)

**Files:**
- Modify: `main.js`
- Modify: `preload.js`

- [ ] **Step 1: Add module-level state + validators in `main.js`**

```javascript
let approvedOutputDir = null;

function defaultDownloadsDir() {
  return app.getPath('downloads');
}

async function validateOutputDir(dir) {
  const target = dir && String(dir).trim() ? path.resolve(dir) : defaultDownloadsDir();
  await fs.promises.access(target, fs.constants.W_OK);
  return target;
}

ipcMain.handle('set-approved-output-dir', async (_e, dir) => {
  try {
    approvedOutputDir = await validateOutputDir(dir);
    return { ok: true, path: approvedOutputDir };
  } catch (e) {
    approvedOutputDir = null;
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('save-exported-document', async (_e, { fileName, buffer }) => {
  const dir = approvedOutputDir || defaultDownloadsDir();
  const safe = path.basename(String(fileName || ''));
  if (!safe || safe !== fileName) throw new Error('Nombre de archivo inválido');
  await fs.promises.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, safe);
  const resolvedDir = await fs.promises.realpath(dir);
  await fs.promises.writeFile(fullPath, Buffer.from(buffer));
  const resolvedFile = await fs.promises.realpath(fullPath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    await fs.promises.unlink(fullPath).catch(() => {});
    throw new Error('Ruta de exportación no permitida');
  }
  return { success: true, path: fullPath };
});
```

- [ ] **Step 2: Expose in `preload.js`**

```javascript
setApprovedOutputDir: (dir) => ipcRenderer.invoke('set-approved-output-dir', dir),
saveExportedDocument: (opts) => ipcRenderer.invoke('save-exported-document', opts),
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(electron): secure DOCX save to approved outputDir"
```

---

### Task 7: `document-export-client.mjs`

**Files:**
- Create: `public/js/document-export-client.mjs`
- Create: `public/js/document-export-client.test.mjs`
- Modify: `public/js/app-shell.mjs`

- [ ] **Step 1: Test Content-Disposition parser**

```javascript
import { parseContentDispositionFilename } from './document-export-client.mjs';
assert.equal(
  parseContentDispositionFilename('attachment; filename="foo.docx"'),
  'foo.docx'
);
```

- [ ] **Step 2: Implement export client**

```javascript
export function parseContentDispositionFilename(header) {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return m ? m[1].replace(/"/g, '').trim() : null;
}

export async function exportGeneratedDocument({ url, buildPayload, defaultFileName }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload()),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'No se pudo generar el documento.');
  }
  const blob = await res.blob();
  const fileName =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ||
    defaultFileName;

  if (window.electronAPI?.saveExportedDocument) {
    const arrayBuffer = await blob.arrayBuffer();
    return window.electronAPI.saveExportedDocument({ fileName, buffer: arrayBuffer });
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return { success: true, fileName };
}
```

- [ ] **Step 3: `app-shell.mjs` — sync approved dir after settings load / picker**

```javascript
function syncApprovedOutputDir(dir) {
  if (window.electronAPI?.setApprovedOutputDir) {
    window.electronAPI.setApprovedOutputDir(dir || '');
  }
}
```

Call from `chooseOutputDir` success and initial settings hydration.

- [ ] **Step 4: Client-side output-dir fallback helper**

```javascript
export async function exportWithOutputDirFallback(opts) {
  try {
    const result = await exportGeneratedDocument(opts);
    if (opts.onSuccess) opts.onSuccess(result);
    return result;
  } catch (e) {
    if (opts.selectOutputDir && isOutputDirError(e.message)) {
      const dir = await opts.selectOutputDir();
      if (!dir) { opts.onCancel?.(); return; }
      await window.electronAPI.setApprovedOutputDir(dir);
      opts.saveOutputDir?.(dir);
      return exportWithOutputDirFallback(opts);
    }
    opts.onError?.(e.message);
    throw e;
  }
}
```

Map IPC errors containing "carpeta" / "escribir" to same UX as today.

- [ ] **Step 5: Run tests; commit**

---

### Task 8: Wire UI call sites

**Files:**
- Modify: `public/js/features/notes-indicaciones.mjs`
- Modify: `public/js/features/expediente.mjs`
- Modify: `package.json` test script for new `.test.mjs`

- [ ] **Step 1: Nota — replace `requestDocumentJson('/generate', ...)`**

```javascript
import { exportWithOutputDirFallback } from '../document-export-client.mjs';

exportWithOutputDirFallback({
  url: '/generate',
  buildPayload: () => ({ patient, note }),
  defaultFileName: 'nota.docx',
  selectOutputDir: getOutputDirSelector(),
  saveOutputDir: (dir) => { /* persist settings */ },
  onSuccess: () => { rt.showToast('Nota guardada', 'success'); },
});
```

Remove `outputDir` from payload.

- [ ] **Step 2: Indicaciones + listado — same pattern**

- [ ] **Step 3: Rebuild bundle**

```bash
node scripts/bundle-renderer.mjs
```

- [ ] **Step 4: Manual Electron test — file lands in Mi Perfil folder**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): hybrid DOCX export client for nota/indica/listado"
```

---

### Task 9: Remove Python from build and repo

**Files:**
- Modify: `package.json` (`prebuild:mac`, `prebuild:win`, `build`, `test`)
- Modify: `scripts/lib/release-git.js`
- Delete: `generate_note.py`, `generate_indicaciones.py`, `generate_listado.py`, `tests/test_generate_listado.py`

- [ ] **Step 1: Remove `python-runtime` from `electron-builder` config**

- [ ] **Step 2: Remove `.py` from `files` and `asarUnpack`**

- [ ] **Step 3: Change prebuild scripts**

```json
"prebuild:mac": "npm run build:ui && node scripts/bundle-renderer.mjs --prod",
"prebuild:win": "npm run build:ui && node scripts/bundle-renderer.mjs --prod"
```

- [ ] **Step 4: Remove `python3 -m unittest` from `test` script**

- [ ] **Step 5: Delete Python generators; run full test suite**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git commit -m "chore(build): remove embedded Python runtime and generators"
```

---

### Task 10: Verification checklist

- [ ] `npm test` — all Node tests green
- [ ] Generate nota/indica/listado on macOS Electron — Word opens without repair
- [ ] Confirm **no** new `.docx` under project root / server cwd after requests (only client `outputDir`)
- [ ] Server log lines match `[doc-export]` shape; no note bodies in logs
- [ ] LAN mobile: download triggers; host Downloads not populated
- [ ] ARM64 build without `python-runtime` in artifact (inspect `dist/` or builder log)

---

## Plan self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| JSZip + XML port | 1–4 |
| Binary stream API | 5 |
| No server `outputDir` | 5, 8 |
| Electron IPC + traversal guard | 6 |
| Hybrid client | 7–8 |
| Audit log without PHI | 5 (`doc-export-audit.js`) |
| `finally` temp cleanup | 5 (`doc-export-http.js`) |
| String mutation / no namespace strip | 1, 4 notes |
| Remove python runtime | 9 |
| Golden / ported tests | 2, 10 |

No TBD steps. Censo/receta streaming explicitly deferred per spec non-goals.
