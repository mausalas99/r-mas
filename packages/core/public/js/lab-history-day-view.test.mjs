import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterDayLabSets } from './lab-history-day-view.mjs';

const rows = ['BH: Hb 8.45 ↓', 'QS: Glu 97'];
const set = (hora) => ({ fecha: '13/11/2026', hora, resLabs: rows, sourceText: 'x' });

test('hour-less copy of a timed report does not show as a second group', () => {
  const groups = clusterDayLabSets([set('06:40'), set('')]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].hora, '06:40');
});

test('identical timed sets still merge into one group', () => {
  const groups = clusterDayLabSets([set('06:40'), set('06:40')]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].sets.length, 1);
});
