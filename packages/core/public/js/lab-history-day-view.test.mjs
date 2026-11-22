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

test('hour-less partial copy (only some rows of a timed report) is dropped', () => {
  const partial = { fecha: '13/11/2026', hora: '', resLabs: ['BH: Hb 8.45 ↓'], sourceText: 'x' };
  const groups = clusterDayLabSets([set('06:40'), partial]);
  assert.equal(groups.length, 1);
});

test('hour-less set with rows no timed report has is kept', () => {
  const extra = { fecha: '13/11/2026', hora: '', resLabs: ['GASES: pH 7.36'], sourceText: 'x' };
  assert.equal(clusterDayLabSets([set('06:40'), extra]).flatMap((g) => g.sets).length, 2);
});

test('same row in two tomas of a day stays only in the earliest one', () => {
  const a = { fecha: '18/11/2026', hora: '04:00', resLabs: ['BH: Hb 8.19', 'QS: Glu 91'], sourceText: 'x' };
  const b = { fecha: '18/11/2026', hora: '06:38', resLabs: ['BH: Hb 8.19', 'QS: Glu 103'], sourceText: 'y' };
  const groups = clusterDayLabSets([a, b]);
  const rowsAt = (h) => (groups.find((g) => g.hora === h) || { resLabs: [] }).resLabs;
  assert.ok(rowsAt('04:00').includes('BH: Hb 8.19'));
  assert.ok(!rowsAt('06:38').includes('BH: Hb 8.19'));
  assert.ok(rowsAt('06:38').includes('QS: Glu 103'));
});

test('same first line with different trailing lines counts as the same row', () => {
  const a = { fecha: '18/11/2026', hora: '04:00', resLabs: ['BH: Hb 8.19 ↑  Plt 374\n  VPM 10'], sourceText: 'x' };
  const b = { fecha: '18/11/2026', hora: '06:38', resLabs: ['BH: Hb 8.19↑ Plt 374', 'QS: Glu 103'], sourceText: 'y' };
  const groups = clusterDayLabSets([a, b]);
  assert.equal(groups.find((g) => g.hora === '06:38').resLabs.some((r) => r.startsWith('BH')), false);
});

test('newest draw wins an analyte inside one merged group, even against a flagged older value', () => {
  const am = { fecha: '18/11/2026', hora: '16:40', resLabs: ['ESC\tNa 136 K 6.4 F 7.5*'], sourceText: 'x' };
  const pm = { fecha: '18/11/2026', hora: '17:28', resLabs: ['ESC\tNa 134.3* K 4.3 F 3.7'], sourceText: 'y' };
  const esc = clusterDayLabSets([pm, am]).flatMap((g) => g.resLabs).find((r) => r.startsWith('ESC'));
  assert.ok(esc.includes('K 4.3') && esc.includes('F 3.7') && esc.includes('Na 134.3*'), esc);
});

test('a full morning report with gases and a later ESC-only report stay two tomas', () => {
  const am = { id: '1', fecha: '18/11/2026', hora: '03:59', resLabs: ['BH\tHb 9.17', 'QS\tGlu 92', 'ESC\tNa 134.3 K 6.4', 'GASES\tpH 7.3 pCO2 41'], sourceText: 'x' };
  const pm = { id: '2', fecha: '18/11/2026', hora: '17:28', resLabs: ['ESC\tNa 134.3 K 4.3'], sourceText: 'y' };
  const groups = clusterDayLabSets([pm, am]);
  assert.equal(groups.length, 2);
  assert.ok(groups.find((g) => g.hora === '17:28').resLabs[0].includes('K 4.3'));
});

test('a later BH inside the window joins the group: new values win, same values are not repeated', () => {
  const am = { id: 'a', fecha: '21/11/2026', hora: '03:34', resLabs: ['BH\tHb 8.1 Hto 25 Leu 10.2', 'QS\tGlu 97 Cr 1.1'], sourceText: 'a' };
  const bh = { id: 'b', fecha: '21/11/2026', hora: '03:50', resLabs: ['BH\tHb 7.6 Hto 25 Leu 10.2'], sourceText: 'b' };
  const groups = clusterDayLabSets([am, bh]);
  assert.equal(groups.length, 1);
  const rows = groups[0].resLabs;
  assert.equal(rows.length, 2);
  assert.match(rows[0], /Hb 7\.6/);
  assert.equal((rows[0].match(/Hto/g) || []).length, 1);
});

test('a chain of tomas 90 min apart is cut at 3 h, and hour-less sets sit apart', () => {
  const at = (hora, row) => ({ id: hora, fecha: '21/11/2026', hora, resLabs: [row], sourceText: hora });
  const chain = ['04:00', '05:30', '07:00', '08:30', '10:00'].map((h, i) => at(h, `QS: Glu ${90 + i}`));
  assert.ok(clusterDayLabSets(chain).length >= 2);
  const groups = clusterDayLabSets([at('04:00', 'QS: Glu 90'), at('', 'ESC: Na 140')]);
  assert.equal(groups.length, 2);
});

test('a merged group remembers the older value of each changed field only', () => {
  const am = { id: 'a', fecha: '21/11/2026', hora: '03:34', resLabs: ['BH\tHb 8.1* Hto 25 Leu 10.2', 'QS\tGlu 97 Cr 1.1'], sourceText: 'a' };
  const bh = { id: 'b', fecha: '21/11/2026', hora: '03:50', resLabs: ['BH\tHb 7.6* Hto 25 Leu 10.2'], sourceText: 'b' };
  const [g] = clusterDayLabSets([am, bh]);
  assert.deepEqual({ ...g.priorByKey }, { 'BH|Hb': '8.1' });
});
