import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKeyFromLabsDateHeader,
  parseLabsTextDateHeader,
  groupLabsTextByDay,
  removeLabsTextBlock,
} from './eventualidades-labs-timeline.mjs';

test('dayKeyFromLabsDateHeader pads and expands year', () => {
  assert.equal(dayKeyFromLabsDateHeader('3/8/2026'), '2026-08-03');
  assert.equal(dayKeyFromLabsDateHeader('03/08/26'), '2026-08-03');
  const now = new Date('2026-08-03T12:00:00');
  assert.equal(dayKeyFromLabsDateHeader('03/08', now), '2026-08-03');
});

test('parseLabsTextDateHeader accepts Estudios and LABS prefixes', () => {
  const a = parseLabsTextDateHeader('03/08', new Date('2026-08-03T12:00:00'));
  assert.equal(a.dayKey, '2026-08-03');
  assert.equal(a.time, '');
  const b = parseLabsTextDateHeader('03/08 06:45', new Date('2026-08-03T12:00:00'));
  assert.equal(b.dayKey, '2026-08-03');
  assert.equal(b.time, '06:45');
  const c = parseLabsTextDateHeader('LABS 03/08/2026');
  assert.equal(c.dayKey, '2026-08-03');
  assert.equal(parseLabsTextDateHeader('BH HB 8.4'), null);
});

test('groupLabsTextByDay splits Estudios blocks by day', () => {
  const text =
    '03/08\nBH HB 8.43*\nQS CR 4.4*\n\n02/08\nBH HB 9.1\n';
  const groups = groupLabsTextByDay(text, new Date('2026-08-03T12:00:00'));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].day, '2026-08-03');
  assert.equal(groups[0].label, 'Hoy');
  assert.match(groups[0].entries[0].text, /BH HB 8\.43/);
  assert.equal(groups[1].day, '2026-08-02');
  assert.match(groups[1].entries[0].text, /BH HB 9\.1/);
});

test('groupLabsTextByDay splits LABS prose headers by day', () => {
  const text =
    'LABS 03/08/2026 06:45\nEN LA BIOMETRÍA SE APRECIA ANEMIA NORMOCÍTICA CON HB 8.5.\n\n' +
    'LABS 02/08/2026 10:00\nEN LA GASOMETRÍA SE APRECIA PH EN RANGO.';
  const groups = groupLabsTextByDay(text, new Date('2026-08-03T12:00:00'));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].day, '2026-08-03');
  assert.match(groups[0].entries[0].text, /ANEMIA NORMOCÍTICA/);
  assert.equal(groups[0].entries[0].time, '06:45');
  assert.equal(groups[1].day, '2026-08-02');
});

test('removeLabsTextBlock drops one block and keeps the other', () => {
  const text =
    'LABS 03/08/2026 06:45\nEN LA BIOMETRÍA SE APRECIA ANEMIA.\n\n' +
    'LABS 02/08/2026 10:00\nEN LA GASOMETRÍA SE APRECIA PH EN RANGO.';
  const now = new Date('2026-08-03T12:00:00');
  const groups = groupLabsTextByDay(text, now);
  const id = groups[0].entries[0].id;
  const out = removeLabsTextBlock(text, id, now);
  assert.equal(out.changed, true);
  assert.match(out.labsText, /GASOMETRÍA/);
  assert.equal(/ANEMIA/.test(out.labsText), false);
});
