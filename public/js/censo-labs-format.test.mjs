import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLabsForCenso, formatLabsForCensoCompact } from './censo-labs-format.mjs';

test('formatLabsForCenso estructura por fecha', () => {
  var lines = formatLabsForCenso(
    [
      {
        fecha: '29/05/2026',
        parsedBySection: {
          BH: { Hb: '5.8*', Hto: '18*', Leu: '4200' },
          QS: { Glu: '145', Cr: '1.2' },
        },
        resLabs: [],
      },
    ],
    1
  );
  assert.ok(lines.some((l) => l.includes('29/05')));
  assert.ok(lines.some((l) => l.includes('BH:')));
  assert.ok(lines.some((l) => l.includes('Hb 5.8')));
});

test('formatLabsForCensoCompact solo última fecha', () => {
  var lines = formatLabsForCensoCompact([
    { fecha: '28/05/2026', parsedBySection: { BH: { Hb: '6' } }, resLabs: [] },
    { fecha: '29/05/2026', parsedBySection: { BH: { Hb: '5.8*' } }, resLabs: [] },
  ]);
  assert.ok(lines.length >= 2);
  assert.equal(lines[0], '29/05/2026');
  assert.match(lines[1], /5\.8/);
  assert.doesNotMatch(lines.join('\n'), /28\/05/);
});
