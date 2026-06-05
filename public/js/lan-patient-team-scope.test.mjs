import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPatientEntriesForLanTeamScope,
  isPatientInLanTeamSyncScope,
} from './lan-patient-team-scope.mjs';

const baseContext = {
  teams: [{ team_id: 't1', members: [{ user_id: 'r2' }], service: 'Sala', sub_area_fraction: 'A' }],
  assignments: [{ patient_id: 'p1', team_id: 't1', effective_at: '2026-06-01T00:00:00Z' }],
  guardias: [],
  now: '2026-06-02T12:00:00Z',
};

describe('lan-patient-team-scope', () => {
  it('R2 syncs only patients assigned to joined team', () => {
    const user = { user_id: 'r2', rank: 'R2', sala: 'Sala 1' };
    assert.equal(
      isPatientInLanTeamSyncScope(user, { id: 'p1', service: 'Sala' }, null, baseContext),
      true
    );
    assert.equal(
      isPatientInLanTeamSyncScope(user, { id: 'p2', service: 'Torre HU' }, null, baseContext),
      false
    );
  });

  it('R1 syncs only team-assigned patients', () => {
    const user = { user_id: 'r1', rank: 'R1', sala: 'Sala 1' };
    const ctx = {
      teams: [
        {
          team_id: 't-mine',
          service: 'Sala',
          sub_area_fraction: 'B',
          sala: 'Sala 1',
          members: [{ user_id: 'r1' }],
        },
      ],
      assignments: [
        { patient_id: 'p1', team_id: 't-mine', effective_at: '2026-06-01T00:00:00Z' },
        { patient_id: 'p2', team_id: 't-other', effective_at: '2026-06-01T00:00:00Z' },
      ],
      guardias: [],
      now: '2026-06-02T12:00:00Z',
    };
    assert.equal(
      isPatientInLanTeamSyncScope(user, { id: 'p1', service: 'Sala', sala: 'Sala 1' }, null, ctx),
      true
    );
    assert.equal(
      isPatientInLanTeamSyncScope(user, { id: 'p2', service: 'Sala', sala: 'Sala 1' }, null, ctx),
      false
    );
  });

  it('R4 syncs all patients', () => {
    const user = { user_id: 'r4', rank: 'R4' };
    assert.equal(
      isPatientInLanTeamSyncScope(user, { id: 'p9', service: 'Torre HU' }, null, baseContext),
      true
    );
  });

  it('filterPatientEntriesForLanTeamScope drops out-of-scope entries', () => {
    const user = { user_id: 'r2', rank: 'R2', sala: 'Sala 1' };
    const entries = [
      { patient: { id: 'p1', servicio: 'Sala' } },
      { patient: { id: 'p2', servicio: 'Torre HU' } },
    ];
    const filtered = filterPatientEntriesForLanTeamScope(entries, user, baseContext, null);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].patient.id, 'p1');
  });
});
