import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDashboardPaintTargets } from './dashboard-mount.mjs';

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
