/**
 * Flow timer: how long the north-star journey takes, minus the UI.
 *
 *   SOME lab paste → procesarLabs → labs into the note → Nota de evolución .docx
 *
 * Runs every lab paste in the golden corpus through the real parser and the
 * real note generator, many times, and prints the median ms per step.
 * Inputs are the synthetic golden-corpus files only (no PHI).
 *
 *   npm run bench:flow            # 30 runs per paste
 *   npm run bench:flow -- 100     # more runs, steadier numbers
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { procesarLabs } from '../../public/js/labs.js';

const require = createRequire(import.meta.url);
const { generateNoteBuffer } = require('../../lib/doc-generators/note.js');

const CORPUS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'golden', 'corpus');
const RUNS = Math.max(1, Number(process.argv[2]) || 30);
const baseNote = JSON.parse(fs.readFileSync(path.join(CORPUS, 'docs', 'nota-dia-completo.note.json'), 'utf8'));
const pastes = fs
  .readdirSync(path.join(CORPUS, 'labs'))
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => ({ name: f.slice(0, -4), text: fs.readFileSync(path.join(CORPUS, 'labs', f), 'utf8') }));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** One full journey for one paste; returns ms per step. */
async function journey(text) {
  const t0 = performance.now();
  const { resLabs } = procesarLabs(text);
  const t1 = performance.now();
  const estudios = Object.values(resLabs || {}).join('\n');
  await generateNoteBuffer({ patient: baseNote.patient, note: { ...baseNote.note, estudios } });
  const t2 = performance.now();
  return { parse: t1 - t0, docx: t2 - t1, total: t2 - t0 };
}

// Warm up once so the first-run compile cost does not skew the medians.
for (const p of pastes) await journey(p.text);

const rows = [];
for (const p of pastes) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await journey(p.text));
  rows.push({
    paste: p.name,
    'parse ms': +median(runs.map((r) => r.parse)).toFixed(2),
    'docx ms': +median(runs.map((r) => r.docx)).toFixed(2),
    'total ms': +median(runs.map((r) => r.total)).toFixed(2),
  });
}
const sum = (k) => +rows.reduce((a, r) => a + r[k], 0).toFixed(2);
rows.push({ paste: 'ALL (sum of medians)', 'parse ms': sum('parse ms'), 'docx ms': sum('docx ms'), 'total ms': sum('total ms') });

console.log(`Flow timer — ${pastes.length} pastes × ${RUNS} runs, median per step`);
console.table(rows);
