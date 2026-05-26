import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAtbForIsolate } from './manejo-atb-suggest.mjs';
import { MANEJO_ATB_DRUGS } from './manejo-atb-catalog.mjs';

function drug(id) {
  return MANEJO_ATB_DRUGS.find(function (d) {
    return d.id === id;
  });
}

test('BLEE cautions ceftriaxona', () => {
  var r = classifyAtbForIsolate(drug('ceftriaxona'), {
    markers: ['BLEE'],
    sensKeys: [],
    organismo: 'Klebsiella pneumoniae',
  });
  assert.equal(r.status, 'caution');
});

test('MERO S → compatible', () => {
  var r = classifyAtbForIsolate(drug('meropenem'), {
    markers: [],
    sensKeys: ['MERO'],
    organismo: 'Pseudomonas aeruginosa',
  });
  assert.equal(r.status, 'compatible');
});

test('VRE cautions vancomicina', () => {
  var r = classifyAtbForIsolate(drug('vancomicina'), {
    markers: ['VRE'],
    sensKeys: ['VANCO'],
    organismo: 'Enterococcus faecium',
  });
  assert.equal(r.status, 'caution');
});
