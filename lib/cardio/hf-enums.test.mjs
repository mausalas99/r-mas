import test from 'node:test';
import assert from 'node:assert/strict';
import * as enums from './hf-enums.mjs';

const listNames = Object.keys(enums).filter((name) => Array.isArray(enums[name]));

test('every export is a non-empty array of value/label pairs', () => {
  assert.ok(listNames.length > 0);
  for (const name of listNames) {
    const list = enums[name];
    assert.ok(Array.isArray(list), name + ' should be an array');
    assert.ok(list.length > 0, name + ' should not be empty');
    for (const opt of list) {
      assert.equal(typeof opt.value, 'string', name + ' entries need a string value');
      assert.equal(typeof opt.label, 'string', name + ' entries need a string label');
      assert.ok(opt.value.length > 0, name + ' value should not be empty');
      assert.ok(opt.label.length > 0, name + ' label should not be empty');
    }
  }
});

test('values are unique within each list', () => {
  for (const name of listNames) {
    const list = enums[name];
    const values = list.map((o) => o.value);
    const unique = new Set(values);
    assert.equal(unique.size, values.length, name + ' has duplicate values');
  }
});

test('numeric range lists cover 0..max inclusive', () => {
  assert.equal(enums.CHA2DS2VASC_RANGE.length, 10);
  assert.equal(enums.HASBLED_RANGE.length, 10);
  assert.equal(enums.STOPBANG_RANGE.length, 9);
  assert.equal(enums.CHA2DS2VASC_RANGE[0].value, '0');
  assert.equal(enums.CHA2DS2VASC_RANGE[9].value, '9');
});

test('STEVENSON matches the values used by estado-actual-cardio-html.mjs', () => {
  const values = enums.STEVENSON.map((o) => o.value);
  assert.deepEqual(values, ['Caliente-seco', 'Caliente-húmedo', 'Frío-seco', 'Frío-húmedo']);
});

test('VEXUS_GRADES matches VEXUS_OPTIONS (0-3)', () => {
  const values = enums.VEXUS_GRADES.map((o) => o.value);
  assert.deepEqual(values, ['0', '1', '2', '3']);
});

test('fenotipoFromFevi classifies by range, never returns HFimpEF', () => {
  assert.equal(enums.fenotipoFromFevi(20), 'HFrEF');
  assert.equal(enums.fenotipoFromFevi(40), 'HFrEF');
  assert.equal(enums.fenotipoFromFevi(45), 'HFmrEF');
  assert.equal(enums.fenotipoFromFevi(49), 'HFmrEF');
  assert.equal(enums.fenotipoFromFevi(50), 'HFpEF');
  assert.equal(enums.fenotipoFromFevi(65), 'HFpEF');
  assert.equal(enums.fenotipoFromFevi(''), null);
  assert.equal(enums.fenotipoFromFevi('n/a'), null);
});

test('FENOTIPOS labels are plain codes, no percentages or descriptive text', () => {
  assert.deepEqual(
    enums.FENOTIPOS.map((o) => o.value),
    ['HFrEF', 'HFmrEF', 'HFpEF', 'HFimpEF'],
  );
  for (const opt of enums.FENOTIPOS) {
    assert.equal(opt.label, opt.value);
  }
});
