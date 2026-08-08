import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildCultivosNegStrip } = await import('./expediente-cultivos-table.mjs');

test('buildCultivosNegStrip returns empty for no rows', () => {
  assert.equal(buildCultivosNegStrip([]), '');
});

test('buildCultivosNegStrip renders chip list with count', () => {
  var html = buildCultivosNegStrip([
    {
      tipoLabel: 'Hemocultivo',
      fechaMuestra: '22/07/2026',
      sitio: 'HEMOCULTIVO (BRAZO IZQUIERDO)',
      negativo: true,
    },
    {
      tipoLabel: 'Otros cultivos',
      studyDate: '30/07/2026',
      sitio: 'LIQUIDO ARTICULAR (RODILLA IZQUIERDA)',
      negativo: true,
    },
  ]);
  assert.match(html, /cultivos-neg-chips/);
  assert.match(html, /cultivos-neg-count">2</);
  assert.match(html, /Hemocultivo/);
  assert.match(html, /22\/07\/2026/);
  assert.match(html, /RODILLA IZQUIERDA/);
  assert.doesNotMatch(html, /cultivos-neg-sep/);
});
