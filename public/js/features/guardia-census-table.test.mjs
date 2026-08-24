import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../storage.js';
import {
  alteradosForPatient,
  patientPendientes,
  guardiaPatientStatus,
  admissionDateForPatient,
  isPatientAdmittedToday,
  buildGuardiaCensusTableRowHtml,
  buildGuardiaCensusTableHtml,
  mountGuardiaCensusTable,
} from './guardia-census-table.mjs';

const store = {};

function isoLocalDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

describe('alteradosForPatient', () => {
  it('reports no toma when there is no vitals history', () => {
    assert.deepEqual(alteradosForPatient({ id: 'p1' }), { taken: false, chips: [] });
  });

  it('lists altered vitals from the last historial entry', () => {
    const p = {
      id: 'p1',
      monitoreo: {
        historial: [
          { vitals: { sat: 89, fc: 88 }, alteredAt: { sat: '2026-08-17T08:00:00Z' } },
        ],
      },
    };
    const a = alteradosForPatient(p);
    assert.equal(a.taken, true);
    assert.deepEqual(a.chips, ['SatO₂ 89']);
  });

  it('reports taken with no chips when nothing is altered', () => {
    const p = { id: 'p1', monitoreo: { historial: [{ vitals: { fc: 78 }, alteredAt: {} }] } };
    assert.deepEqual(alteradosForPatient(p), { taken: true, chips: [] });
  });
});

describe('guardiaPatientStatus', () => {
  it('is vencido when there is an overdue pendiente', () => {
    storage.saveTodos('p1', [{ id: 't1', text: 'Reponer K', completed: false, dueDate: '2020-01-01' }]);
    const status = guardiaPatientStatus(patientPendientes('p1'));
    assert.equal(status, 'vencido');
  });

  it('is en_curso when an open, not-overdue pendiente is marked in progress', () => {
    storage.saveTodos('p2b', [
      { id: 't1', text: 'Esquema insulina', completed: false, dueDate: '2099-01-01', inProgress: true },
    ]);
    assert.equal(guardiaPatientStatus(patientPendientes('p2b')), 'en_curso');
  });

  it('is abierto when there is an open, not-yet-due pendiente', () => {
    storage.saveTodos('p2', [{ id: 't1', text: 'Control', completed: false, dueDate: '2099-01-01' }]);
    assert.equal(guardiaPatientStatus(patientPendientes('p2')), 'abierto');
  });

  it('is listo when there are no open pendientes', () => {
    storage.saveTodos('p3', [{ id: 't1', text: 'Hecho', completed: true }]);
    assert.equal(guardiaPatientStatus(patientPendientes('p3')), 'listo');
  });
});

describe('admission date (D3a: auto-set registeredAt, FIMI/FIUX as legacy fallback)', () => {
  it('prefers registeredAt over fimiFecha/fiuxFecha', () => {
    assert.equal(
      admissionDateForPatient({
        registeredAt: '2026-08-19T14:32:00.000Z',
        fimiFecha: '2026-08-18',
        fiuxFecha: '2026-08-17',
      }),
      isoLocalDate('2026-08-19T14:32:00.000Z')
    );
  });

  it('falls back to fimiFecha over fiuxFecha when registeredAt is missing', () => {
    assert.equal(
      admissionDateForPatient({ fimiFecha: '2026-08-18', fiuxFecha: '2026-08-17' }),
      '2026-08-18'
    );
  });

  it('falls back to fiuxFecha when both registeredAt and fimiFecha are missing', () => {
    assert.equal(admissionDateForPatient({ fiuxFecha: '17/08/2026' }), '2026-08-17');
  });

  it('ignores an invalid registeredAt and falls back', () => {
    assert.equal(
      admissionDateForPatient({ registeredAt: 'not-a-date', fimiFecha: '2026-08-18' }),
      '2026-08-18'
    );
  });

  it('is admitted today only when the resolved date matches the local calendar day', () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(isPatientAdmittedToday({ fimiFecha: today }), true);
    assert.equal(isPatientAdmittedToday({ fimiFecha: '2020-01-01' }), false);
    assert.equal(isPatientAdmittedToday({}), false);
  });

  it('is admitted today from a fresh registeredAt with no manual entry', () => {
    assert.equal(isPatientAdmittedToday({ registeredAt: new Date().toISOString() }), true);
  });
});

describe('buildGuardiaCensusTableRowHtml', () => {
  it('renders bed, name, alterados, pendiente text and VENCIDO status', () => {
    storage.saveTodos('p1', [{ id: 't1', text: 'Reponer potasio', completed: false, dueDate: '2020-01-01' }]);
    const html = buildGuardiaCensusTableRowHtml({
      id: 'p1',
      name: 'PÉREZ GARCÍA, JUAN',
      cuarto: '214-B',
      cama: '2',
      monitoreo: {
        historial: [{ vitals: { sat: 89 }, alteredAt: { sat: '2026-08-17T08:00:00Z' } }],
      },
    });
    assert.match(html, /wb-row--alert/);
    assert.match(html, /214-B · 2/);
    assert.match(html, /PÉREZ GARCÍA, JUAN/);
    assert.match(html, /SatO₂ 89/);
    assert.match(html, /Reponer potasio/);
    assert.match(html, /VENCIDO/);
  });

  it('shows sin toma when there is no vitals history', () => {
    const html = buildGuardiaCensusTableRowHtml({ id: 'p2', name: 'X', cama: '1' });
    assert.match(html, /sin toma 08:00/);
  });

  it('uses the exact 92px 1fr 132px 1fr 84px column grid', () => {
    const html = buildGuardiaCensusTableRowHtml({ id: 'p1', name: 'X', cama: '1' });
    assert.match(html, /92px 1fr 132px 1fr 84px/);
  });
});

