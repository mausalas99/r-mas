import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeClinicalOpsLww } from './clinical-ops-lww.mjs';

describe('mergeClinicalOpsLww (client)', () => {
  it('null prev returns incoming', () => {
    const inc = { teams: [{ team_id: 't1' }] };
    assert.deepEqual(mergeClinicalOpsLww(null, inc), inc);
  });

  it('null incoming returns prev', () => {
    const prev = { teams: [{ team_id: 't1' }] };
    assert.deepEqual(mergeClinicalOpsLww(prev, null), prev);
  });

  it('merges teams by team_id — last writer wins per id', () => {
    const result = mergeClinicalOpsLww(
      { teams: [{ team_id: 't1', name: 'A' }] },
      { teams: [{ team_id: 't1', name: 'B' }, { team_id: 't2', name: 'C' }] }
    );
    assert.equal(result.teams.length, 2);
    assert.equal(result.teams.find((t) => t.team_id === 't1').name, 'B');
  });

  it('unions patient_team_assignment — peer assignments are preserved', () => {
    const result = mergeClinicalOpsLww(
      { patient_team_assignment: [{ patient_id: 'p1', team_id: 't1' }] },
      { patient_team_assignment: [] }
    );
    assert.equal(result.patient_team_assignment.length, 1);
    assert.equal(result.patient_team_assignment[0].patient_id, 'p1');
  });

  it('unions team_membership across concurrent pushes', () => {
    const result = mergeClinicalOpsLww(
      { team_membership: [{ team_id: 't1', user_id: 'u-a' }] },
      { team_membership: [{ team_id: 't1', user_id: 'u-b' }] }
    );
    assert.equal(result.team_membership.length, 2);
  });
});
