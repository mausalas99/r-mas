import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
const mockStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});
globalThis.window = {
  localStorage: mockStorage,
  addEventListener() {},
  removeEventListener() {},
};

const appState = await import('./app-state.mjs');
const { ensureParsedLabHistory, rebuildEstudiosFromLabHistory } = await import('./lab-history-set.mjs');

const PATIENT_ID = 'lab-loop-patient';
const SOURCE_TEXT =
  'Expediente: 12345\nFecha Registro: 24/05/2026 02:40\nBH\tHb\t12.1 g/dL\t11-15';

describe('lab-history-set', () => {
  beforeEach(() => {
    store = {};
    appState.setSaveStateHooks({ before: null, after: null });
    appState.setPatients([{ id: PATIENT_ID, nombre: 'Paciente prueba', registro: '12345' }]);
    appState.setNotes({
      [PATIENT_ID]: { estudios: '24/05\nBH\tHb\t12.1 g/dL\t11-15' },
    });
    appState.setLabHistory({
      [PATIENT_ID]: [
        {
          id: '1779633171103',
          fecha: '24/05/2026',
          hora: '01:04',
          resLabs: ['BH\tHb\t12.1 g/dL\t11-15'],
          sourceText: SOURCE_TEXT,
          parsed: { Hb: 12.1 },
          bhExtras: {},
        },
      ],
    });
  });

  it('ensureParsedLabHistory no entra en bucle cuando hora difiere del reporte', () => {
    const history = ensureParsedLabHistory(PATIENT_ID);
    assert.equal(history.length, 1);
    assert.equal(history[0].hora, '02:40');
    assert.equal(appState.labHistory[PATIENT_ID][0].hora, '02:40');
  });

  it('rebuildEstudiosFromLabHistory termina con historial ya normalizado', () => {
    ensureParsedLabHistory(PATIENT_ID);
    rebuildEstudiosFromLabHistory(PATIENT_ID);
    assert.match(String(appState.notes[PATIENT_ID].estudios || ''), /24\/05/);
    assert.equal(appState.labHistory[PATIENT_ID][0].hora, '02:40');
  });
});
