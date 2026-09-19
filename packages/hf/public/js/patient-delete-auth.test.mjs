import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { canDeletePatientChart } from './patient-delete-auth.mjs';

const scope = {
  teams: [
    {
      team_id: 't-mine',
      members: [{ user_id: 'u-team' }],
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
  it('Admin may delete any chart', () => {
    assert.equal(
      canDeletePatientChart({ user_id: 'u-admin', rank: 'Admin' }, 'p-other', scope),
      true
    );
  });

  it('Team may delete only patients on their joined team', () => {
    const team = { user_id: 'u-team', rank: 'Team' };
    assert.equal(canDeletePatientChart(team, 'p-mine', scope), true);
    assert.equal(canDeletePatientChart(team, 'p-other', scope), false);
    assert.equal(canDeletePatientChart(team, 'p-free', scope), false);
  });

  describe('solo este equipo (no clinical login/team concept)', () => {
    /** @type {Map<string, string>} */
    let memory;

    beforeEach(() => {
      memory = new Map();
      memory.set('rpc-settings', JSON.stringify({ clinicalLocalOnly: true }));
      global.localStorage = {
        getItem(k) {
          return memory.has(k) ? memory.get(k) : null;
        },
      };
    });

    afterEach(() => {
      delete global.localStorage;
    });

    it('allows deleting any local patient with no logged-in user', () => {
      assert.equal(canDeletePatientChart(null, 'p-any', scope), true);
      assert.equal(canDeletePatientChart(undefined, 'p-any', undefined), true);
    });

    it('still rejects an empty patient id', () => {
      assert.equal(canDeletePatientChart(null, '', scope), false);
    });
  });
});
