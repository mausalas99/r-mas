import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCadEhh,
  suggestCadEhhMode,
  getPotassiumRepletionGuidance,
  describeCadEhhSuggestion,
  checklistForCadEhhMode,
  fluidGuidanceForMode,
  CAD_CHECKLIST,
  EHH_CHECKLIST,
} from './manejo-cad-ehh.mjs';

test('modo cad: glucosa alta + acidosis', () => {
  var r = evaluateCadEhh({
    parsed: { GLUCOSA: 450, PH: 7.1, HCO3: 12 },
    parsedBySection: { EGO: { CETONAS: 'Positivo' } },
  });
  assert.equal(r.suggestedMode, 'cad');
});

test('modo ehh: glucosa muy alta sin acidosis', () => {
  var r = evaluateCadEhh({
    parsed: { GLUCOSA: 600, PH: 7.38, HCO3: 22 },
    parsedBySection: { EGO: { CETONAS: 'Negativo' } },
  });
  assert.equal(r.suggestedMode, 'ehh');
});

test('K 3.5 → 30 mEq/L y sin suspender insulina', () => {
  var g = getPotassiumRepletionGuidance(3.5);
  assert.equal(g.active.id, 'k-3.3-3.9');
  assert.equal(g.active.addMeqPerLiter, 30);
  assert.equal(g.active.holdInsulin, false);
});

test('K 2.8 → suspender insulina', () => {
  var g = getPotassiumRepletionGuidance(2.8);
  assert.equal(g.active.id, 'k-lt-3.3');
  assert.equal(g.active.holdInsulin, true);
});

test('K 4.5 → 20 mEq/L', () => {
  var g = getPotassiumRepletionGuidance(4.5);
  assert.equal(g.active.id, 'k-4.0-5.2');
  assert.equal(g.active.addMeqPerLiter, 20);
});

test('K 5.5 → no agregar K', () => {
  var g = getPotassiumRepletionGuidance(5.5);
  assert.equal(g.active.id, 'k-gt-5.2');
  assert.equal(g.active.addMeqPerLiter, 0);
});

test('describeCadEhhSuggestion devuelve texto por modo', () => {
  assert.match(
    describeCadEhhSuggestion({ glucoseMgDl: 450, ph: 7.1, ketonesPositive: true }),
    /CAD/
  );
  assert.match(
    describeCadEhhSuggestion({ glucoseMgDl: 600, ph: 7.38, ketonesPositive: false }),
    /EHH/
  );
});

test('checklistForCadEhhMode filtra por modo', () => {
  assert.equal(checklistForCadEhhMode('cad').length, CAD_CHECKLIST.length);
  assert.equal(checklistForCadEhhMode('ehh').length, EHH_CHECKLIST.length);
  assert.equal(
    checklistForCadEhhMode('indeterminate').length,
    CAD_CHECKLIST.length + EHH_CHECKLIST.length
  );
});

test('fluidGuidanceForMode usa protocolo según modo', () => {
  assert.match(fluidGuidanceForMode('cad', null), /NaCl 0\.9%/i);
  assert.match(fluidGuidanceForMode('ehh', 80), /80 kg/);
});

test('evaluateCadEhh incluye modeHint', () => {
  var r = evaluateCadEhh({
    parsed: { GLUCOSA: 450, PH: 7.1, HCO3: 12 },
    parsedBySection: { EGO: { CETONAS: 'Positivo' } },
  });
  assert.ok(r.modeHint);
  assert.match(r.modeHint, /CAD/);
});
