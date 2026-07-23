import test from 'node:test';
import assert from 'node:assert/strict';
import {
  labSectionOrderKey,
  sortResLabsByClinicalOrder,
} from './labs-section-order.mjs';
import { dedupeConsolidatedLabRows } from './lab-bulk-paste.mjs';

test('labSectionOrderKey strips colon and tab', () => {
  assert.equal(labSectionOrderKey('EGO:\nAMAR TURBIA'), 'EGO');
  assert.equal(labSectionOrderKey('BH\tHb 8.71*'), 'BH');
  assert.equal(labSectionOrderKey('PFHs\tAlb 2.6'), 'PFHS');
});

test('sortResLabsByClinicalOrder: BH QS ESC PFHs GASES → otros → EGO last', () => {
  var rows = [
    'BH\tHb 8.71*',
    'EGO:\nAMAR TURBIA pH 5.5\nProt 100*',
    'QS\tGlu 45*',
    'ESC\tNa 125.9*',
    'PFHs\tAlb 2.6*',
    'COAG\tTP 11.9 TTP 26.7* INR 1.02*',
    'GASES\tpH 7.37 pCO2 41',
    'TROP\tTnI 8.2',
  ];
  var out = sortResLabsByClinicalOrder(rows);
  assert.deepEqual(
    out.map(function (r) {
      return labSectionOrderKey(r);
    }),
    ['BH', 'QS', 'ESC', 'PFHS', 'GASES', 'COAG', 'TROP', 'EGO']
  );
});

test('dedupeConsolidatedLabRows: EGO last; COAG in otros after GASES', () => {
  var rows = [
    'EGO:\nAMAR TURBIA pH 5.5\nProt 100*',
    'BH\tHb 8.71* Hto 26.7*',
    'QS\tGlu 45* Cr 2.4*',
    'ESC\tNa 125.9*',
    'PFHs\tAlb 2.6*',
    'COAG\tTP 11.9 TTP 26.7* INR 1.02*',
    'GASES\tpH 7.37 Lactato 1.9',
  ];
  var out = dedupeConsolidatedLabRows(rows, 'labs');
  assert.deepEqual(
    out.map(function (r) {
      return labSectionOrderKey(r);
    }),
    ['BH', 'QS', 'ESC', 'PFHS', 'GASES', 'COAG', 'EGO']
  );
  assert.match(out[out.length - 1], /^EGO:/);
});
