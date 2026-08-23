import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQS_ } from './labs.js';

test('parseQS_ agrega BUN/CR (relación BUN/Cr) cuando hay BUN y Cr', () => {
  var t = 'GLUCOSA EN SANGRE 95 mg/dL 70-110 CREATININA 1.0 mg/dL 0.7-1.2 NITROGENO DE LA UREA EN SANGRE 15 mg/dL 7-20';
  var qs = parseQS_(t, null);
  assert.match(qs, /^QS\t/);
  assert.match(qs, /\bBUN\s+15\b/);
  assert.match(qs, /BUN\/CR\s+15\.0/);
});

test('parseQS_ no agrega BUN/CR sin Cr o sin BUN', () => {
  var t = 'GLUCOSA EN SANGRE 95 mg/dL 70-110 CREATININA 1.0 mg/dL 0.7-1.2';
  var qs = parseQS_(t, null);
  assert.doesNotMatch(qs, /BUN\/CR/);
});
