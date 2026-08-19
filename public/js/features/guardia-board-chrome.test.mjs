import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../storage.js';
import {
  computeGuardiaSummary,
  renderGuardiaSummaryTiles,
  renderGuardiaModeFrame,
  renderGuardiaSignosRecibidosPanel,
} from './guardia-board-chrome.mjs';

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

function todayIso() {
  return new Date().toISOString();
}

describe('computeGuardiaSummary', () => {
  it('counts patients admitted today via the existing FIMI/FIUX fields, flagging incomplete admissions', () => {
    const today = new Date().toISOString().slice(0, 10);
    const summary = computeGuardiaSummary(
      [
        { id: 'p1', isCritical: false, pendingCount: 0, fimiFecha: today, cuarto: '214', cama: '2', servicio: 'Sala' },
        { id: 'p2', isCritical: false, pendingCount: 0, fimiFecha: today }, // no bed yet → en valoración
        { id: 'p3', isCritical: false, pendingCount: 0, fimiFecha: '2020-01-01' },
      ],
      new Map()
    );
    assert.equal(summary.admissionsToday, 2);
    assert.equal(summary.admissionsEnValoracion, 1);
  });

  it('sums census-wide open and overdue pendientes across patients', () => {
    storage.saveTodos('p1', [{ id: 't1', text: 'A', completed: false, dueDate: '2020-01-01' }]);
    storage.saveTodos('p2', [{ id: 't2', text: 'B', completed: false, dueDate: '2099-01-01' }]);
    const summary = computeGuardiaSummary(
      [
        { id: 'p1', isCritical: false, pendingCount: 0 },
        { id: 'p2', isCritical: false, pendingCount: 0 },
      ],
      new Map()
    );
    assert.equal(summary.pendientesOpen, 2);
    assert.equal(summary.pendientesOverdue, 1);
  });

  it('counts vitals received today and flags out-of-range from the last historial entry', () => {
    const summary = computeGuardiaSummary(
      [
        {
          id: 'p1',
          isCritical: false,
          pendingCount: 0,
          monitoreo: {
            historial: [
              { vitals: { sat: 89 }, alteredAt: { sat: '1' }, recordedAt: todayIso() },
            ],
          },
        },
        {
          id: 'p2',
          isCritical: false,
          pendingCount: 0,
          monitoreo: {
            historial: [{ vitals: { fc: 78 }, alteredAt: {}, recordedAt: '2020-01-01T00:00:00Z' }],
          },
        },
      ],
      new Map()
    );
    assert.equal(summary.vitalsReceivedToday, 1);
    assert.equal(summary.vitalsOutOfRange, 1);
  });
});

describe('renderGuardiaSummaryTiles', () => {
  it('renders the counters band in order: signos, pendientes (alert), ingresos', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    host.id = 'guardia-summary';
    document.body.appendChild(host);
    try {
      renderGuardiaSummaryTiles(
        {
          total: 5,
          critical: 0,
          pending: 0,
          vitalsMonitored: 2,
          vitalsOverdue: 0,
          vitalsDueSoon: 0,
          vitalsReceivedToday: 1,
          vitalsOutOfRange: 0,
          pendientesOpen: 3,
          pendientesOverdue: 1,
          admissionsToday: 2,
          admissionsEnValoracion: 1,
        },
        {}
      );
      assert.match(host.innerHTML, /Toma de signos/);
      assert.match(host.innerHTML, /1 de 2 recibidos/);
      assert.match(host.innerHTML, /Pendientes/);
      assert.match(host.innerHTML, /wb-counter-cell--alert/);
      assert.match(host.innerHTML, /1 vencido/);
      assert.match(host.innerHTML, /Ingresos/);
      assert.match(host.innerHTML, /2 nuevos/);
      assert.match(host.innerHTML, /1 en valoración/);
      const order = host.innerHTML.indexOf('Toma de signos');
      assert.ok(order < host.innerHTML.indexOf('Pendientes'));
      assert.ok(host.innerHTML.indexOf('Pendientes') < host.innerHTML.indexOf('Ingresos'));
    } finally {
      host.remove();
    }
  });
});

describe('renderGuardiaModeFrame', () => {
  it('mounts one teal primary "Entregar guardia" button with the shared id', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    host.id = 'guardia-mode-frame';
    document.body.appendChild(host);
    try {
      renderGuardiaModeFrame();
      const primary = host.querySelector('#btn-guardia-entrega-phase');
      assert.ok(primary, 'expected #btn-guardia-entrega-phase inside the mode frame');
      assert.match(primary.className, /wb-btn-primary/);
      assert.equal(primary.textContent, 'Entregar guardia');
      assert.equal(host.querySelectorAll('.wb-btn-primary').length, 1);
    } finally {
      host.remove();
    }
  });
});

describe('renderGuardiaSignosRecibidosPanel', () => {
  it('renders the shared empty state, not a fake panel or a bare zero', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    host.id = 'guardia-signos-recibidos';
    document.body.appendChild(host);
    try {
      renderGuardiaSignosRecibidosPanel();
      assert.match(host.innerHTML, /wb-empty-state/);
      assert.match(host.innerHTML, /Signos recibidos/);
      assert.doesNotMatch(host.innerHTML, />0</);
    } finally {
      host.remove();
    }
  });
});
