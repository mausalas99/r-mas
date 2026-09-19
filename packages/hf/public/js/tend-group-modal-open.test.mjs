import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crossSectionEligibleSpecs,
  resolveExtraSpecs,
  filterHistoryByDateRange,
} from './tend-group-modal-open.mjs';

var CATALOG = {
  BH: [{ sectionKey: 'BH', fieldKey: 'Fib', cardTitle: 'Fibrinógeno · BH' }],
  QS: [{ sectionKey: 'QS', fieldKey: 'Fib', cardTitle: 'Fibrinógeno · QS' }],
};

var deps = {
  getCatalogSpecs: function (sectionKey) {
    return CATALOG[sectionKey] || [];
  },
};

var historyDesc = [
  { fecha: '10/08/2026', hora: '08:00', parsedBySection: { BH: { Fib: 200 }, QS: { Fib: 3 } } },
  { fecha: '08/08/2026', hora: '08:00', parsedBySection: { BH: { Fib: 190 }, QS: { Fib: 2.8 } } },
];

test('crossSectionEligibleSpecs finds eligible analytes from other sections, tagged with sectionKey', () => {
  var state = { sectionKey: 'BH', historyDescFull: historyDesc, tableExtraSpecs: [] };
  var specs = crossSectionEligibleSpecs(deps, state);
  assert.equal(specs.length, 1);
  assert.equal(specs[0].sectionKey, 'QS');
  assert.equal(specs[0].fieldKey, 'Fib');
});

test('crossSectionEligibleSpecs excludes analytes already added', () => {
  var state = {
    sectionKey: 'BH',
    historyDescFull: historyDesc,
    tableExtraSpecs: [{ sectionKey: 'QS', fieldKey: 'Fib' }],
  };
  assert.equal(crossSectionEligibleSpecs(deps, state).length, 0);
});

test('resolveExtraSpecs re-resolves saved {sectionKey, fieldKey} pairs to live catalog specs', () => {
  var resolved = resolveExtraSpecs(deps, historyDesc, [{ sectionKey: 'QS', fieldKey: 'Fib' }]);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].cardTitle, 'Fibrinógeno · QS');
});

test('filterHistoryByDateRange keeps only sets inside the range', () => {
  var filtered = filterHistoryByDateRange(historyDesc, '2026-08-09', '2026-08-31');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].fecha, '10/08/2026');
});
