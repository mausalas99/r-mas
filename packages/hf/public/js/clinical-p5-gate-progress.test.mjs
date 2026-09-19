/**
 * P5 gate progress: production public/js must not call saveState(
 * except the deprecated barrel in app-state.mjs; no export let clinical bindings.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_JS = __dirname;

/** Production allowlist: deprecated saveState forwarder only. */
const ALLOWLIST = new Set(['app-state.mjs']);

const SKIP_DIR_NAMES = new Set(['chunks', 'node_modules']);

const CLINICAL_EXPORT_LETS = [
  'patients',
  'notes',
  'indicaciones',
  'labHistory',
  'medRecetaByPatient',
  'medPharmProfileByPatient',
  'recetaHuByPatient',
  'listadoProblemas',
  'vpoByPatient',
  'medNotaSelectionByPatient',
];

/**
 * @param {string} dir
 * @param {string[]} out
 */
function walkProductionMjs(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      walkProductionMjs(path.join(dir, ent.name), out);
      continue;
    }
    if (!ent.name.endsWith('.mjs')) continue;
    if (ent.name.endsWith('.test.mjs')) continue;
    if (ent.name === 'app.bundle.mjs') continue;
    out.push(path.join(dir, ent.name));
  }
}

describe('clinical P5 gate progress — saveState demotion', () => {
  it('production sources have no saveState( outside app-state allowlist', () => {
    const files = [];
    walkProductionMjs(PUBLIC_JS, files);
    /** @type {{ file: string, line: number, text: string }[]} */
    const hits = [];
    for (const abs of files) {
      const rel = path.relative(PUBLIC_JS, abs).split(path.sep).join('/');
      if (ALLOWLIST.has(rel) || ALLOWLIST.has(path.basename(rel))) continue;
      const text = fs.readFileSync(abs, 'utf8');
      const lines = text.split(/\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!/\bsaveState\s*\(/.test(line)) continue;
        hits.push({ file: rel, line: i + 1, text: line.trim() });
      }
    }
    assert.equal(
      hits.length,
      0,
      'Unexpected saveState( in production:\n' +
        hits
          .slice(0, 40)
          .map((h) => `  ${h.file}:${h.line}: ${h.text}`)
          .join('\n') +
        (hits.length > 40 ? `\n  … +${hits.length - 40} more` : '')
    );
  });
});

describe('clinical P5 gate progress — export let clinical demotion', () => {
  it('production sources have no export let clinical bindings', () => {
    const files = [];
    walkProductionMjs(PUBLIC_JS, files);
    /** @type {{ file: string, line: number, text: string }[]} */
    const hits = [];
    const exportRe = new RegExp(
      '\\bexport\\s+let\\s+(' + CLINICAL_EXPORT_LETS.join('|') + ')\\b'
    );
    for (const abs of files) {
      const rel = path.relative(PUBLIC_JS, abs).split(path.sep).join('/');
      const text = fs.readFileSync(abs, 'utf8');
      const lines = text.split(/\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const m = exportRe.exec(line);
        if (!m) continue;
        hits.push({ file: rel, line: i + 1, text: line.trim() });
      }
    }
    assert.equal(
      hits.length,
      0,
      'Unexpected export let clinical bindings in production:\n' +
        hits
          .slice(0, 40)
          .map((h) => `  ${h.file}:${h.line}: ${h.text}`)
          .join('\n') +
        (hits.length > 40 ? `\n  … +${hits.length - 40} more` : '')
    );
  });
});
