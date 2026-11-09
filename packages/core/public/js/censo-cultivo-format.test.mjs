import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCultivosForCenso } from './censo-cultivo-format.mjs';

const set = (id, ms, res) => ({ id, fecha: ms, resLabs: [res] });

test('latest result per site, positive only, agent only', () => {
  const out = formatCultivosForCenso([
    set('a', '2026-11-01', 'UROCULTIVO 01/11/2026: Escherichia coli\nCuenta: >100,000 UFC\nATB R: ampicilina'),
  ]);
  assert.match(out, /coli/i);
  assert.ok(!/Cuenta|ATB|ampicilina/i.test(out), out);
});

test('empty history gives empty text', () => {
  assert.equal(formatCultivosForCenso([]), '');
});

test('long generic site names shrink to the useful part', () => {
  const out = formatCultivosForCenso([
    set('a', '2026-10-27', 'TEJIDO CUTANEO (TEJIDO DE HER TOBILLO IZQUIERDO) 27/10/2026: S. dysgalactiae'),
    set('b', '2026-10-25', 'PRODUCTOS DIVERSOS (TEJIDO PIE IZQUIERDO) 25/10/2026: S. dysgalactiae'),
  ]);
  assert.ok(!/TEJIDO|PRODUCTOS/i.test(out), out);
  assert.match(out, /IZQ/);
});
