import test from 'node:test';
import assert from 'node:assert/strict';
import { groupLabHistoryByDay, findLabDaysWithStudy } from './lab-history-day-nav.mjs';

const hist = [
  { fecha: '28/09/2026', resLabs: ['BH: Hb 11.7, Leu 6.4.', 'QS: Glu 118.'] },
  { fecha: '26/09/2026', resLabs: ['INFL: PCR 12.4, PCT 2.4.'] },
  { fecha: '26/09/2026', resLabs: ['BH: Hb 11.9.'] },
  { fecha: '22/09/2026', resLabs: ['INFL: PCT 8.7.'] },
];

test('findLabDaysWithStudy: newest-first day indexes, word-start, case-insensitive', () => {
  const days = groupLabHistoryByDay(hist);
  assert.deepEqual(findLabDaysWithStudy(days, 'pct'), [1, 2]);
  assert.deepEqual(findLabDaysWithStudy(days, 'HB'), [0, 1]);
  assert.deepEqual(findLabDaysWithStudy(days, 'CT'), []);
  assert.deepEqual(findLabDaysWithStudy(days, ''), []);
  assert.deepEqual(findLabDaysWithStudy(days, '(pct'), []);
});
