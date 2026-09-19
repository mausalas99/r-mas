import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rebuildPanelColumns } from './tend-group-charts-render.mjs';
import { writeGroupVisibleFields } from './tend-prefs.mjs';

if (!globalThis.localStorage) {
  var _lsMap = new Map();
  globalThis.localStorage = {
    getItem: function (key) {
      return _lsMap.has(key) ? _lsMap.get(key) : null;
    },
    setItem: function (key, value) {
      _lsMap.set(key, String(value));
    },
    removeItem: function (key) {
      _lsMap.delete(key);
    },
  };
}

function mockSet(fecha, hora, sectionKey, fieldKey, val) {
  var pb = {};
  pb[sectionKey] = {};
  pb[sectionKey][fieldKey] = { val: String(val), ab: false };
  return { fecha: fecha, hora: hora, parsedBySection: pb };
}

const sectionKey = 'COAG';
const s1 = mockSet('12/08/2026', '07:00', sectionKey, 'TP', 12);
const s2 = mockSet('16/08/2026', '07:00', sectionKey, 'DimeroD', 4570);
const s3 = mockSet('16/08/2026', '14:00', sectionKey, 'Fibrinogeno', 210);
const historyAsc = [s1, s2, s3];
const items = [{ spec: { fieldKey: 'TP' } }, { spec: { fieldKey: 'DimeroD' } }, { spec: { fieldKey: 'Fibrinogeno' } }];

test('rebuildPanelColumns includes every family field when nothing is hidden', () => {
  const ctx = { state: { patientId: 'p-cols-1', sectionKey: sectionKey, historyAsc: historyAsc }, sectionKey: sectionKey };
  writeGroupVisibleFields('p-cols-1', sectionKey, []);
  const cols = rebuildPanelColumns(ctx, items);
  assert.equal(cols.colSets.length, 3);
});

test('rebuildPanelColumns drops a study whose only value is on a hidden field', () => {
  const ctx = { state: { patientId: 'p-cols-2', sectionKey: sectionKey, historyAsc: historyAsc }, sectionKey: sectionKey };
  writeGroupVisibleFields('p-cols-2', sectionKey, ['DimeroD', 'Fibrinogeno']);
  const cols = rebuildPanelColumns(ctx, items);
  assert.equal(cols.colSets.length, 2);
  assert.deepEqual(cols.colSets, [s2, s3]);
});

test('rebuildPanelColumns falls back to every field when the visible set is empty', () => {
  const ctx = { state: { patientId: 'p-cols-3', sectionKey: sectionKey, historyAsc: historyAsc }, sectionKey: sectionKey };
  writeGroupVisibleFields('p-cols-3', sectionKey, ['NoSuchField']);
  const cols = rebuildPanelColumns(ctx, items);
  assert.equal(cols.colSets.length, 3);
});
