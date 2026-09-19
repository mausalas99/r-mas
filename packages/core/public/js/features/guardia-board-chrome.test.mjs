import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../storage.js';
import {
  computeGuardiaSummary,
  renderGuardiaSummaryTiles,
  enrichPatientForGuardiaCard,
  renderGuardiaCensusHead,
  installGuardiaAppShell,
} from './guardia-board-chrome.mjs';
import { readGuardiaSala, writeGuardiaSala } from './guardia-board-state.mjs';

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
    const today = new Date().toLocaleDateString('sv-SE');
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

describe('enrichPatientForGuardiaCard', () => {
  it('keeps cuarto/cama so the Guardia card edit modal shows the real bed, not "Cama —"', () => {
    const patient = { id: 'p1', cuarto: '208', cama: '2', sala: 'MEDICINA INTERNA' };
    const enriched = enrichPatientForGuardiaCard(patient, new Map());
    assert.equal(enriched.cuarto, '208');
    assert.equal(enriched.cama, '2');
  });
  it('passes through guardia marks: esfuerzo, pronostico, nota', () => {
    const patient = {
      id: 'p1',
      guardiaEsfuerzo: 'show',
      guardiaPronostico: 'good',
      guardiaNota: 'SV c/4h',
    };
    const enriched = enrichPatientForGuardiaCard(patient, new Map());
    assert.equal(enriched.guardiaEsfuerzo, 'show');
    assert.equal(enriched.guardiaPronostico, 'good');
    assert.equal(enriched.guardiaNota, 'SV c/4h');
  });
});

describe('renderGuardiaCensusHead', () => {
  it('is a no-op — the bar was removed so the census grid keeps that vertical room', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    host.id = 'guardia-census-head';
    host.innerHTML = '<p>stale content</p>';
    document.body.appendChild(host);
    try {
      renderGuardiaCensusHead({ sala: 'Sala 2', teamCount: 3 });
      assert.equal(host.innerHTML, '');
    } finally {
      host.remove();
    }
  });
});

describe('Cambiar sala', () => {
  it('forces the Step 1 picker instead of instantly re-deriving the home sala', () => {
    if (typeof document === 'undefined') return;
    writeGuardiaSala('Sala 1');
    const grid = document.createElement('div');
    grid.id = 'guardia-census-grid';
    document.body.appendChild(grid);
    const btn = document.createElement('button');
    btn.id = 'guardia-btn-cambiar-sala';
    document.body.appendChild(btn);
    try {
      installGuardiaAppShell();
      btn.click();
      assert.equal(readGuardiaSala(), '');
      assert.match(grid.innerHTML, /Activar guardia/);
    } finally {
      grid.remove();
      btn.remove();
    }
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
