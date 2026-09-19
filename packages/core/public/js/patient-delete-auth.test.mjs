import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canDeletePatientChart } from './patient-delete-auth.mjs';

const scope = {
  teams: [
    {
      team_id: 't-mine',
      members: [{ user_id: 'u-r1' }],
    },
    {
      team_id: 't-other',
      members: [{ user_id: 'u-other' }],
    },
  ],
  assignments: [
    { patient_id: 'p-mine', team_id: 't-mine', effective_at: '2026-06-01T00:00:00Z' },
    { patient_id: 'p-other', team_id: 't-other', effective_at: '2026-06-01T00:00:00Z' },
  ],
  now: '2026-06-02T12:00:00Z',
};

describe('canDeletePatientChart', () => {
  it('Admin/R4 may delete any chart', () => {
    assert.equal(
      canDeletePatientChart({ user_id: 'u-r4', rank: 'R4' }, 'p-other', scope),
      true
    );
    assert.equal(
      canDeletePatientChart({ user_id: 'u-admin', rank: 'Admin' }, 'p-other', scope),
      true
    );
  });

  it('R1 may delete only patients on their joined team', () => {
    const r1 = { user_id: 'u-r1', rank: 'R1' };
    assert.equal(canDeletePatientChart(r1, 'p-mine', scope), true);
    assert.equal(canDeletePatientChart(r1, 'p-other', scope), false);
    assert.equal(canDeletePatientChart(r1, 'p-free', scope), false);
  });
});
