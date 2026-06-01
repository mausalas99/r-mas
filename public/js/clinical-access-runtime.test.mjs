import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGuardiasMap,
  mapPatientForGuardiaGrid,
  resolveClinicalRank,
  assertClinicalWriteAllowed,
  clinicalSessionContext,
} from './clinical-access-runtime.mjs';

test('mapPatientForGuardiaGrid maps bed and service fields', () => {
  const row = mapPatientForGuardiaGrid({
    id: 'p1',
    cuarto: '101',
    cama: 'A',
    nombre: 'Test Patient',
    servicio: 'Sala A',
    negativa_maniobras_firmada: 1,
  });
  assert.equal(row.id, 'p1');
  assert.equal(row.bed_label, '101-A');
  assert.equal(row.service, 'Sala A');
  assert.equal(row.negativa_maniobras_firmada, 1);
});

test('buildGuardiasMap indexes by patient_id', () => {
  const map = buildGuardiasMap([
    { patient_id: 'a', is_critical: 1 },
    { patient_id: 'b', is_critical: 0 },
  ]);
  assert.equal(map.get('a')?.is_critical, 1);
  assert.equal(map.size, 2);
});

test('resolveClinicalRank defaults to R1', () => {
  assert.equal(resolveClinicalRank({ clinicalRank: 'R4' }), 'R4');
  assert.equal(resolveClinicalRank({ clinicalRank: 'invalid' }), 'R1');
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
