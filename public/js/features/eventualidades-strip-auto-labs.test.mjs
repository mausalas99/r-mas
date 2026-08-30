import { test, describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAutoLabInterpretationText,
  stripAutoLabInterpretationsFromStore,
  stripAutoLabInterpretationsFromPatients,
  markStrippedAutoLabInterpretations,
} from './eventualidades-strip-auto-labs.mjs';

test('isAutoLabInterpretationText — LABS header and prosa', () => {
  assert.equal(isAutoLabInterpretationText('LABS 03/08/2026 06:45\nEN LA BIOMETRÍA SE APRECIA ANEMIA'), true);
  assert.equal(isAutoLabInterpretationText('EN LA GASOMETRÍA SE APRECIA PH EN RANGO'), true);
  assert.equal(isAutoLabInterpretationText('Caída en baño, sin lesiones'), false);
});

test('isAutoLabInterpretationText — Estudios dump', () => {
  assert.equal(
    isAutoLabInterpretationText('03/08\nBH HB 8.56* HTO 27.1*\nQS GLU 105* CR 3.2*'),
    true
  );
  assert.equal(isAutoLabInterpretationText('Paciente refiere dolor abdominal'), false);
});

test('stripAutoLabInterpretationsFromStore clears labsText and LABS entries', () => {
  var out = stripAutoLabInterpretationsFromStore({
    entries: [
      { id: 'ev_ok', at: '2026-08-01T12:00:00.000Z', text: 'Caída en baño' },
      {
        id: 'ev_lab',
        at: '2026-08-03T12:00:00.000Z',
        text: 'LABS 03/08/2026\nEN LA BIOMETRÍA SE APRECIA ANEMIA',
      },
    ],
    labsText: '03/08\nBH HB 8.5*',
  });
  assert.equal(out.changed, true);
  assert.equal(out.clearedLabsText, true);
  assert.equal(out.removedEntries, 1);
  assert.equal(out.store.labsText, '');
  assert.equal(out.store.entries.length, 1);
  assert.equal(out.store.entries[0].id, 'ev_ok');
  assert.ok(out.store.deletedIds && out.store.deletedIds.ev_lab);
});

test('stripAutoLabInterpretationsFromPatients mutates patients', () => {
  var patients = [
    {
      id: 'p1',
      eventualidades: {
        entries: [{ id: 'a', text: 'Nota clínica' }],
        labsText: 'BH HB 9 CR 2',
      },
    },
    { id: 'p2', eventualidades: { entries: [], labsText: '' } },
  ];
  var stats = stripAutoLabInterpretationsFromPatients(patients);
  assert.equal(stats.patientsChanged, 1);
  assert.equal(stats.labsTextCleared, 1);
  assert.equal(patients[0].eventualidades.labsText, '');
  assert.equal(patients[0].eventualidades.entries[0].text, 'Nota clínica');
});

describe('localStorage quota error handling', () => {
  let store = {};
  const prev = globalThis.localStorage;

  beforeEach(() => {
    store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('logs console.warn when markStrippedAutoLabInterpretations exceeds quota', () => {
    let warned = null;
    const prevWarn = console.warn;
    console.warn = (msg, err) => { warned = { msg, err }; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      markStrippedAutoLabInterpretations();
    } finally {
      console.warn = prevWarn;
    }
    assert.ok(warned, 'console.warn should be called on quota error');
    assert.match(warned.msg, /failed to write rpc-strip-auto-lab-ev-v1/);
  });
});
