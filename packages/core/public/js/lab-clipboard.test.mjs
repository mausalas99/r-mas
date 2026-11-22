import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripLabCalcLines } from './lab-clipboard.mjs';

test('copied lines drop calculated values and keep measured ones', () => {
  const out = stripLabCalcLines([
    'QS Glu 97 Cr 1.1 BUN 20 BUN/CR 18.1 eTFG 75 Ca 8.2 cCa 8.9*',
    'BH Hb 8.1 Hto 25 RetC 1.2 (arregenerativa) Plt 198',
    'GASES pH 7.3 Lactato 1.1 AG 12 cAG 14*',
  ]);
  assert.deepEqual(out, [
    'QS Glu 97 Cr 1.1 BUN 20 Ca 8.2',
    'BH Hb 8.1 Hto 25 Plt 198',
    'GASES pH 7.3 Lactato 1.1',
  ]);
});
