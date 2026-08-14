import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDashboardPaintTargets, buildEaInputFromPatient, shouldRefreshDashboardForLabs } from './dashboard-mount.mjs';

test('no-arg render targets both classic and ronda hosts', () => {
  var classic = { id: 'classic' };
  var ronda = { id: 'ronda' };
  var targets = resolveDashboardPaintTargets({
    classic: classic,
    ronda: ronda,
    inner: 'resumen',
  });
  assert.deepEqual(targets, [classic, ronda]);
});

test('skips a host whose wrap is display none', () => {
  var classic = { id: 'classic' };
  var ronda = { id: 'ronda' };
  var hiddenOverview = { style: { display: 'none' } };
  assert.deepEqual(
    resolveDashboardPaintTargets({
      classic: classic,
      ronda: ronda,
      rondaWrap: hiddenOverview,
      inner: 'resumen',
    }),
    [classic]
  );
  assert.deepEqual(
    resolveDashboardPaintTargets({
      classic: classic,
      ronda: ronda,
      classicWrap: { style: { display: 'none' } },
      inner: 'resumen',
    }),
    [ronda]
  );
});

test('explicit host paints only that host', () => {
  var classic = { id: 'classic' };
  var ronda = { id: 'ronda' };
  var targets = resolveDashboardPaintTargets({
    hostEl: ronda,
    classic: classic,
    ronda: ronda,
    inner: 'resumen',
  });
  assert.deepEqual(targets, [ronda]);
});

test('ronda host still paints when inner is not resumen', () => {
  var classic = { id: 'classic' };
  var ronda = { id: 'ronda' };
  var targets = resolveDashboardPaintTargets({
    classic: classic,
    ronda: ronda,
    inner: 'clinico',
  });
  assert.deepEqual(targets, [ronda]);
});

test('buildEaInputFromPatient does not throw when the patient has no monitoreo (no active patient on boot)', () => {
  assert.doesNotThrow(function () {
    buildEaInputFromPatient({});
  });
  var result = buildEaInputFromPatient({});
  assert.equal(result.soporte, undefined);
  assert.equal(result.bombaOn, false);
});

test('buildEaInputFromPatient advances ATB día from receta fechaActualizacion', () => {
  var input = buildEaInputFromPatient(
    {
      id: 'p1',
      monitoreo: {
        estadoClinico: { abx: 'LINEZOLID 600MG VO C/12H DIA 5' },
      },
    },
    {
      medRecetaByPatient: { p1: { fechaActualizacion: '10/08/2026', items: [] } },
      refDate: new Date(2026, 7, 13),
    },
  );
  assert.ok(input.soap && input.soap.abx);
  assert.match(input.soap.abx[0], /DIA 8/);
});

test('shouldRefreshDashboardForLabs paints Paciente Resumen, not Laboratorio', () => {
  assert.equal(shouldRefreshDashboardForLabs('nota', 'resumen', null), true);
  assert.equal(shouldRefreshDashboardForLabs('lab', 'resumen', null), false);
  assert.equal(shouldRefreshDashboardForLabs('nota', 'todo', null), false);
  assert.equal(shouldRefreshDashboardForLabs('nota', 'clinico', { hidden: false }), true);
  assert.equal(shouldRefreshDashboardForLabs('nota', 'clinico', { hidden: true }), false);
});

test('Resumen glance does not settle-fade or persist on collect', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dashboard-mount.mjs'), 'utf8');
  assert.doesNotMatch(src, /settlePasteSurface/);
  const collectStart = src.indexOf('function collectDashboardModel');
  const collect = src.slice(collectStart, collectStart + 500);
  assert.doesNotMatch(collect, /persistClinicalState/);
  assert.doesNotMatch(collect, /applyExactLabHistoryDedupe/);
});

test('patient select defers labs glance until after identity paints', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const mount = readFileSync(join(dir, 'dashboard-mount.mjs'), 'utf8');
  const renderFn = mount.slice(
    mount.indexOf('export function renderPatientDashboard'),
    mount.indexOf('export const windowHandlers')
  );
  assert.match(renderFn, /deferLabs/);
  assert.match(renderFn, /scheduleAfterPaintThenIdle/);
  assert.match(renderFn, /fillDashboardLabs/);
  const nav = readFileSync(join(dir, '../pase-board-navigation.mjs'), 'utf8');
  const refreshFn = nav.slice(
    nav.indexOf('export function refreshExpedienteAfterPatientSelect'),
    nav.indexOf('export function switchConsolidatedTab')
  );
  assert.match(refreshFn, /deferLabs: !!opts\.patientChanged/);
  const cache = readFileSync(join(dir, '../pase-board-inner-cache.mjs'), 'utf8');
  assert.match(cache, /deferLabs: !!\(opts && opts\.deferLabs\)/);
});

test('patient select does not force-warm EA/Tendencias at 1.2s', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const nav = readFileSync(join(dir, '../pase-board-navigation.mjs'), 'utf8');
  const warmFn = nav.slice(
    nav.indexOf('export function refreshExpedienteAfterPatientSelect'),
    nav.indexOf('export function switchConsolidatedTab')
  );
  assert.doesNotMatch(warmFn, /warmExpedienteHeavyTabs/);
  const cache = readFileSync(join(dir, '../pase-board-inner-cache.mjs'), 'utf8');
  assert.match(cache, /scheduleIdle\(warmNext, 8000\)/);
  assert.doesNotMatch(cache, /, 1200\)/);
});
