/**
 * Export checks for every non-labs export: gold copy diff + source trace + stress + timing.
 *
 *   Nota de evolución .docx, Indicaciones .docx, Listado de problemas .docx,
 *   Censo PDF, Estado actual (SOAP text), VPO (copy text).
 *
 * Per export:
 *   gold   output text equals corpus/exports/<name>.golden.txt (UPDATE_GOLDEN=1 rewrites)
 *   trace  every word of the source record is in the output (nothing dropped) and every
 *          output word is in the source or the empty-input template (nothing invented)
 *   stress empty, hostile characters, very long text, many rows: no throw, no
 *          "undefined" / "NaN" / "[object" in the output, nothing dropped
 *   time   median ms per export written to e2e-artifacts/export-timings/latest.json
 *
 *   npm run test:one -- packages/core/scripts/golden/exports.test.mjs
 * Synthetic DEMO data only.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';
import { matchGolden as matchGoldenIn, docxText } from './helpers.mjs';
import { buildEstadoActualText } from '../../public/js/features/estado-actual-text.mjs';
import { emptyEstadoClinico } from '../../public/js/features/estado-actual-data.mjs';
import { emptyVpoState } from '../../public/js/vpo-data.mjs';
import { buildVpoFullCopyFromState } from '../../public/js/vpo-text.mjs';
import { buildCensusPayload } from '../../public/js/censo-build.mjs';
import {
  noteBusy,
  noteHostile,
  noteLong,
  indicacionesBusy,
  indicacionesHostile,
  indicacionesLong,
  listadoBusy,
  listadoHostile,
  listadoLong,
  censoBusy,
  censoHostile,
  censoMany,
  censoClip,
  censoPatients,
  censoPipelineCtx,
  eaBusy,
  eaHostile,
  vpoBusy,
  vpoHostile,
} from './export-fixtures.mjs';

const require = createRequire(import.meta.url);
const { generateNoteBuffer } = require('../../lib/doc-generators/note.js');
const { generateIndicacionesBuffer } = require('../../lib/doc-generators/indicaciones.js');
const { generateListadoBuffer } = require('../../lib/doc-generators/listado.js');
const { renderCensusPdf } = require('../../generate-censo.js');
const { winAnsiSafeDeep } = require('../../lib/pdf-safe-line.js');
const { PDFDocument, PDFArray, decodePDFRawStream } = require('pdf-lib');

const CORPUS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus', 'exports');
fs.mkdirSync(CORPUS, { recursive: true });
const gold = (name, actual) => matchGoldenIn(CORPUS, path.join(CORPUS, `${name}.golden.txt`), actual);

// ── trace helpers ──────────────────────────────────────────────────────────
// «µ» is mapped first: toUpperCase turns it into Greek Mu, which would hide a µg → ΜG export bug.
const words = (s) => new Set(String(s).normalize('NFC').replace(/\u00b5/g, 'MICRO').toUpperCase().match(/[\p{L}\p{N}]+/gu) || []);
function strings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'number') out.push(String(v));
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
/** Nothing dropped, nothing invented. `template` is the output for an empty record. */
function trace(label, source, output, template, { allowExtra = [], allowDropped = [] } = {}) {
  const src = words(strings(source).join(' '));
  const out = words(output);
  const tpl = words(template + ' ' + allowExtra.join(' '));
  const dropped = [...src].filter((w) => !out.has(w) && !allowDropped.includes(w));
  const invented = [...out].filter((w) => !src.has(w) && !tpl.has(w));
  assert.deepEqual({ dropped, invented }, { dropped: [], invented: [] }, `${label}: trace`);
}
const BAD = /undefined|\bNaN\b|\[object|null/;
function clean(label, text, template = '') {
  // "null" / "undefined" are fine when the template itself says them.
  const m = text.match(BAD);
  if (m && !template.includes(m[0])) assert.fail(`${label}: output has "${m[0]}"`);
}

// ── timing ─────────────────────────────────────────────────────────────────
const timings = {};
async function timeIt(name, fn, runs = 7) {
  await fn(); // warm: template read, JIT
  const ms = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    await fn();
    ms.push(performance.now() - t);
  }
  ms.sort((a, b) => a - b);
  timings[name] = { medianMs: +ms[Math.floor(ms.length / 2)].toFixed(3), maxMs: +ms[ms.length - 1].toFixed(3), runs };
}
test.after(() => {
  const dir = path.join(path.resolve(CORPUS, '..', '..', '..', '..', '..'), 'e2e-artifacts', 'export-timings');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify({ at: new Date().toISOString(), timings }, null, 2) + '\n');
  console.log('export timings (median ms):', Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, v.medianMs])));
});

