import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients, getSyncablePatients, setPatients, setPersistPatientsResolver } from '../app-state.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import {
  seedInterconsultaDemoOnMainApp,
  clearInterconsultaDemoFromMainApp,
  recordInterconsultaDemoPatientAssignment,
} from './interconsulta-demo-toggle.mjs';
import { renderInterconsultaBoardView, registerInterconsultaChromeRuntime } from './interconsulta-mode-chrome.mjs';
import { attachProfileSettingsGetter } from './profile-runtime.mjs';
import { elevatedPatientFilters } from './clinical-census-filters-state.mjs';

const NOW = new Date('2026-08-25T12:00:00Z');

test('seeding merges demo patients/teams into the real app without touching real data', () => {
  const realPatient = { id: 'real-1', nombre: 'Paciente Real' };
  setPatients([realPatient]);
  clinicalSessionContext.teams = [{ team_id: 'real-team', service: 'Cirugía' }];
  clinicalSessionContext.scopeContext = null;

  const count = seedInterconsultaDemoOnMainApp(NOW);

  assert.equal(count, 12);
  assert.equal(getPatients().length, 13);
  assert.ok(getPatients().includes(realPatient));
  assert.equal(getPatients().filter((p) => p.isDemo).length, 12);
  assert.equal(clinicalSessionContext.teams.length, 5);
  assert.ok(clinicalSessionContext.teams.some((t) => t.team_id === 'real-team'));
  assert.equal(clinicalSessionContext.scopeContext.teams.length, 5);
  assert.ok(clinicalSessionContext.scopeContext.assignments.length > 0);

  // Hiding from sync: getSyncablePatients() (used by cloud-sync push/pull) excludes demo rows.
  assert.equal(getSyncablePatients().length, 1);
  assert.equal(getSyncablePatients()[0], realPatient);

  clearInterconsultaDemoFromMainApp();
  setPersistPatientsResolver(null);
});

test('clearing removes only demo patients and demo teams, keeps real ones', () => {
  const realPatient = { id: 'real-2', nombre: 'Otro Real' };
  setPatients([realPatient]);
  clinicalSessionContext.teams = [{ team_id: 'real-team-2', service: 'Cirugía' }];
  clinicalSessionContext.scopeContext = null;

  seedInterconsultaDemoOnMainApp(NOW);
  clearInterconsultaDemoFromMainApp();

  assert.equal(getPatients().length, 1);
  assert.equal(getPatients()[0], realPatient);
  assert.equal(clinicalSessionContext.teams.length, 1);
  assert.equal(clinicalSessionContext.teams[0].team_id, 'real-team-2');
  assert.equal(clinicalSessionContext.scopeContext.teams.length, 1);
  assert.equal(clinicalSessionContext.scopeContext.assignments.length, 0);

  setPersistPatientsResolver(null);
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
});

test('a background scope refresh that wholesale-replaces scopeContext (Nube pull / LAN reconcile) does not permanently lose the demo board or a drag/drop reassignment', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div id="interconsulta-mode-frame" hidden></div>' +
    '<div id="patient-dashboard-mount" class="patient-dash"><div class="dash"></div></div>' +
    '<div id="ic-board-mount" hidden></div>';

  setPatients([]);
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
  registerInterconsultaChromeRuntime({ getActiveId: () => null });
  attachProfileSettingsGetter(() => ({ appMode: 'interconsulta' }));

  seedInterconsultaDemoOnMainApp(NOW);
  // Simulate the drag/drop path reassigning a demo patient onto a different team.
  const demoPatient = getPatients().find((p) => p.isDemo);
  recordInterconsultaDemoPatientAssignment(demoPatient.id, 'ic-demo-team-c', NOW.toISOString());

  // Simulate a real scope refresh (fetchClinicalScopeContextFromDb /
  // applyClinicalScopeFromOpsSnapshot) replacing scopeContext wholesale with
  // DB-only state — it knows nothing about the in-memory-only demo teams.
  clinicalSessionContext.scopeContext = { teams: [], assignments: [] };
  clinicalSessionContext.teams = [];

  renderInterconsultaBoardView();

  const html = document.getElementById('ic-board-mount').innerHTML;
  assert.match(html, /Equipo Demo/, 'demo teams must be healed back into scope, not left collapsed');
  const cLaneHtml = html.slice(html.indexOf('Equipo Demo C'));
  assert.match(cLaneHtml, new RegExp(`data-patient-id="${demoPatient.id}"`), 'the drag/drop reassignment must survive the scope wipe, not just the original seed');

  clearInterconsultaDemoFromMainApp();
  setPersistPatientsResolver(null);
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
});

test('a pinned real Equipo/Sala filter does not hide the demo patients', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div id="interconsulta-mode-frame" hidden></div>' +
    '<div id="patient-dashboard-mount" class="patient-dash"><div class="dash"></div></div>' +
    '<div id="ic-board-mount" hidden></div>';

  setPatients([]);
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
  registerInterconsultaChromeRuntime({ getActiveId: () => null });
  attachProfileSettingsGetter(() => ({ appMode: 'interconsulta' }));

  // Simulates a real pinned Equipo preference from normal (non-demo) use —
  // this used to zero out every demo patient (none match a real team id).
  elevatedPatientFilters.teamId = 'a-real-pinned-team-id';
  elevatedPatientFilters.sala = 'a-real-sala-id';

  seedInterconsultaDemoOnMainApp(NOW);
  renderInterconsultaBoardView();

  const html = document.getElementById('ic-board-mount').innerHTML;
  assert.match(html, /Rosa Delgado/);

  elevatedPatientFilters.teamId = '';
  elevatedPatientFilters.sala = '__all__';
  clearInterconsultaDemoFromMainApp();
  setPersistPatientsResolver(null);
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
});

test('renderInterconsultaBoardView shows only demo teams/patients while the demo is active', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div id="interconsulta-mode-frame" hidden></div>' +
    '<div id="patient-dashboard-mount" class="patient-dash"><div class="dash"></div></div>' +
    '<div id="ic-board-mount" hidden></div>';

  const realPatient = { id: 'real-3', nombre: 'Paciente Real Board', interconsult_status: 'Active' };
  setPatients([realPatient]);
  clinicalSessionContext.teams = [
    { team_id: 'real-team-3', name: 'Equipo Real', service: 'Interconsultas', sub_area_fraction: 'A' },
  ];
  clinicalSessionContext.scopeContext = null;
  registerInterconsultaChromeRuntime({ getActiveId: () => null });
  attachProfileSettingsGetter(() => ({ appMode: 'interconsulta' }));

  seedInterconsultaDemoOnMainApp(NOW);
  renderInterconsultaBoardView();

  const html = document.getElementById('ic-board-mount').innerHTML;
  assert.match(html, /Rosa Delgado/); // a demo follow-up patient
  assert.doesNotMatch(html, /Paciente Real Board/);
  assert.doesNotMatch(html, /Equipo Real/);
  assert.match(html, /Equipo Demo/);

  clearInterconsultaDemoFromMainApp();
  renderInterconsultaBoardView();
  const htmlAfterClear = document.getElementById('ic-board-mount').innerHTML;
  assert.match(htmlAfterClear, /Paciente Real Board/);
  assert.doesNotMatch(htmlAfterClear, /Rosa Delgado/);

  setPersistPatientsResolver(null);
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
});
