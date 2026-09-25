import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../storage.js';
import {
  hydrateClinicalReadModel,
  resetClinicalReadModelForTests,
} from '../clinical-read-model.mjs';
import {
  alteradosForPatient,
  patientPendientes,
  guardiaPatientStatus,
  admissionDateForPatient,
  isPatientAdmittedToday,
  isProbableDischargeCandidate,
  buildGuardiaCensusCardHtml,
  buildGuardiaCensusTableHtml,
  mountGuardiaCensusTable,
  buildGuardiaMarksBadgesHtml,
  normalizeGuardiaEsfuerzo,
  normalizeGuardiaPronostico,
  normalizeGuardiaNota,
  normalizeGuardiaMarksPatch,
  collapsedGroupIds,
  guardiaTaskLinesFor,
} from './guardia-census-table.mjs';

function fecha(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const store = {};

function isoLocalDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  collapsedGroupIds.clear();
  resetClinicalReadModelForTests();
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
  collapsedGroupIds.clear();
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
    const today = new Date().toLocaleDateString('sv-SE');
    assert.equal(isPatientAdmittedToday({ fimiFecha: today }), true);
    assert.equal(isPatientAdmittedToday({ fimiFecha: '2020-01-01' }), false);
    assert.equal(isPatientAdmittedToday({}), false);
  });

  it('is admitted today from a fresh registeredAt with no manual entry', () => {
    assert.equal(isPatientAdmittedToday({ registeredAt: new Date().toISOString() }), true);
  });
});

describe('buildGuardiaCensusCardHtml', () => {
  it('renders bed, short name, an alert accent and the overdue task text when vencido', () => {
    storage.saveTodos('p1', [{ id: 't1', text: 'Reponer potasio', completed: false, dueDate: '2020-01-01' }]);
    const html = buildGuardiaCensusCardHtml({
      id: 'p1',
      name: 'PÉREZ GARCÍA, JUAN',
      cuarto: '214-B',
      cama: '2',
    });
    assert.match(html, /gct-card--alert/);
    assert.match(html, /data-wb-row-id="p1"/);
    assert.match(html, /214-B · 2/);
    assert.match(html, />PÉREZ GARCÍA</);
    assert.match(html, /title="PÉREZ GARCÍA, JUAN" aria-label="PÉREZ GARCÍA, JUAN"/);
    assert.match(html, /Reponer potasio/);
  });

  it('shows an empty task line and no alert accent when there is no open pendiente', () => {
    const html = buildGuardiaCensusCardHtml({ id: 'p2', name: 'X', cama: '1' });
    assert.match(html, /<span class="gct-task"><\/span>/);
    assert.doesNotMatch(html, /gct-card--alert/);
  });

  it('shows a +N badge for the pendientes not shown on the card', () => {
    storage.saveTodos('p3', [
      { id: 't1', text: 'Reponer potasio', completed: false, dueDate: '2020-01-01' },
      { id: 't2', text: 'Pedir labs', completed: false },
      { id: 't3', text: 'Avisar a familia', completed: false },
    ]);
    const html = buildGuardiaCensusCardHtml({ id: 'p3', name: 'X', cama: '1' });
    assert.match(html, /Reponer potasio/);
    assert.match(html, /class="gct-task-more" title="2 pendientes más">\+2</);
  });

  it('shows no +N badge when there is only one pendiente', () => {
    storage.saveTodos('p4', [{ id: 't1', text: 'Reponer potasio', completed: false }]);
    const html = buildGuardiaCensusCardHtml({ id: 'p4', name: 'X', cama: '1' });
    assert.doesNotMatch(html, /gct-task-more/);
  });

  it('renders a mark chip with a title for each set mark', () => {
    const html = buildGuardiaCensusCardHtml({
      id: 'p1',
      name: 'X',
      cama: '1',
      guardiaEsfuerzo: 'show',
      guardiaPronostico: 'good',
    });
    assert.match(html, /class="gct-chip" title="Esfuerzo: Show"/);
    assert.match(html, /class="gct-chip" title="Pronóstico: Bueno"/);
  });

  it('renders no mark chip when both marks are unset or invalid', () => {
    const html = buildGuardiaCensusCardHtml({ id: 'p1', name: 'X', cama: '1', guardiaEsfuerzo: 'zzz' });
    assert.doesNotMatch(html, /gct-chip/);
  });

  it('flags no-reanimar and bad prognosis as risk chips', () => {
    const html = buildGuardiaCensusCardHtml({
      id: 'p1',
      name: 'X',
      cama: '1',
      guardiaEsfuerzo: 'no',
      guardiaPronostico: 'bad',
    });
    assert.match(html, /class="gct-chip gct-chip--risk" title="Esfuerzo: No reanimar"/);
    assert.match(html, /class="gct-chip gct-chip--risk" title="Pronóstico: Malo"/);
  });

  it('does not render dx, nota or alterados text on the card', () => {
    const html = buildGuardiaCensusCardHtml({
      id: 'p1',
      name: 'X',
      cama: '1',
      dxText: 'NAC + EPOC',
      guardiaNota: 'SV c/4h',
      monitoreo: { historial: [{ vitals: { sat: 89 }, alteredAt: { sat: '2026-08-17T08:00:00Z' } }] },
    });
    assert.doesNotMatch(html, /NAC \+ EPOC/);
    assert.doesNotMatch(html, /SV c\/4h/);
    assert.doesNotMatch(html, /SatO₂/);
  });

  describe('sin laboratorios recientes (posible alta)', () => {
    const complete = { id: 'p1', name: 'X', cuarto: '201', cama: '1', servicio: 'Medicina Interna' };

    it('flags a patient with no lab history at all', () => {
      assert.equal(isProbableDischargeCandidate(complete), true);
      assert.match(buildGuardiaCensusCardHtml(complete), /gct-card--stale-labs/);
    });

    it('flags a patient whose last lab is more than 7 days old', () => {
      hydrateClinicalReadModel({ labHistory: { p1: [{ fecha: fecha(10), hora: '08:00', resLabs: [] }] } });
      assert.equal(isProbableDischargeCandidate(complete), true);
      assert.match(buildGuardiaCensusCardHtml(complete), /gct-card--stale-labs/);
    });

    it('does not flag a patient with labs in the last 7 days', () => {
      hydrateClinicalReadModel({ labHistory: { p1: [{ fecha: fecha(2), hora: '08:00', resLabs: [] }] } });
      assert.equal(isProbableDischargeCandidate(complete), false);
      assert.doesNotMatch(buildGuardiaCensusCardHtml(complete), /gct-card--stale-labs/);
    });

    it('does not flag a patient with an incomplete admission', () => {
      const html = buildGuardiaCensusCardHtml({ id: 'p1', name: 'X', cama: '1' });
      assert.doesNotMatch(html, /gct-card--stale-labs/);
    });
  });
});