// ── .docx exports ──────────────────────────────────────────────────────────
const noteText = async (d) => docxText(await generateNoteBuffer(d));
const indText = async (d) => docxText(await generateIndicacionesBuffer(d));
const listText = async (d) => docxText(await generateListadoBuffer(d));

const docxCases = [
  ['nota', noteText, { busy: noteBusy, hostile: noteHostile, long: noteLong }, { patient: {}, note: {} }, 'note'],
  [
    'indicaciones',
    indText,
    { busy: indicacionesBusy, hostile: indicacionesHostile, long: indicacionesLong },
    { patient: {}, indicaciones: {} },
    'indicaciones',
  ],
  ['listado', listText, { busy: listadoBusy, hostile: listadoHostile, long: listadoLong }, { patient: {}, listado: {}, medicos: {} }, 'listado'],
];

for (const [name, render, fx, emptyIn, key] of docxCases) {
  test(`${name}: busy record matches gold and traces to source`, async () => {
    const text = await render(fx.busy);
    gold(`${name}-busy`, text);
    const template = await render(emptyIn);
    trace(name, traceSource(name, fx.busy), text, template, { allowExtra: ROW_NUMBERS });
    clean(name, text, template);
  });

  test(`${name}: empty record builds a clean file`, async () => {
    const text = await render(emptyIn);
    gold(`${name}-empty`, text);
    clean(name + ' empty', text);
  });

  test(`${name}: hostile characters (accents, & < > " ' $, control chars, emoji) match gold, nothing dropped`, async () => {
    const text = await render(fx.hostile);
    gold(`${name}-hostile`, text);
    assert.ok(!text.includes('\u039c'), 'µ must not become Greek capital Mu (reads as «MG»)');
    const template = await render(emptyIn);
    trace(name + ' hostile', traceSource(name, stripControls(fx.hostile)), text, template, { allowExtra: ROW_NUMBERS });
    clean(name + ' hostile', text, template);
  });

  test(`${name}: very long and many-row record keeps every word`, async () => {
    const text = await render(fx.long);
    const template = await render(emptyIn);
    trace(name + ' long', traceSource(name, fx.long), text, template, { allowExtra: ROW_NUMBERS });
    clean(name + ' long', text, template);
  });

  test(`${name}: time`, async () => {
    await timeIt(name, () => render(fx.busy));
  });
  void key;
}

const ROW_NUMBERS = Array.from({ length: 80 }, (_, i) => String(i + 1)); // numbered rows / lists the template adds
/**
 * The listado page shows one date per row (the active problem's, else the inactive one's) and
 * never the record's own `fecha` (file name only). Those two are not in the page by design.
 */
function traceSource(name, v) {
  if (name !== 'listado') return v;
  const l = v.listado;
  return {
    ...v,
    listado: {
      activos: l.activos,
      inactivos: l.inactivos.map((x, i) => (l.activos[i] && l.activos[i].fecha ? { ...x, fecha: '' } : x)),
    },
  };
}

/** Control chars are replaced by a space on export (XML 1.0): same words, split. */
function stripControls(v) {
  // eslint-disable-next-line no-control-regex -- control chars are the point
  if (typeof v === 'string') return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ');
  if (Array.isArray(v)) return v.map(stripControls);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stripControls(x)]));
  return v;
}

