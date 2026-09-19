import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildCultivoOutputHtmlFragments } = await import('./expediente-cultivos-parse.mjs');

test('buildCultivoOutputHtmlFragments inserts the missing space when the study keyword is glued ("UROCULTIVOPOR SONDA")', () => {
  // Reproduce el reporte pegado desde el screenshot: la línea cabecera venía
  // "UROCULTIVOPOR SONDA 16/08: ..." (sin espacio) y el bloque .section-lbl
  // se pegaba visualmente al resto del texto.
  var text = 'UROCULTIVOPOR SONDA 16/08: KLEBSIELLA PNEUMONIAE · ESBL · Carb-R\nCuenta: +100,000 UFC/ML';
  var html = buildCultivoOutputHtmlFragments(text, '');
  assert.match(html, /<span class="section-lbl">UROCULTIVO<\/span> POR SONDA 16\/08:/);
  assert.doesNotMatch(html, /UROCULTIVOPOR/);
});

test('buildCultivoOutputHtmlFragments leaves an already-spaced header line untouched', () => {
  var text = 'UROCULTIVO POR SONDA 16/08: KLEBSIELLA PNEUMONIAE\nCuenta: +100,000 UFC/ML';
  var html = buildCultivoOutputHtmlFragments(text, '');
  assert.match(html, /<span class="section-lbl">UROCULTIVO<\/span> POR SONDA 16\/08:/);
});
