import test from 'node:test';
import assert from 'node:assert/strict';
import { findHits } from './check-no-phi.mjs';

// Synthetic values, split so the repo's own PHI pre-filters do not trip on this file.
const EXP = 'Expediente' + ': ' + '7300001';
const NAC = 'fecha de ' + 'nacimiento: ' + '01/02/1950';
const CURP = 'GAPL' + '800101' + 'HNLRRS09';

const diff = (...added) =>
  ['diff --git a/x.mjs b/x.mjs', '+++ b/x.mjs', '@@ -1,0 +1,' + added.length + ' @@', ...added.map((l) => '+' + l)].join('\n');

test('flags hospital identifiers on added lines', () => {
  for (const line of ['HOSPITAL UNIVERSITARIO "DR. X"', 'Facultad de Medicina UANL', 'AV. GONZALITOS 235', 'Receta médica HU', 'servicio: HU']) {
    assert.equal(findHits(diff(line)).length > 0, true, line);
  }
});

test('allows Torre HU, removed lines, and marked synthetic lines', () => {
  assert.deepEqual(findHits(diff("servicio: 'Torre HU'")), []);
  assert.deepEqual(findHits(['+++ b/x.mjs', '@@ -1 +0,0 @@', '-Facultad de Medicina UANL'].join('\n')), []);
  assert.deepEqual(findHits(diff(EXP + ' // phi-scan: synthetic')), []);
});

test('flags likely patient data and reports file:line', () => {
  const hits = findHits(diff('ok', EXP, NAC, CURP));
  assert.equal(hits.length, 3);
  assert.match(hits[0], /^x\.mjs:2 /);
});

test('template golden text keeps the hospital letterhead, but not patient data', () => {
  const at = (file, ...added) =>
    ['+++ b/' + file, '@@ -1,0 +1,' + added.length + ' @@', ...added.map((l) => '+' + l)].join('\n');
  const tpl = 'packages/core/scripts/golden/corpus/docs/nota.note.golden.txt';
  assert.deepEqual(findHits(at(tpl, 'HOSPITAL UNIVERSITARIO', 'Av. Gonzalitos s/n')), []);
  assert.equal(findHits(at(tpl, EXP)).length, 1);
  assert.equal(findHits(at('packages/core/scripts/golden/corpus/labs/x.golden.json', 'HOSPITAL UNIVERSITARIO')).length, 1);
});