describe('buildGuardiaCensusTableHtml', () => {
  it('wraps the table in the shared wb-table-card grammar with column heads and chips', () => {
    const html = buildGuardiaCensusTableHtml([{ id: 'p1', name: 'X', cama: '1' }], new Map(), 'R1');
    assert.match(html, /wb-table-card/);
    assert.match(html, /wb-table-colhead/);
    assert.match(html, /Cama.*Paciente.*Alterados.*Pendiente.*Estado/s);
    assert.match(html, /Con pendiente · 0/);
    assert.match(html, /Todos/);
    assert.match(html, /Ingresos/);
  });

  it('groups R4 by team with dividers', () => {
    const patients = [
      { id: 'p1', name: 'A', cama: '1' },
      { id: 'p2', name: 'B', cama: '2' },
    ];
    const html = buildGuardiaCensusTableHtml(patients, new Map(), 'R4', { teams: [], assignments: [] });
    assert.match(html, /gct-divider/);
  });

  it('filters to admitted-today patients under the Ingresos chip', () => {
    const today = new Date().toISOString().slice(0, 10);
    const patients = [
      { id: 'p1', name: 'NUEVO', cama: '1', fimiFecha: today },
      { id: 'p2', name: 'VIEJO', cama: '2', fimiFecha: '2020-01-01' },
    ];
    const html = buildGuardiaCensusTableHtml(patients, new Map(), 'R1', {}, 'ingresos');
    assert.match(html, /NUEVO/);
    assert.doesNotMatch(html, /VIEJO/);
  });

  it('filters to admitted-today under Ingresos using an auto-set registeredAt (no manual entry)', () => {
    const patients = [
      { id: 'p1', name: 'RECIEN LLEGADO', cama: '3', registeredAt: new Date().toISOString() },
      { id: 'p2', name: 'VIEJO', cama: '2', registeredAt: '2020-01-01T00:00:00.000Z' },
    ];
    const html = buildGuardiaCensusTableHtml(patients, new Map(), 'R1', {}, 'ingresos');
    assert.match(html, /RECIEN LLEGADO/);
    assert.doesNotMatch(html, /VIEJO/);
  });

  it('shows a closing summary line for patients with no alterados or pendientes', () => {
    const html = buildGuardiaCensusTableHtml([{ id: 'p1', name: 'X', cama: '1' }], new Map(), 'R1');
    assert.match(html, /wb-table-summary/);
    assert.match(html, /1 paciente sin alterados ni pendientes/);
  });
});

describe('mountGuardiaCensusTable row-enter diffing', () => {
  it('marks only rows new since the previous mount, so a background refresh does not re-fade unchanged rows', () => {
    if (typeof document === 'undefined') return;
    const container = document.createElement('div');

    mountGuardiaCensusTable(container, [{ id: 'p1', name: 'A', cama: '1' }], new Map(), 'R1', {});
    const row1 = container.querySelector('.wb-row[data-wb-row-id="p1"]');
    assert.ok(row1, 'first mount renders row p1');
    assert.match(row1.className, /row-enter/);

    mountGuardiaCensusTable(container, [{ id: 'p1', name: 'A', cama: '1' }], new Map(), 'R1', {});
    const row1Again = container.querySelector('.wb-row[data-wb-row-id="p1"]');
    assert.doesNotMatch(row1Again.className, /row-enter/, 're-mount of an unchanged patient must not re-enter');

    mountGuardiaCensusTable(
      container,
      [{ id: 'p1', name: 'A', cama: '1' }, { id: 'p2', name: 'B', cama: '2' }],
      new Map(),
      'R1',
      {}
    );
    const rowP1 = container.querySelector('.wb-row[data-wb-row-id="p1"]');
    const rowP2 = container.querySelector('.wb-row[data-wb-row-id="p2"]');
    assert.doesNotMatch(rowP1.className, /row-enter/, 'existing patient row stays unmarked');
    assert.match(rowP2.className, /row-enter/, 'newly admitted patient row enters');
  });

  it('leaves a fading ghost of a patient row removed from the census, instead of popping it away instantly', () => {
    if (typeof document === 'undefined') return;
    const container = document.createElement('div');

    mountGuardiaCensusTable(
      container,
      [{ id: 'p1', name: 'A', cama: '1' }, { id: 'p2', name: 'B', cama: '2' }],
      new Map(),
      'R1',
      {}
    );
    assert.ok(container.querySelector('.wb-row[data-wb-row-id="p2"]'));

    mountGuardiaCensusTable(container, [{ id: 'p1', name: 'A', cama: '1' }], new Map(), 'R1', {});
    assert.equal(
      container.querySelector('.wb-row[data-wb-row-id="p2"]'),
      null,
      'discharged patient is gone from the live table'
    );
    const ghost = container.querySelector('.row-exit');
    assert.ok(ghost, 'a ghost copy of the discharged row is appended to animate out');
    assert.match(ghost.textContent, /B/);
  });
});
