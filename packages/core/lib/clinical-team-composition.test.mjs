import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTeamCompositionLimits,
  validateTeamRankSlot,
  OFF_CALL_INTERCONSULTAS_SERVICES,
  serviceUsesStructuredComposition,
} from './clinical-team-composition.mjs';

describe('clinical-team-composition', () => {
  it('has no per-service member caps (unlimited teams)', () => {
    assert.equal(getTeamCompositionLimits('Interconsultas'), null);
    assert.equal(getTeamCompositionLimits('UX'), null);
    assert.equal(getTeamCompositionLimits('Eme'), null);
    assert.equal(serviceUsesStructuredComposition('Interconsultas'), false);
  });

  it('validateTeamRankSlot never blocks (R2/R3 unlimited)', () => {
    assert.equal(validateTeamRankSlot('Eme', 'R2', []), null);
    assert.equal(validateTeamRankSlot('UX', 'R3', [{ rank: 'R3' }, { rank: 'R3' }]), null);
    assert.equal(
      validateTeamRankSlot('Interconsultas', 'R2', [{ rank: 'R2' }, { rank: 'R2' }]),
      null
    );
  });

  it('off-call services set', () => {
    assert.ok(OFF_CALL_INTERCONSULTAS_SERVICES.has('ux'));
    assert.ok(OFF_CALL_INTERCONSULTAS_SERVICES.has('eme'));
  });
});
