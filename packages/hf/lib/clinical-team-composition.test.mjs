import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateTeamRankSlot } from './clinical-team-composition.mjs';

describe('clinical-team-composition', () => {
  it('validateTeamRankSlot never blocks (unlimited members per rank)', () => {
    assert.equal(validateTeamRankSlot('Eme', 'Team', []), null);
    assert.equal(validateTeamRankSlot('UX', 'Team', [{ rank: 'Team' }, { rank: 'Team' }]), null);
    assert.equal(
      validateTeamRankSlot('Interconsultas', 'Team', [{ rank: 'Team' }, { rank: 'Team' }]),
      null
    );
  });
});
