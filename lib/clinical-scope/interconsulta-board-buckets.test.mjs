import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyInterconsultaBoardBucket } from './interconsulta-board-buckets.mjs';

const NOW = new Date('2026-08-25T12:00:00Z');

test('archivado when interconsult_status is Resolved', () => {
  const patient = { interconsult_status: 'Resolved', interconsult_type: 'Ephemeral_VPO' };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: true, now: NOW }), 'archivado');
});

test('under when interconsult_type is Under', () => {
  const patient = { interconsult_status: 'Pending', interconsult_type: 'Under' };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: true, now: NOW }), 'under');
});

test('preop when guardia team and Ephemeral_VPO', () => {
  const patient = { interconsult_status: 'Pending', interconsult_type: 'Ephemeral_VPO' };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: true, now: NOW }), 'preop');
});

test('preop when guardia team, followUpStatus pendiente, created today', () => {
  const patient = {
    interconsult_status: 'Pending',
    interconsult_type: 'Follow-up',
    created_at: '2026-08-25T09:00:00Z',
    consultInfo: { followUpStatus: 'pendiente' },
  };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: true, now: NOW }), 'preop');
});

test('pendientes when guardia-eligible preop patient but isGuardiaTeam is false', () => {
  const patient = { interconsult_status: 'Pending', interconsult_type: 'Ephemeral_VPO' };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: false, now: NOW }), 'pendientes');
});

test('pendientes when guardia team but followUpStatus pendiente was not created today', () => {
  const patient = {
    interconsult_status: 'Pending',
    interconsult_type: 'Follow-up',
    created_at: '2026-08-20T09:00:00Z',
    consultInfo: { followUpStatus: 'pendiente' },
  };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: true, now: NOW }), 'pendientes');
});

test('pendientes default for non-guardia, non-special patient', () => {
  const patient = { interconsult_status: 'Active', interconsult_type: 'None' };
  assert.equal(classifyInterconsultaBoardBucket(patient, { isGuardiaTeam: false, now: NOW }), 'pendientes');
});
