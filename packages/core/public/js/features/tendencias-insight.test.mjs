import test from 'node:test';
import assert from 'node:assert/strict';
import { tendStatusInfo, tendRangeText, buildTendChangeHtml, tendReadingsRows, tendReadingsText, tendHeroChange } from './tendencias-insight.mjs';

test('status is a word plus arrow, from the reference range', () => {
  assert.deepEqual(tendStatusInfo(11, [12, 18]), { kind: 'low', text: '▼ Bajo' });
  assert.deepEqual(tendStatusInfo(19, [12, 18]), { kind: 'high', text: '▲ Alto' });
  assert.deepEqual(tendStatusInfo(12, [12, 18]), { kind: 'ok', text: 'En rango' });
  assert.equal(tendStatusInfo(5, null).kind, 'none');
  assert.equal(tendStatusInfo(null, [1, 2]).kind, 'none');
});

test('range text and empty change cell', () => {
  assert.equal(tendRangeText([4, 11]), '4 – 11');
  assert.equal(tendRangeText(null), '—');
  const esc = (s) => String(s);
  assert.match(buildTendChangeHtml(esc, 5, 5, false, [1, 9]), /tend-none/);
  assert.match(buildTendChangeHtml(esc, 5, 4, false, [1, 9]), /tend-insight-delta/);
});

test('readings rows: newest first, delta vs previous reading', () => {
  const rows = tendReadingsRows(['26 sep', '27 sep', '28 sep'], [10, 11, 11.85], [12.2, 18.1]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { label: '28 sep', value: 11.85, change: '+0.85', tone: 'good' });
  assert.equal(rows[2].change, '');
});

test('readings text and hero change', () => {
  const rows = tendReadingsRows(['a', 'b'], [5, 4], [1, 9]);
  assert.equal(tendReadingsText('Hb', 'g/dL', rows), 'Hb (g/dL)\nb\t4\t−1\na\t5');
  assert.equal(tendHeroChange(5, 5, [1, 9]), null);
  const h = tendHeroChange(11.85, 11.1, [12.2, 18.1]);
  assert.equal(h.text, '+7%');
  assert.equal(h.tone, 'good');
  assert.equal(h.note, 'se acerca al rango');
});
