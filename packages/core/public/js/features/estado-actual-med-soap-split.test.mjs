import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partitionNmMedsForSoap } from './estado-actual-med-soap-split.mjs';

test('partitionNmMedsForSoap keeps glargine and preprandial, drops rescate and bomba', () => {
  const p = partitionNmMedsForSoap(
    'INSULINA GLARGINA 20 U SC C/24H | INSULINA PREPRANDIAL: 6 U PREVIO A COMIDAS | RESCATES DE INSULINA | BOMBA DE INSULINA | OMEPRAZOL 40 MG'
  );
  assert.equal(
    p.insulin,
    'INSULINA GLARGINA 20 U SC C/24H | INSULINA PREPRANDIAL: 6 U PREVIO A COMIDAS'
  );
  assert.equal(p.other, 'OMEPRAZOL 40 MG');
});
