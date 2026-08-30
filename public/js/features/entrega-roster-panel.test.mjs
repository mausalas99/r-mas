import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../storage.js';
import {
  rosterHandoffCounts,
  rosterPendingTodoCount,
  buildEntregaConsequenceText,
  activateTurnoActivo,
} from './entrega-roster-panel.mjs';
import {
  serializePendientesJson,
  createProcedimientoItem,
} from '../../../lib/entrega/entrega-pendientes.mjs';

const store = {};

beforeEach(() => {
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
});

afterEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  delete globalThis.localStorage;
});

function pendientesJson(estudioLabels, vitalsOn) {
  return serializePendientesJson({
    version: 2,
    items: estudioLabels.map((label) => createProcedimientoItem({ label })),
    vitalsPlan: vitalsOn ? { frequency: { mode: 'interval', hours: 4 } } : undefined,
  });
}

describe('rosterHandoffCounts', () => {
  it('sums active procedimientos and counts patients with structured vitals monitoring', () => {
    const guardiasMap = new Map([
      ['p1', { pendientes_json: pendientesJson(['bh'], true) }],
      ['p2', { pendientes_json: pendientesJson(['bh', 'qs'], false) }],
      ['p3', {}],
    ]);
    const { totalEstudios, patientsWithSignos } = rosterHandoffCounts(guardiasMap);
    assert.equal(totalEstudios, 3);
    assert.equal(patientsWithSignos, 1);
  });

  it('returns zeros for an empty roster', () => {
    const { totalEstudios, patientsWithSignos } = rosterHandoffCounts(new Map());
    assert.equal(totalEstudios, 0);
    assert.equal(patientsWithSignos, 0);
  });
});

describe('rosterPendingTodoCount', () => {
  it('sums incomplete todos across the roster patients', () => {
    storage.saveTodos('pA', [
      { id: '1', text: 'a', completed: false },
      { id: '2', text: 'b', completed: true },
    ]);
    storage.saveTodos('pB', [{ id: '3', text: 'c', completed: false }]);
    const count = rosterPendingTodoCount([{ id: 'pA' }, { id: 'pB' }]);
    assert.equal(count, 2);
  });
});

describe('buildEntregaConsequenceText', () => {
  it('states the real patient, pendiente, and vitals counts in one sentence', () => {
    const guardiasMap = new Map([['p1', { pendientes_json: pendientesJson(['bh'], true) }]]);
    const text = buildEntregaConsequenceText([{ id: 'p1' }, { id: 'p2' }], guardiasMap);
    assert.match(text, /^Vas a entregar la guardia de 2 pacientes, \d+ pendientes? abiertos?, 1 con signos vitales por tomar, 1 estudio pendiente\.$/);
  });

  it('omits the estudios clause when there are none', () => {
    const text = buildEntregaConsequenceText([{ id: 'p1' }], new Map());
    assert.doesNotMatch(text, /estudio/);
    assert.match(text, /0 con signos vitales por tomar\.$/);
  });

  it('uses singular wording for exactly one patient', () => {
    const text = buildEntregaConsequenceText([{ id: 'p1' }], new Map());
    assert.match(text, /^Vas a entregar la guardia de 1 paciente,/);
  });

  it('logs console.warn when activateTurnoActivo exceeds quota', () => {
    let store2 = {};
    const prev = globalThis.localStorage;
    
    globalThis.localStorage = {
      getItem: (k) => (k in store2 ? store2[k] : null),
      setItem: (k, v) => {
        store2[k] = String(v);
      },
      removeItem: (k) => {
        delete store2[k];
      },
    };

    let warned = null;
    const prevWarn = console.warn;
    console.warn = (msg, err) => { warned = { msg, err }; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      activateTurnoActivo();
    } finally {
      console.warn = prevWarn;
      if (prev) globalThis.localStorage = prev;
    }
    assert.ok(warned, 'console.warn should be called on quota error');
    assert.match(warned.msg, /turno-activo state/);
  });
});
