import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestPeriopMed } from './vpo-periop-meds.mjs';

test('metformina → suspender día cirugía', () => {
  var s = suggestPeriopMed('METFORMINA 850 MG VO CADA 12 H');
  assert.match(s.sugerencia, /SUSPENDER/i);
});

test('metoprolol → continuar', () => {
  var s = suggestPeriopMed('METOPROLOL 50 MG VO CADA 12 H');
  assert.match(s.sugerencia, /CONTINUAR/i);
});
