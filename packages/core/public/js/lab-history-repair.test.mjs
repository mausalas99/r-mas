import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairLabHistoryMapInPlace } from './lab-history-repair.mjs';

const row = 'ESC Na 133.3* Cl 109.4 K';
const mk = (fecha, id) => ({ id, fecha, hora: '', resLabs: ['BH: Hb 8.45 ↓'], sourceText: 'x' });

test('a set whose fecha holds a lab row gets a real day on load', () => {
  const map = { p1: [mk(row, '1763574000000'), mk('13/11/2026', 'b')] };
  assert.equal(repairLabHistoryMapInPlace(map), true);
  assert.match(map.p1[0].fecha, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(map.p1[1].fecha, '13/11/2026');
});

test('no id to infer from → «Anterior», never the lab row', () => {
  const map = { p1: [mk(row, 'x')] };
  repairLabHistoryMapInPlace(map);
  assert.equal(map.p1[0].fecha, 'Anterior');
});
