/**
 * Golden-file tests: run the real parsers and document generators over a
 * corpus of synthetic inputs and compare against committed expected output.
 *
 *   corpus/labs/<name>.txt                       SOME lab paste  → procesarLabs  → <name>.golden.json
 *   corpus/receta/<name>.tsv                     SOME indicaciones → parseIndicacionesPaste → <name>.golden.json
 *   corpus/docs/<name>.note.json                 {patient, note}   → Nota de evolución .docx → <name>.golden.txt
 *   corpus/docs/<name>.indicaciones.json         {patient, indicaciones} → Indicaciones .docx → <name>.golden.txt
 *
 * A change in parsed values or document text shows up as a readable diff of
 * the golden file in review. To accept an intended change:
 *
 *   UPDATE_GOLDEN=1 npm run test:one -- scripts/golden/golden-corpus.test.mjs
 *
 * To add a regression case: drop a new input file (DEMO names, made-up
 * expedientes only) in the right folder and run the command above.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { procesarLabs } from '../../public/js/labs.js';
import { parseIndicacionesPaste } from '../../public/js/med-receta-core.mjs';

const require = createRequire(import.meta.url);
const { generateNoteBuffer } = require('../../lib/doc-generators/note.js');
const { generateIndicacionesBuffer } = require('../../lib/doc-generators/indicaciones.js');

const CORPUS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

function inputs(dir, suffix) {
  return fs
    .readdirSync(path.join(CORPUS, dir))
    .filter((f) => f.endsWith(suffix))
    .sort()
    .map((f) => ({ name: f.slice(0, -suffix.length), file: path.join(CORPUS, dir, f) }));
}

/** Compare `actual` with the golden file next to the input (or rewrite it under UPDATE_GOLDEN=1). */
function matchGolden(goldenFile, actual) {
  if (UPDATE || !fs.existsSync(goldenFile)) {
    if (!UPDATE) assert.fail(`missing ${path.relative(CORPUS, goldenFile)} — run with UPDATE_GOLDEN=1 to create it`);
    fs.writeFileSync(goldenFile, actual);
    return;
  }
  assert.equal(actual, fs.readFileSync(goldenFile, 'utf8'), `${path.relative(CORPUS, goldenFile)} differs — if intended, run with UPDATE_GOLDEN=1`);
}

// Generated ids (time + random) differ on every run: keep their presence, not their value.
const json = (v) => JSON.stringify(v, (k, x) => (k === 'id' && typeof x === 'string' ? '<id>' : x), 2) + '\n';

/** Visible text of a .docx, one paragraph per line, empty runs of paragraphs collapsed. */
async function docxText(buf) {
  const raw = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
  // Text boxes are stored twice (DrawingML + a VML fallback): keep one copy.
  const xml = raw.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
  const decode = (s) =>
    s
      .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const paras = xml.split('</w:p>').map((p) =>
    [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)]
      .map((m) => (m[1] !== undefined ? decode(m[1]) : m[0] === '<w:tab/>' ? '\t' : '\n'))
      .join('')
      .trimEnd(),
  );
  return paras.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

for (const { name, file } of inputs('labs', '.txt')) {
  test(`labs/${name}: procesarLabs output matches golden`, () => {
    matchGolden(path.join(CORPUS, 'labs', `${name}.golden.json`), json(procesarLabs(fs.readFileSync(file, 'utf8'))));
  });
}

for (const { name, file } of inputs('receta', '.tsv')) {
  test(`receta/${name}: parseIndicacionesPaste output matches golden`, () => {
    matchGolden(path.join(CORPUS, 'receta', `${name}.golden.json`), json(parseIndicacionesPaste(fs.readFileSync(file, 'utf8'))));
  });
}

for (const { name, file } of inputs('docs', '.note.json')) {
  test(`docs/${name}: Nota de evolución .docx text matches golden`, async () => {
    const buf = await generateNoteBuffer(JSON.parse(fs.readFileSync(file, 'utf8')));
    matchGolden(path.join(CORPUS, 'docs', `${name}.note.golden.txt`), await docxText(buf));
  });
}

for (const { name, file } of inputs('docs', '.indicaciones.json')) {
  test(`docs/${name}: Indicaciones .docx text matches golden`, async () => {
    const buf = await generateIndicacionesBuffer(JSON.parse(fs.readFileSync(file, 'utf8')));
    matchGolden(path.join(CORPUS, 'docs', `${name}.indicaciones.golden.txt`), await docxText(buf));
  });
}
