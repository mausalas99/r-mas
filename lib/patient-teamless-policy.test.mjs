import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAMLESS_PATIENT_TTL_MS,
  isTeamlessPatientExpired,
  selectExpiredTeamlessPatients,
  teamlessPatientExpiresAtMs,
} from './patient-teamless-policy.mjs';

describe('patient-teamless-policy', () => {
  it('teamlessPatientExpiresAtMs adds 24h to registeredAt', () => {
    const registeredAt = '2026-06-10T12:00:00.000Z';
    assert.equal(
      teamlessPatientExpiresAtMs(registeredAt),
      new Date(registeredAt).getTime() + TEAMLESS_PATIENT_TTL_MS
    );
    assert.equal(teamlessPatientExpiresAtMs(''), null);
  });

  it('isTeamlessPatientExpired ignores assigned and demo patients', () => {
    const assignments = [{ patient_id: 'p1', team_id: 't1', effective_at: '2026-06-01T00:00:00Z' }];
    const oldAt = '2026-06-08T12:00:00.000Z';
    const now = '2026-06-10T12:00:00.000Z';
    assert.equal(
      isTeamlessPatientExpired({ id: 'p1', registeredAt: oldAt }, assignments, now),
      false
    );
    assert.equal(
      isTeamlessPatientExpired({ id: 'p2', registeredAt: oldAt, isDemo: true }, [], now),
      false
    );
    assert.equal(
      isTeamlessPatientExpired({ id: 'p3', registeredAt: oldAt }, [], now),
      true
    );
    assert.equal(
      isTeamlessPatientExpired({ id: 'p4' }, [], now),
      false
    );
  });

  it('selectExpiredTeamlessPatients skips active guardias', () => {
    const patients = [
      { id: 'p1', registeredAt: '2026-06-08T12:00:00.000Z', nombre: 'A' },
      { id: 'p2', registeredAt: '2026-06-08T12:00:00.000Z', nombre: 'B' },
    ];
    const guardias = [{ patient_id: 'p2' }];
    const selected = selectExpiredTeamlessPatients(patients, {
      assignments: [],
      guardias,
      now: '2026-06-10T12:00:00.000Z',
    });
    assert.deepEqual(
      selected.map((p) => p.id),
      ['p1']
    );
  });
});
