import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildGuardiasMap,
  resolveClinicalRank,
  assertClinicalWriteAllowed,
  clinicalSessionContext,
} from './clinical-access-runtime.mjs';

test('buildGuardiasMap indexes by patient_id', () => {
  const map = buildGuardiasMap([
    { patient_id: 'a', is_critical: 1 },
    { patient_id: 'b', is_critical: 0 },
  ]);
  assert.equal(map.get('a')?.is_critical, 1);
  assert.equal(map.size, 2);
});

test('resolveClinicalRank defaults to Team', () => {
  assert.equal(resolveClinicalRank({ clinicalRank: 'Admin' }), 'Admin');
  assert.equal(resolveClinicalRank({ clinicalRank: 'invalid' }), 'Team');
});

test('assertClinicalWriteAllowed allows Admin writes', () => {
  clinicalSessionContext.user = { user_id: 'u1', rank: 'Admin' };
  clinicalSessionContext.scopeContext = {
    teams: [],
    guardias: [],
    cycle: null,
    assignments: [],
    salaGuardiaToday: [],
    now: new Date().toISOString(),
  };
  const scope = assertClinicalWriteAllowed('p1');
  assert.equal(scope.writable, true);
});

test('elevated ward census schedules full host reconcile', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'clinical-access-runtime/census-nube-pull.mjs'),
    'utf8'
  );
  assert.match(src, /ensureElevatedWardCensusOnDevice/);
  assert.match(src, /full-ward-census/);
});

test('ops-sync refresh debounces Nube census pull after clinicalOps merge', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'clinical-access-runtime/census-nube-pull.mjs'),
    'utf8'
  );
  assert.match(src, /allowLanPull: false/);
  assert.match(src, /runNubePatientReconcile/);
  assert.match(src, /clinicalOpsSyncedRefreshTimer/);
});

test('missing assigned patients trigger Nube sala-room syncCycle', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'clinical-access-runtime/census-nube-pull.mjs'),
    'utf8'
  );
  assert.match(src, /scheduleLanPatientReconcile/);
  assert.match(src, /syncCycle/);
  assert.doesNotMatch(src, /scheduleReconcileLiveSyncRoom/);
});
