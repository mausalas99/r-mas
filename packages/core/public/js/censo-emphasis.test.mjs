import test from 'node:test';
import assert from 'node:assert/strict';
import { censoEmphasisSegments as seg } from './censo-emphasis.mjs';

const bolds = (col, line) => seg(col, line).filter((s) => s.bold).map((s) => s.text.trim());
const joined = (col, line) => seg(col, line).map((s) => s.text).join('');

test('labs: only starred values (with name) are bold', () => {
  const line = 'BH Hb 10.3* Hto 31.1* Leu 9.86 Plt 62.8*';
  assert.deepEqual(bolds('labs', line), ['Hb 10.3', 'Hto 31.1', 'Plt 62.8']);
  assert.equal(joined('labs', line), 'BH Hb 10.3 Hto 31.1 Leu 9.86 Plt 62.8');
});

test('signos: only abnormal vitals are bold', () => {
  assert.deepEqual(bolds('signos', 'T° 38.6 · FC 90 · FR 24'), ['T° 38.6', 'FR 24']);
  assert.deepEqual(bolds('signos', 'T° 36.6 · FC 82 · FR 16'), []);
  assert.deepEqual(bolds('signos', 'TA: 134/80 MMHG'), []);
  assert.deepEqual(bolds('signos', 'TA: 85/50 MMHG'), ['TA: 85/50 MMHG']); // PAM 61.7
  assert.deepEqual(bolds('signos', 'TA: 90/60 MMHG'), []); // PAM 70
  assert.deepEqual(bolds('signos', 'TA: 120/— MMHG'), []);
  assert.deepEqual(bolds('signos', 'DXT: 99, 252, 60 MG/DL'), ['252', '60']);
  assert.deepEqual(bolds('signos', 'SAT: 88% AL AIRE AMBIENTE'), ['SAT: 88%']);
  assert.deepEqual(bolds('signos', 'SAT: 99% AL AIRE AMBIENTE'), []);
});
