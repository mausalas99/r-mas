import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCadEhh, suggestCadEhhMode } from './manejo-cad-ehh.mjs';

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

test('suggestCadEhhMode indeterminate con glucosa alta sola', () => {
  assert.equal(
    suggestCadEhhMode({ glucoseMgDl: 300, ph: 7.35, hco3: 20, ketonesPositive: false }),
    'indeterminate'
  );
});
