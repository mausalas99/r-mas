import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDashboardPaintTargets, buildEaInputFromPatient, shouldRefreshDashboardForLabs } from './dashboard-mount.mjs';

test('no-arg render targets the classic host on Resumen', () => {
  var classic = { id: 'classic' };
  var targets = resolveDashboardPaintTargets({
    classic: classic,
    inner: 'resumen',
  });
  assert.deepEqual(targets, [classic]);
});

test('skips the classic host when its wrap is display none', () => {
  var classic = { id: 'classic' };
  assert.deepEqual(
    resolveDashboardPaintTargets({
      classic: classic,
      classicWrap: { style: { display: 'none' } },
      inner: 'resumen',
    }),
    []
  );
});

test('explicit host paints only that host', () => {
  var classic = { id: 'classic' };
  var explicit = { id: 'explicit' };
  var targets = resolveDashboardPaintTargets({
    hostEl: explicit,
    classic: classic,
    inner: 'resumen',
  });
  assert.deepEqual(targets, [explicit]);
});

test('classic host does not paint when inner is not resumen', () => {
  var classic = { id: 'classic' };
  var targets = resolveDashboardPaintTargets({
    classic: classic,
    inner: 'clinico',
  });
  assert.deepEqual(targets, []);
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
  assert.equal(shouldRefreshDashboardForLabs('nota', 'resumen'), true);
  assert.equal(shouldRefreshDashboardForLabs('lab', 'resumen'), false);
  assert.equal(shouldRefreshDashboardForLabs('nota', 'todo'), false);
  assert.equal(shouldRefreshDashboardForLabs('nota', 'clinico'), false);
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
  const nav = readFileSync(join(dir, '../expediente-navigation.mjs'), 'utf8');
  const refreshFn = nav.slice(
    nav.indexOf('export function refreshExpedienteAfterPatientSelect'),
    nav.indexOf('export function switchConsolidatedTab')
  );
  assert.match(refreshFn, /deferLabs: !!opts\.patientChanged/);
  const cache = readFileSync(join(dir, '../expediente-inner-cache.mjs'), 'utf8');
  assert.match(cache, /deferLabs: !!\(opts && opts\.deferLabs\)/);
});

test('patient select does not force-warm EA/Tendencias at 1.2s', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const nav = readFileSync(join(dir, '../expediente-navigation.mjs'), 'utf8');
  const warmFn = nav.slice(
    nav.indexOf('export function refreshExpedienteAfterPatientSelect'),
    nav.indexOf('export function switchConsolidatedTab')
  );
  assert.doesNotMatch(warmFn, /warmExpedienteHeavyTabs/);
  const cache = readFileSync(join(dir, '../expediente-inner-cache.mjs'), 'utf8');
  assert.match(cache, /scheduleIdle\(warmNext, 8000\)/);
  assert.doesNotMatch(cache, /, 1200\)/);
});
