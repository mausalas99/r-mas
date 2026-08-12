/**
 * P5 demotion: app-state must not export live `let` clinical bindings.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

describe('app-state deprecation — no export let clinical bindings', () => {
  it('app-state.mjs source has no `export let` for clinical domains', () => {
    const src = fs.readFileSync(path.join(__dirname, 'app-state.mjs'), 'utf8');
    const hits = [];
    for (const name of CLINICAL_EXPORT_LETS) {
      const re = new RegExp('\\bexport\\s+let\\s+' + name + '\\b');
      if (re.test(src)) hits.push(name);
    }
    assert.deepEqual(hits, [], 'Unexpected export let clinical bindings: ' + hits.join(', '));
  });

  it('getPatients returns the live array (in-place mutations keep working)', async () => {
    const appState = await import('./app-state.mjs');
    appState.setPatients([{ id: 'live1', nombre: 'A' }]);
    const list = appState.getPatients();
    assert.equal(list.length, 1);
    list[0].nombre = 'B';
    assert.equal(appState.getPatients()[0].nombre, 'B');
    list.push({ id: 'live2', nombre: 'C' });
    assert.equal(appState.getPatients().length, 2);
  });

  it('getNotes returns the live object (in-place mutations keep working)', async () => {
    const appState = await import('./app-state.mjs');
    appState.setNotes({ p1: { estudios: 'a' } });
    const notes = appState.getNotes();
    notes.p1.estudios = 'b';
    assert.equal(appState.getNotes().p1.estudios, 'b');
    notes.p2 = { estudios: 'c' };
    assert.equal(appState.getNotes().p2.estudios, 'c');
  });

  it('setPatients warns with [reckoning]', async () => {
    const appState = await import('./app-state.mjs');
    if (typeof appState.resetSetPatientsWarningForTests === 'function') {
      appState.resetSetPatientsWarningForTests();
    }
    const warnings = [];
    const orig = console.warn;
    console.warn = (...args) => {
      warnings.push(args.join(' '));
    };
    try {
      appState.setPatients([{ id: 'w1' }]);
    } finally {
      console.warn = orig;
    }
    assert.ok(warnings.some((w) => /\[reckoning\].*setPatients/i.test(w)));
  });
});
