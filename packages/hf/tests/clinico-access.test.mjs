import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICO_UNLOCK_PHRASE,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  evaluateClinicalScope,
  isInterconsultasPatient,
} from '../public/js/clinico-access.mjs';

// --- unlock modal ---------------------------------------------------------

test('matchesClinicoUnlockPhrase accepts exact phrase', () => {
  assert.equal(matchesClinicoUnlockPhrase(CLINICO_UNLOCK_PHRASE), true);
});

test('matchesClinicoUnlockPhrase ignores case and accents', () => {
  assert.equal(matchesClinicoUnlockPhrase('Entiendo, usare mi criterio clincio'), true);
});

test('isClinicoAccessHidden is true until unlocked', () => {
  assert.equal(isClinicoAccessHidden({}), true);
  assert.equal(isClinicoAccessHidden({ hideManejoSection: false }), false);
});

test('isClinicoUnlocked respects clinicoUnlocked flag', () => {
  assert.equal(isClinicoUnlocked({ clinicoUnlocked: true, hideManejoSection: true }), true);
  assert.equal(isClinicoUnlocked({ clinicoUnlocked: false }), false);
});

// --- evaluateClinicalScope: 3-step pipeline -------------------------------
// identity check -> Admin bypass (full read/write always) ->
// incoming-preview-window check (Team only) -> Team gets full read/write otherwise.

const admin = { user_id: 'u-admin', rank: 'Admin' };
const team = { user_id: 'u-team', rank: 'Team' };
const patient = { id: 'p-1' };

test('denies when user or patient is not identified', () => {
  assert.equal(evaluateClinicalScope(null, patient).readable, false);
  assert.equal(evaluateClinicalScope(team, null).readable, false);
  assert.equal(evaluateClinicalScope({}, patient).readable, false);
});

test('Admin has full read/write on any patient, unconditionally', () => {
  const scope = evaluateClinicalScope(admin, patient);
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
  assert.equal(scope.reasoning, 'Admin: acceso completo');
});

test('Admin bypasses the incoming-preview window entirely', () => {
  const cycle = { preview_start_at: '2026-01-01T00:00:00Z', effective_at: '2026-01-02T00:00:00Z' };
  const context = {
    cycle,
    now: '2026-01-01T12:00:00Z',
    assignments: [{ patient_id: 'p-1', effective_at: '2026-01-02T00:00:00Z' }],
  };
  const scope = evaluateClinicalScope(admin, patient, null, context);
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
  assert.equal(scope.reasoning, 'Admin: acceso completo');
});

test('Team has full read (and write) on any patient, with no team/sala/assignment fallback', () => {
  const scope = evaluateClinicalScope(team, patient);
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
  assert.equal(scope.reasoning, 'Team: lectura y escritura completas');
});

test('Team with no joined team still sees the patient (core behavior change)', () => {
  const unassignedTeamUser = { user_id: 'u-team-2', rank: 'Team' };
  const scope = evaluateClinicalScope(unassignedTeamUser, { id: 'p-unassigned' });
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('Team inside the incoming-preview window with a pending future assignment gets read-only preview', () => {
  const cycle = { preview_start_at: '2026-01-01T00:00:00Z', effective_at: '2026-01-02T00:00:00Z' };
  const context = {
    cycle,
    now: '2026-01-01T12:00:00Z',
    assignments: [{ patient_id: 'p-1', effective_at: '2026-01-02T00:00:00Z' }],
  };
  const scope = evaluateClinicalScope(team, patient, null, context);
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false);
  assert.equal(scope.incomingPreview, true);
  assert.equal(scope.reasoning, 'Vista previa Incoming: lectura permitida hasta vigencia');
});

test('Team inside the preview window but with no matching assignment falls through to full access', () => {
  const cycle = { preview_start_at: '2026-01-01T00:00:00Z', effective_at: '2026-01-02T00:00:00Z' };
  const context = { cycle, now: '2026-01-01T12:00:00Z', assignments: [] };
  const scope = evaluateClinicalScope(team, patient, null, context);
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('Team outside the preview window gets full access even with a matching assignment', () => {
  const cycle = { preview_start_at: '2026-01-01T00:00:00Z', effective_at: '2026-01-02T00:00:00Z' };
  const context = {
    cycle,
    now: '2026-01-03T00:00:00Z',
    assignments: [{ patient_id: 'p-1', effective_at: '2026-01-02T00:00:00Z' }],
  };
  const scope = evaluateClinicalScope(team, patient, null, context);
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

// --- isInterconsultasPatient -----------------------------------------------
// Kept alive for this test file only per plan step 4 (no production caller left).

test('isInterconsultasPatient detects interconsult service/sub-area/type', () => {
  assert.equal(isInterconsultasPatient({ service: 'Interconsultas' }), true);
  assert.equal(isInterconsultasPatient({ sub_area: 'interconsulta' }), true);
  assert.equal(isInterconsultasPatient({ interconsult_type: 'Cardiologia' }), true);
  assert.equal(isInterconsultasPatient({ service: 'HF' }), false);
  assert.equal(isInterconsultasPatient(null), false);
});
