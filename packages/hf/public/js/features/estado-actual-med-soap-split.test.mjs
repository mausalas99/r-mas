import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partitionAnalgesiaForSoap, partitionNmMedsForSoap } from './estado-actual-med-soap-split.mjs';

test('partitionAnalgesiaForSoap separa antieméticos y antipiréticos', () => {
  var split = partitionAnalgesiaForSoap(
    'BUPRENORFINA 4 MCG/HORA IV | ONDANSETRON 8MG IV C/8H | PARACETAMOL 1G IV C/8H | METAMIZOL 1G IV PRN'
  );
  assert.match(split.analgesia, /BUPRENORFINA/i);
  assert.doesNotMatch(split.analgesia, /PARACETAMOL/i);
  assert.doesNotMatch(split.analgesia, /METAMIZOL/i);
  assert.doesNotMatch(split.analgesia, /ONDANSETRON/i);
  assert.match(split.antipireticos, /PARACETAMOL/i);
  assert.match(split.antipireticos, /METAMIZOL/i);
  assert.match(split.antiemeticos, /ONDANSETRON/i);
});

test('partitionNmMedsForSoap separa insulina, rescates y otros NM', () => {
  var split = partitionNmMedsForSoap(
    'RESCATES DE INSULINA | OMEPRAZOL 40MG IV C/24H | METFORMINA 850MG VO C/24H'
  );
  assert.equal(split.rescatesDisponibles, true);
  assert.equal(split.insulin, '');
  assert.match(split.antidiabeticos, /METFORMINA/i);
  assert.match(split.antidiabeticos, /RESCATES DE INSULINA/i);
  assert.match(split.other, /OMEPRAZOL/i);
  assert.doesNotMatch(split.other, /METFORMINA/i);
  assert.doesNotMatch(split.other, /RESCATES DE INSULINA/i);
});