// ── Censo PDF ──────────────────────────────────────────────────────────────
/** Every string the PDF draws, in draw order, read from the page content streams (pdf-lib standard fonts: `<hex> Tj`). */
async function pdfText(payload) {
  const raw = await renderCensusPdf(JSON.parse(JSON.stringify(payload)));
  const pdf = await PDFDocument.load(raw);
  const lines = [];
  for (const page of pdf.getPages()) {
    let c = page.node.Contents();
    const streams = c instanceof PDFArray ? c.asArray().map((r) => pdf.context.lookup(r)) : [c];
    for (const st of streams) {
      const src = Buffer.from(decodePDFRawStream(st).decode()).toString('latin1');
      for (const m of src.matchAll(/<([0-9a-fA-F]*)>\s*Tj|\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
        lines.push(
          m[1] !== undefined
            ? m[1].replace(/../g, (h) => String.fromCharCode(parseInt(h, 16)))
            : m[2].replace(/\\([()\\])/g, '$1'),
        );
      }
    }
    lines.push('--- page ---');
  }
  return { text: lines.join('\n').replace(/\x85/g, '…') + '\n', pages: pdf.getPageCount() };
}

test('censo pdf: busy census matches gold and traces to source', async () => {
  const { text } = await pdfText(censoBusy);
  gold('censo-busy', text);
  const { text: tpl } = await pdfText({ ...censoBusy, rows: [{ num: '', cama: '', pacienteNombre: '' }] });
  // eslint-disable-next-line no-unused-vars -- servicio is the file name, not on the page
  const { servicio, header: { servicio: s2, ...hdr }, ...rest } = winAnsiSafeDeep(censoBusy);
  const shown = { ...rest, header: hdr };
  trace('censo', shown, text, tpl, { allowExtra: ['MEDS', 'ACCESOS', 'CULTIVOS', 'PEND'] });
});

test('censo pdf: patient records → payload → PDF matches gold and traces to the patient fields', async () => {
  const payload = buildCensusPayload({ ...censoPipelineCtx, patients: structuredClone(censoPatients) });
  const { text } = await pdfText(payload);
  gold('censo-pipeline', text);
  const { text: tpl } = await pdfText({ ...payload, rows: [{ num: '', cama: '', pacienteNombre: '' }] });
  const recetaShown = (id) => (censoPipelineCtx.medRecetaByPatient[id]?.items || []).map((it) => [it.nombreRaw.replace(/\s+\d.*$/, ''), it.diaTratamiento]); // census shows name + day only
  // eslint-disable-next-line no-unused-vars
  const src = censoPatients.map(({ id, servicio, ...p }) => ({ ...p, receta: recetaShown(id), todo: censoPipelineCtx.todosByPatient[id].filter((t) => !t.completed).map((t) => t.text) })); // servicio = file name only
  trace('censo pipeline', src, text, tpl, { allowExtra: ['MEDS', 'ACCESOS', 'CULTIVOS', 'PEND', 'DÍA', 'AÑOS', 'TA'], allowDropped: ['TAZOBACTAM'] }); // «PIPERACILINA/TA…»: the narrow ATB column clips the name, marked with «…»
  assert.ok(text.includes('PIPERACILINA/TA…'), 'clip is marked');
});

test('censo pdf: text that does not fit a column is cut with «…», never silently', async () => {
  const { text } = await pdfText(censoClip);
  const src = words(strings(censoClip.rows[0]).join(' '));
  const missing = [...src].filter((w) => !words(text).has(w));
  if (missing.length) assert.ok(text.includes('…'), `words lost without «…»: ${missing}`);
});

test('censo pdf: hostile characters build a file; accents kept, unencodable become "?"', async () => {
  const { text } = await pdfText(censoHostile);
  gold('censo-hostile', text);
  assert.ok(text.includes('MUÑOZ'), 'ñ kept');
  assert.ok(!text.includes('\u039c'), 'no Greek Mu');
  assert.ok(!/undefined|NaN/.test(text));
});

test('censo pdf: 60 patients make several pages and keep every bed number', async () => {
  const { text, pages } = await pdfText(censoMany);
  assert.ok(pages >= 3, `pages ${pages}`);
  for (const r of censoMany.rows) assert.ok(text.includes(r.pacienteNombre.split(' ')[1]), `row ${r.num} missing`);
});

test('censo pdf: time', async () => {
  await timeIt('censo-pdf', () => pdfText(censoBusy), 5);
  await timeIt('censo-pdf-60-patients', () => pdfText(censoMany), 3);
});

// ── Estado actual (SOAP text) ──────────────────────────────────────────────
const NOW = new Date('2026-09-21T12:00:00');
const eaText = (f, bold = false) => buildEstadoActualText(f.ec, f.snapshot, f.balances, { now: NOW, rescatesInSome: false, bombaAlgoritmo: null, bold });
// Labels the SOAP text adds only when its field has a value (so the empty record does not show them).
const EA_LABELS = ['ANALGESIA', 'ANTIPIRETICOS', 'ANTIEMETICOS', 'DIURÉTICOS', 'ESTATINAS', 'GR', 'PROTEINA', 'EVACUACIONES', 'GLUCOMETRÍAS', 'CAPILARES', 'DL'];
const eaEmpty = { ec: emptyEstadoClinico(), snapshot: {}, balances: {} };

test('estado actual: busy patient matches gold (plain and bold copy) and traces to source', () => {
  const plain = eaText(eaBusy);
  gold('estado-actual-busy', plain);
  gold('estado-actual-busy-bold', eaText(eaBusy, true));
  assert.equal(eaText(eaBusy, true).replace(/\*\*/g, ''), plain, 'bold copy = plain copy + markers');
  trace('estado actual', eaBusy, plain, eaText(eaEmpty), { allowExtra: EA_LABELS });
  clean('estado actual', plain, eaText(eaEmpty));
});

test('estado actual: empty record shows blanks, not undefined', () => {
  const t = eaText(eaEmpty);
  gold('estado-actual-empty', t);
  clean('estado actual empty', t);
});

test('estado actual: hostile text and 40 meds keep every word', () => {
  const t = eaText(eaHostile);
  gold('estado-actual-hostile', t);
  trace('estado actual hostile', eaHostile, t, eaText(eaEmpty), { allowExtra: EA_LABELS });
  clean('estado actual hostile', t, eaText(eaEmpty));
});

test('estado actual: time', async () => {
  await timeIt('estado-actual', () => eaText(eaBusy), 25);
});

// ── VPO copy text ──────────────────────────────────────────────────────────
const VPO_LABELS = ['STOP', 'BANG', 'DIAGNÓSTICOS']; // optional scale labels, shown once a result exists
/** `functionalKey` is a code, `calc` is form state, `fcLpm` only fills the EKG «FC ___ LPM» placeholder. */
// eslint-disable-next-line no-unused-vars -- dropped on purpose
const vpoSource = ({ functionalKey, calc, ...rest }) => rest;
test('vpo: busy valuation matches gold and traces to source', () => {
  const t = buildVpoFullCopyFromState(vpoBusy);
  gold('vpo-busy', t + '\n');
  trace('vpo', vpoSource(vpoBusy), t, buildVpoFullCopyFromState(emptyVpoState()), { allowExtra: ['ELECTROCARDIOGRAMA', 'RADIOGRAFÍA', 'TÓRAX', 'DIAGNÓSTICOS', 'VALORACIÓN', 'PREOPERATORIA', ...VPO_LABELS] });
});

test('vpo: empty state and hostile text', () => {
  const e = buildVpoFullCopyFromState(emptyVpoState());
  gold('vpo-empty', e + '\n');
  clean('vpo empty', e);
  const h = buildVpoFullCopyFromState(vpoHostile);
  gold('vpo-hostile', h + '\n');
  trace('vpo hostile', vpoSource({ ...vpoHostile, fcLpm: '' }), h, e, { allowExtra: VPO_LABELS });
});

test('vpo: time', async () => {
  await timeIt('vpo', () => buildVpoFullCopyFromState(vpoBusy), 25);
});

// ── fuzz: random hostile records through the three .docx exports ───────────
const rawXml = async (buf) => (await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string'));
function rng(seed) {
  let x = seed >>> 0;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
const PIECES = ['ALFA', 'beta', 'Ñandú', 'café', 'µg', '5 mg', '12/09/2026', '120/80', '&', '<', '>', '"', "'", '$&', "$'", '$`', '100%', '😀', '日本', '\u0001', '|', '||', '___', '1.', '—', 'NaCl 0.9%', 'Cr 1.2', 'TAZOBACTAM'];
function fuzzText(r, max) {
  const n = Math.floor(r() * max);
  return Array.from({ length: n }, () => PIECES[Math.floor(r() * PIECES.length)]).join(r() < 0.2 ? '' : ' ');
}
const fuzzLines = (r, maxLines, maxWords) => Array.from({ length: Math.floor(r() * maxLines) }, () => fuzzText(r, maxWords));
const FUZZ_RUNS = 60;

for (const [name, render, empty, make] of [
  [
    'nota',
    generateNoteBuffer,
    { patient: {}, note: {} },
    (r) => ({ patient: { ...noteBusy.patient, nombre: fuzzText(r, 6) }, note: { ...noteBusy.note, interrogatorio: fuzzText(r, 400), evolucion: fuzzLines(r, 9, 30).join('\n'), estudios: fuzzLines(r, 14, 12).join('\n'), diagnosticos: fuzzLines(r, 6, 6), tratamiento: fuzzLines(r, 16, 8), medico: fuzzText(r, 6) } }),
  ],
  [
    'indicaciones',
    generateIndicacionesBuffer,
    { patient: {}, indicaciones: {} },
    (r) => ({ patient: { ...indicacionesBusy.patient, nombre: fuzzText(r, 6) }, indicaciones: { ...indicacionesBusy.indicaciones, dieta: fuzzText(r, 30), cuidados: fuzzLines(r, 12, 12).join('\n'), medicamentos: fuzzLines(r, 30, 8).join('\n'), estudios: fuzzText(r, 40), otros: fuzzLines(r, 5, 20).map((c, i) => ({ titulo: `T${i}`, contenido: c })) } }),
  ],
  [
    'listado',
    generateListadoBuffer,
    { patient: {}, listado: {}, medicos: {} },
    (r) => ({ patient: { ...listadoBusy.patient, nombre: fuzzText(r, 6) }, medicos: listadoBusy.medicos, listado: { activos: fuzzLines(r, 12, 40).map((d) => ({ fecha: '2026-09-18', descripcion: d })), inactivos: [] } }),
  ],
]) {
  test(`${name}: ${FUZZ_RUNS} random hostile records — no throw, nothing dropped, XML safe`, async () => {
    const r = rng(20260921);
    const template = docxText(await render(empty));
    const tpl = await template;
    for (let i = 0; i < FUZZ_RUNS; i++) {
      const input = make(r);
      const buf = await render(input);
      const text = await docxText(buf);
      const xml = await rawXml(buf);
      const label = `${name} fuzz #${i}`;
      assert.ok(!/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(xml), `${label}: bare & in document.xml`);
      // eslint-disable-next-line no-control-regex -- control chars are the point
      assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(xml), `${label}: control char in document.xml`);
      assert.ok(!text.includes('Μ'), `${label}: µ became Greek Mu`);
      const src = words(strings(stripControls(name === 'listado' ? { ...input, listado: { activos: input.listado.activos.map((a) => a.descripcion) } } : input)).join(' '));
      const out = words(text);
      const dropped = [...src].filter((w) => !out.has(w));
      assert.deepEqual(dropped, [], `${label}: dropped words`);
      void tpl;
    }
  });
}
