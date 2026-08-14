import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupLabHistoryByDay,
  findLabHistoryDayIndexForSet,
  stepLabHistoryDayIndex,
  latestSetIdInLabHistoryDay,
  labHistoryDayArrowDelta,
  canHandleLabHistoryDayArrow,
} from './lab-history-day-nav.mjs';

function idFn(set, idx) {
  return set.id != null ? String(set.id) : '__idx_' + idx;
}

// hist is newest-first (sortLabHistoryChronological order) — index 0 is the most recent.
describe('groupLabHistoryByDay', () => {
  it('groups sets by fecha, preserving newest-first order within a day', () => {
    var hist = [
      { id: '5', fecha: '13/08/2026', hora: '09:13' },
      { id: '4', fecha: '13/08/2026', hora: '04:23' },
      { id: '3', fecha: '12/08/2026', hora: '10:48' },
      { id: '2', fecha: '11/08/2026', hora: '13:04' },
      { id: '1', fecha: '11/08/2026', hora: '09:32' },
    ];
    var days = groupLabHistoryByDay(hist);
    assert.equal(days.length, 3);
    assert.deepEqual(days.map(function (d) { return d.dayKey; }), [
      '13/08/2026',
      '12/08/2026',
      '11/08/2026',
    ]);
    assert.equal(days[0].rows.length, 2);
    assert.equal(days[2].rows.length, 2);
    assert.equal(days[0].rows[0].set.id, '5');
    assert.equal(days[0].rows[1].set.id, '4');
  });

  it('falls back to "Anterior" for sets without a fecha', () => {
    var days = groupLabHistoryByDay([{ id: '1' }]);
    assert.equal(days.length, 1);
    assert.equal(days[0].dayKey, 'Anterior');
  });

  it('returns an empty array for empty/missing history', () => {
    assert.deepEqual(groupLabHistoryByDay([]), []);
    assert.deepEqual(groupLabHistoryByDay(undefined), []);
  });
});

describe('findLabHistoryDayIndexForSet', () => {
  it('finds the day bucket containing the given set id', () => {
    var hist = [
      { id: '3', fecha: '13/08/2026' },
      { id: '2', fecha: '12/08/2026' },
      { id: '1', fecha: '11/08/2026' },
    ];
    var days = groupLabHistoryByDay(hist);
    assert.equal(findLabHistoryDayIndexForSet(days, idFn, '2'), 1);
    assert.equal(findLabHistoryDayIndexForSet(days, idFn, '1'), 2);
  });

  it('falls back to the last bucket when the set id is not found', () => {
    var hist = [{ id: '2', fecha: '12/08/2026' }, { id: '1', fecha: '11/08/2026' }];
    var days = groupLabHistoryByDay(hist);
    assert.equal(findLabHistoryDayIndexForSet(days, idFn, 'missing'), 1);
  });

  it('returns -1 for an empty day list', () => {
    assert.equal(findLabHistoryDayIndexForSet([], idFn, 'x'), -1);
  });
});

describe('lab history day arrow keys', () => {
  it('maps left to older and right to newer', () => {
    assert.equal(labHistoryDayArrowDelta('ArrowLeft'), 1);
    assert.equal(labHistoryDayArrowDelta('ArrowRight'), -1);
    assert.equal(labHistoryDayArrowDelta('ArrowUp'), 0);
  });

  it('ignores typing fields, modifiers, and hidden lab tab', () => {
    assert.equal(
      canHandleLabHistoryDayArrow({
        key: 'ArrowLeft',
        labTabVisible: true,
        hasDayPicker: true,
      }),
      true,
    );
    assert.equal(
      canHandleLabHistoryDayArrow({
        key: 'ArrowLeft',
        labTabVisible: true,
        hasDayPicker: true,
        typing: true,
      }),
      false,
    );
    assert.equal(
      canHandleLabHistoryDayArrow({
        key: 'ArrowLeft',
        labTabVisible: false,
        hasDayPicker: true,
      }),
      false,
    );
  });
});

describe('stepLabHistoryDayIndex', () => {
  const days = groupLabHistoryByDay([
    { id: '3', fecha: '13/08/2026' },
    { id: '2', fecha: '12/08/2026' },
    { id: '1', fecha: '11/08/2026' },
  ]);

  it('steps forward and backward within bounds', () => {
    assert.equal(stepLabHistoryDayIndex(days, 1, 1), 2);
    assert.equal(stepLabHistoryDayIndex(days, 1, -1), 0);
  });

  it('clamps at the first and last day instead of wrapping', () => {
    assert.equal(stepLabHistoryDayIndex(days, 0, -1), 0);
    assert.equal(stepLabHistoryDayIndex(days, 2, 1), 2);
  });

  it('returns -1 for an empty day list', () => {
    assert.equal(stepLabHistoryDayIndex([], 0, 1), -1);
  });
});

describe('latestSetIdInLabHistoryDay', () => {
  it('returns the id of the most recent set in the day (first row — newest-first)', () => {
    var hist = [
      { id: '5', fecha: '13/08/2026', hora: '09:13' },
      { id: '4', fecha: '13/08/2026', hora: '04:23' },
    ];
    var days = groupLabHistoryByDay(hist);
    assert.equal(latestSetIdInLabHistoryDay(days[0], idFn), '5');
  });

  it('returns an empty string for an empty/missing day', () => {
    assert.equal(latestSetIdInLabHistoryDay(null, idFn), '');
    assert.equal(latestSetIdInLabHistoryDay({ rows: [] }, idFn), '');
  });
});
