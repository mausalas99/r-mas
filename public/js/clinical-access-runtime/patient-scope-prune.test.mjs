import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patients, notes, setPatients } from '../app-state.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { setCloudRoomConnected } from '../features/cloud-sync/lan-override.mjs';
import { prunePatientsOutsideVisibleScope } from './patient-scope-prune.mjs';

function seedScope() {
  setPatients([
    { id: 'p-mine', nombre: 'MIO', registro: 'R1', servicio: 'Sala', area: 'A', sala: 'Sala 2' },
    { id: 'p-other', nombre: 'AJENO', registro: 'R9', servicio: 'Sala', area: 'B', sala: 'Sala 2' },
  ]);
  notes['p-other'] = { fecha: '01/01/2026' };
  const team = {
    team_id: 't-mine',
    name: 'Mi equipo',
    service: 'Sala',
    sub_area_fraction: 'A',
    sala: 'Sala 2',
    members: [{ user_id: 'u-r2' }],
  };
  clinicalSessionContext.user = { user_id: 'u-r2', rank: 'R2', sala: 'Sala 2' };
  clinicalSessionContext.scopeContext = {
    teams: [team],
    guardias: [],
    assignments: [
      { patient_id: 'p-mine', team_id: 't-mine', effective_at: '2026-06-01T00:00:00.000Z' },
      { patient_id: 'p-other', team_id: 't-other', effective_at: '2026-06-01T00:00:00.000Z' },
    ],
    cycle: null,
    now: '2026-06-02T12:00:00.000Z',
  };
  clinicalSessionContext.guardiasMap = new Map();
}

function cleanup(prevMobile) {
  setPatients([]);
  delete notes['p-other'];
  clinicalSessionContext.user = null;
  clinicalSessionContext.scopeContext = null;
  clinicalSessionContext.guardiasMap = new Map();
  if (prevMobile) globalThis.__RPC_MOBILE_WEB__ = prevMobile;
  else delete globalThis.__RPC_MOBILE_WEB__;
  setCloudRoomConnected(false);
}

test('prunePatientsOutsideVisibleScope does not hard-delete on desktop Nube', () => {
  const prevMobile = globalThis.__RPC_MOBILE_WEB__;
  delete globalThis.__RPC_MOBILE_WEB__;
  setCloudRoomConnected(true);
  try {
    seedScope();
    const removed = prunePatientsOutsideVisibleScope();
    assert.equal(removed, 0);
    assert.equal(patients.length, 2);
    assert.equal(notes['p-other']?.fecha, '01/01/2026');
  } finally {
    cleanup(prevMobile);
  }
});

test('prunePatientsOutsideVisibleScope removes foreign census on mobile team mirror', () => {
  const prevMobile = globalThis.__RPC_MOBILE_WEB__;
  globalThis.__RPC_MOBILE_WEB__ = true;
  setCloudRoomConnected(true);
  try {
    seedScope();
    const removed = prunePatientsOutsideVisibleScope();
    assert.equal(removed, 1);
    assert.equal(patients.length, 1);
    assert.equal(patients[0].id, 'p-mine');
    assert.equal(notes['p-other'], undefined);
  } finally {
    cleanup(prevMobile);
  }
});