describe('buildGuardiaMarksBadgesHtml', () => {
  it('returns empty string when no marks are set', () => {
    assert.equal(buildGuardiaMarksBadgesHtml({}), '');
  });

  it('renders esfuerzo before pronóstico', () => {
    const html = buildGuardiaMarksBadgesHtml({ guardiaEsfuerzo: 'no', guardiaPronostico: 'bad' });
    assert.ok(html.indexOf('🚫') < html.indexOf('🙁'));
  });
});

describe('guardia marks normalizers', () => {
  it('normalizeGuardiaEsfuerzo passes known ids through and rejects unknown', () => {
    assert.equal(normalizeGuardiaEsfuerzo('full'), 'full');
    assert.equal(normalizeGuardiaEsfuerzo('zzz'), null);
    assert.equal(normalizeGuardiaEsfuerzo(undefined), null);
  });

  it('normalizeGuardiaPronostico passes known ids through and rejects unknown', () => {
    assert.equal(normalizeGuardiaPronostico('good'), 'good');
    assert.equal(normalizeGuardiaPronostico('zzz'), null);
    assert.equal(normalizeGuardiaPronostico(undefined), null);
  });

  it('normalizeGuardiaNota trims, collapses whitespace and caps at 200 chars', () => {
    assert.equal(normalizeGuardiaNota('  SV   c/4h  '), 'SV c/4h');
    assert.equal(normalizeGuardiaNota(undefined), '');
    assert.equal(normalizeGuardiaNota('a'.repeat(250)).length, 200);
  });

  it('normalizeGuardiaMarksPatch only normalizes keys present in the patch', () => {
    assert.deepEqual(normalizeGuardiaMarksPatch({ guardiaEsfuerzo: 'no' }), { guardiaEsfuerzo: 'no' });
    assert.deepEqual(normalizeGuardiaMarksPatch({}), {});
  });
});

