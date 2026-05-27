import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findAtbDrugByClinicalName,
  findProtocolByClinicalDrugName,
  resolveClinicalDrugLink,
} from './manejo-clinical-drug-link.mjs';
import { MANEJO_PROTOCOLS } from './manejo-protocols-catalog.mjs';

test('resolveClinicalDrugLink prioriza infusión sobre ATB', () => {
  var link = resolveClinicalDrugLink('Noradrenalina', MANEJO_PROTOCOLS);
  assert.equal(link.kind, 'protocol');
  assert.equal(link.id, 'nore-standard');
});

test('resolveClinicalDrugLink resuelve ATB por nombre', () => {
  var link = resolveClinicalDrugLink('Cefepime', MANEJO_PROTOCOLS);
  assert.equal(link.kind, 'atb');
  assert.equal(link.id, 'cefepime');
});

test('findAtbDrugByClinicalName reconoce alias pip/tazo', () => {
  var drug = findAtbDrugByClinicalName('pip/tazo');
  assert.equal(drug.id, 'piperacilina-tazobactam');
});

test('findProtocolByClinicalDrugName reconoce gluconato de calcio', () => {
  var proto = findProtocolByClinicalDrugName('Gluconato de calcio', MANEJO_PROTOCOLS);
  assert.ok(proto);
  assert.match(proto.title, /Gluconato de calcio/i);
});
