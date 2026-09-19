import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../../storage.js';
import {
  computeHeredasPendientesSummary,
  computeTomaSignosSummary,
  computeIngresosNocheSummary,
  buildLoPrimeroRows,
} from './inicio-turno-summary.mjs';

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

describe('computeHeredasPendientesSummary', () => {
  it('sums open and overdue todos across the census', () => {
    storage.saveTodos('p1', [{ id: 't1', text: 'Reponer K', completed: false, dueDate: '2020-01-01' }]);
    storage.saveTodos('p2', [{ id: 't2', text: 'Control', completed: false, dueDate: '2099-01-01' }]);
    const summary = computeHeredasPendientesSummary([{ id: 'p1' }, { id: 'p2' }]);
    assert.equal(summary.open, 2);
    assert.equal(summary.overdue, 1);
    assert.equal(summary.oldestOverdueIso, '2020-01-01');
  });

  it('is all-zero for an empty census', () => {
    assert.deepEqual(computeHeredasPendientesSummary([]), {
      open: 0,
      overdue: 0,
      oldestOverdueIso: null,
    });
  });
});

describe('computeTomaSignosSummary', () => {
  it('counts patients with a vitals entry recorded today', () => {
    const today = new Date().toISOString();
    const patients = [
      { id: 'p1', monitoreo: { historial: [{ recordedAt: today }] } },
      { id: 'p2', monitoreo: { historial: [{ recordedAt: '2020-01-01T00:00:00.000Z' }] } },
      { id: 'p3' },
    ];
    const summary = computeTomaSignosSummary(patients);
    assert.equal(summary.total, 3);
    assert.equal(summary.receivedToday, 1);
    assert.equal(summary.percent, 33);
  });

  it('reports 0% for an empty census without dividing by zero', () => {
    assert.deepEqual(computeTomaSignosSummary([]), { total: 0, receivedToday: 0, percent: 0 });
  });
});

describe('computeIngresosNocheSummary', () => {
  it('counts admissions today and how many have an incomplete chart (cuarto/cama/servicio/area)', () => {
    const today = new Date().toISOString().slice(0, 10);
    const patients = [
      { id: 'p1', fimiFecha: today }, // no cuarto/cama/servicio set -> incomplete
      { id: 'p2', fimiFecha: '2020-01-01' }, // not today
    ];
    const summary = computeIngresosNocheSummary(patients);
    assert.equal(summary.admittedToday, 1);
    assert.equal(summary.incompleteChart, 1);
  });
});

describe('buildLoPrimeroRows', () => {
  it('orders vencido before en_espera before en_curso, and caps to the limit', () => {
    const today = new Date().toISOString().slice(0, 10);
    storage.saveTodos('p-vencido', [
      { id: 't1', text: 'Revalorar carga', completed: false, dueDate: '2020-01-01' },
    ]);
    storage.saveTodos('p-curso', [
      { id: 't2', text: 'Insulina c/4h', completed: false, dueDate: '2099-01-01', inProgress: true },
    ]);
    const patients = [
      { id: 'p-curso', name: 'EN CURSO', edad: 50 },
      { id: 'p-ingreso', name: 'INGRESO', edad: 60, fimiFecha: today },
      { id: 'p-vencido', name: 'VENCIDO', edad: 70 },
      { id: 'p-quiet', name: 'SIN NADA' },
    ];
    const { rows, remainingCount, totalCount } = buildLoPrimeroRows(patients, { limit: 4 });
    assert.equal(totalCount, 4);
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((r) => r.urgency),
      ['vencido', 'en_espera', 'en_curso']
    );
    assert.equal(rows[0].action.label, 'Revalorar');
    assert.equal(rows[0].action.tone, 'primary');
    assert.equal(rows[1].action.label, 'Completar ficha');
    assert.equal(rows[2].action.label, 'Ver manejo');
    assert.equal(remainingCount, 1); // "p-quiet" has nothing urgent
  });

  it('infers "Pedir control" for potassium/electrolyte-flavored overdue text', () => {
    storage.saveTodos('p1', [
      { id: 't1', text: 'Control de potasio', completed: false, dueDate: '2020-01-01' },
    ]);
    const { rows } = buildLoPrimeroRows([{ id: 'p1', name: 'X' }]);
    assert.equal(rows[0].action.label, 'Pedir control');
  });

  it('returns no rows when nothing is urgent', () => {
    const { rows, remainingCount } = buildLoPrimeroRows([{ id: 'p1', name: 'X' }]);
    assert.deepEqual(rows, []);
    assert.equal(remainingCount, 1);
  });
});
