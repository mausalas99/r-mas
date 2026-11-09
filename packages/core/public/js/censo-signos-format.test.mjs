import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCensoSignosColumn, formatCensoIoColumn } from './censo-signos-format.mjs';

test('T, FC, FR share one line', () => {
  const lines = formatCensoSignosColumn({ vitals: { temp: 38.6, fc: 90, fr: 24, tas: 134, tad: 80 } }, {});
  assert.equal(lines[0], 'T° 38.6 · FC 90 · FR 24');
  assert.equal(lines[1], 'TA: 134/80 MMHG');
});

test('unquantified egress and NC balance are dropped', () => {
  const lines = formatCensoIoColumn({ ing: 550, egr: 'NC' }, undefined);
  assert.deepEqual(lines, ['I: 550 CC']);
  assert.deepEqual(formatCensoIoColumn({ ing: 3300, egr: '600', evac: 6 }, 1600), ['I: 3,300 CC · B: +1,600 CC · EVAC: 6', 'E: 600 CC']);
});