describe('buildGuardiaCensusTableHtml', () => {
  it('wraps the table in the shared wb-table-card grammar with chips and no column heads', () => {
    const html = buildGuardiaCensusTableHtml([{ id: 'p1', name: 'X', cama: '1' }], new Map(), 'R1');
    assert.match(html, /wb-table-card/);
    assert.doesNotMatch(html, /wb-table-colhead/);
    assert.match(html, /Con pendiente · 0/);
    assert.match(html, /Todos/);
    assert.match(html, /Ingresos/);
  });

  it('puts the Cambiar sala button in the table header, not a separate bar', () => {
    const html = buildGuardiaCensusTableHtml([{ id: 'p1', name: 'X', cama: '1' }], new Map(), 'R1');
    assert.match(html, /<button type="button" class="wb-btn wb-btn-secondary" id="guardia-btn-cambiar-sala">Cambiar<\/button>/);
  });

  it('groups by team with collapsible details/summary dividers for every rank, including R1', () => {
    const patients = [
      { id: 'p1', name: 'A', cama: '1' },
      { id: 'p2', name: 'B', cama: '2' },
    ];
    const html = buildGuardiaCensusTableHtml(patients, new Map(), 'R1', { teams: [], assignments: [] });
    assert.match(html, /<details class="gct-team-group"[^>]*\bopen\b/);
    assert.match(html, /<summary class="gct-divider">/);
    assert.match(html, /· 2</); // patient count next to the group label
  });

  it('omits the open attribute for a group whose key is in collapsedGroupIds', () => {
    const patients = [{ id: 'p1', name: 'A', cama: '1' }];
    collapsedGroupIds.add('Sin equipo asignado');
    const html = buildGuardiaCensusTableHtml(patients, new Map(), 'R1', { teams: [], assignments: [] });
    const detailsTag = html.match(/<details class="gct-team-group"[^>]*>/)[0];
    assert.doesNotMatch(detailsTag, /\bopen\b/);
  });

  it('filters to admitted-today patients under the Ingresos chip', () => {
    const today = new Date().toLocaleDateString('sv-SE');
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
    const row1 = container.querySelector('.gct-card[data-wb-row-id="p1"]');
    assert.ok(row1, 'first mount renders row p1');
    assert.match(row1.className, /row-enter/);

    mountGuardiaCensusTable(container, [{ id: 'p1', name: 'A', cama: '1' }], new Map(), 'R1', {});
    const row1Again = container.querySelector('.gct-card[data-wb-row-id="p1"]');
    assert.doesNotMatch(row1Again.className, /row-enter/, 're-mount of an unchanged patient must not re-enter');

    mountGuardiaCensusTable(
      container,
      [{ id: 'p1', name: 'A', cama: '1' }, { id: 'p2', name: 'B', cama: '2' }],
      new Map(),
      'R1',
      {}
    );
    const rowP1 = container.querySelector('.gct-card[data-wb-row-id="p1"]');
    const rowP2 = container.querySelector('.gct-card[data-wb-row-id="p2"]');
    assert.doesNotMatch(rowP1.className, /row-enter/, 'existing patient row stays unmarked');
    assert.match(rowP2.className, /row-enter/, 'newly admitted patient row enters');
  });

  it('collapsing a team group via native toggle persists across a second render', () => {
    if (typeof document === 'undefined') return;
    const container = document.createElement('div');
    const patients = [{ id: 'p1', name: 'A', cama: '1' }];

    mountGuardiaCensusTable(container, patients, new Map(), 'R1', { teams: [], assignments: [] });
    const details = container.querySelector('details.gct-team-group');
    assert.ok(details.open, 'group starts open');

    details.open = false;
    details.dispatchEvent(new Event('toggle'));
    assert.ok(collapsedGroupIds.has('Sin equipo asignado'), 'collapse is recorded in module state');

    mountGuardiaCensusTable(container, patients, new Map(), 'R1', { teams: [], assignments: [] });
    const detailsAgain = container.querySelector('details.gct-team-group');
    assert.equal(detailsAgain.open, false, 'collapsed state survives the re-render');
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
    assert.ok(container.querySelector('.gct-card[data-wb-row-id="p2"]'));

    mountGuardiaCensusTable(container, [{ id: 'p1', name: 'A', cama: '1' }], new Map(), 'R1', {});
    assert.equal(
      container.querySelector('.gct-card[data-wb-row-id="p2"]'),
      null,
      'discharged patient is gone from the live table'
    );
    const ghost = container.querySelector('.row-exit');
    assert.ok(ghost, 'a ghost copy of the discharged row is appended to animate out');
    assert.match(ghost.textContent, /B/);
  });
});

describe('guardiaTaskLinesFor', () => {
  it('only grants a line tier once the card is tall enough to render it without clipping', () => {
    assert.equal(guardiaTaskLinesFor(60), '1');
    assert.equal(guardiaTaskLinesFor(77), '1');
    assert.equal(guardiaTaskLinesFor(78), '2');
    assert.equal(guardiaTaskLinesFor(94), '2');
    assert.equal(guardiaTaskLinesFor(95), '3');
    assert.equal(guardiaTaskLinesFor(200), '3');
  });
});
