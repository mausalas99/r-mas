import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  areElectrolyteReplacementSuggestionsHidden,
  areLabClinicalSuggestionsHidden,
  isAbgAnalysisHidden,
  isClinicalDecisionGuidanceHidden,
  isClinicoUnlockDisabled,
  isHistoriaClinicaSafetyHidden,
  isManejoTabGloballyHidden,
  isVpoDxInferenceHidden,
  isVpoPeriopMedGuidanceHidden,
  isVpoRiskCalculationDisabled,
  isVpoScalesGuidanceHidden,
} from './clinical-product-policy.mjs';
import { scanHistoriaClinicaSafety } from './clinical-history-safety.mjs';

test('clinical product policy hides all decision-guidance surfaces', () => {
  assert.equal(isClinicalDecisionGuidanceHidden(), true);
  assert.equal(isManejoTabGloballyHidden(), true);
  assert.equal(areElectrolyteReplacementSuggestionsHidden(), true);
  assert.equal(areLabClinicalSuggestionsHidden(), true);
  assert.equal(isHistoriaClinicaSafetyHidden(), true);
  assert.equal(isVpoRiskCalculationDisabled(), true);
  assert.equal(isVpoPeriopMedGuidanceHidden(), true);
  assert.equal(isVpoScalesGuidanceHidden(), false);
  assert.equal(isVpoDxInferenceHidden(), true);
  assert.equal(isClinicoUnlockDisabled(), true);
  assert.equal(isAbgAnalysisHidden(), true);
});

test('scanHistoriaClinicaSafety returns no rules while guidance is hidden', () => {
  var out = scanHistoriaClinicaSafety({
    appText: 'penicilina con alergia documentada',
    peeaText: '',
    patient: {},
  });
  assert.equal(out.rules.length, 0);
});
