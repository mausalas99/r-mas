import test from 'node:test';
import assert from 'node:assert/strict';
import { findResidualSomeStudies } from './labs-panel-residual.mjs';
import { clearLabPanelOverlayForTests } from './labs-panel-overlay-store.mjs';

test('residual finds unknown marker when resLabs empty', () => {
  clearLabPanelOverlayForTests();
  var texto =
    'Nombre: X\nExpediente: 1\nQUIMICA CLINICA\n' +
    'MARCADOR RARO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    'MARCADOR RARO\t\n*\n12\nng/mL\t0 - 5\n';
  var r = findResidualSomeStudies(texto, { resLabs: [] });
  assert.ok(r.candidates.some((c) => /MARCADOR RARO/i.test(c.label)));
  assert.equal(r.candidates.find((c) => /MARCADOR RARO/i.test(c.label)).selected, true);
});

test('residual does not crash on glucosa-only text', () => {
  clearLabPanelOverlayForTests();
  // Fixture adapted: SOME table parser needs department + header row (see labs-some-table-parse).
  var texto =
    'QUIMICA CLINICA\n' +
    'Estudio\tResultado\tUnidades\tValor de Referencia\n' +
    'GLUCOSA EN SANGRE\n*\n95\nmg/dL\t70 - 100\n';
  var r = findResidualSomeStudies(texto, { resLabs: ['QS\tGlu 95'] });
  assert.ok(Array.isArray(r.candidates));
  // GLUCOSA should be covered by deny-list — not in candidates
  assert.ok(!r.candidates.some((c) => /GLUCOSA/i.test(c.label)));
});

test('residual excludes labels covered by effective TIR defs', () => {
  clearLabPanelOverlayForTests();
  // TSH is in builtin TIR — should not be residual
  var texto =
    'QUIMICA CLINICA\n' +
    'TSH\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    'TSH\t\n*\n2.5\nuUI/mL\t0.4 - 4.0\n';
  var r = findResidualSomeStudies(texto, { resLabs: [] });
  assert.ok(!r.candidates.some((c) => /^TSH$/i.test(String(c.label).trim())));
});

test('residual covers BH synonyms when compact BH tokens exist', () => {
  clearLabPanelOverlayForTests();
  var texto =
    'HEMATOLOGIA\n' +
    'Estudio\tResultado\tUnidades\tValor de Referencia\n' +
    'HCT\n*\n43.9\n%\t39.5 - 53.1\n' +
    'MCV\n*\n92\nfL\t80 - 100\n' +
    'MARCADOR RARO\n*\n12\nng/mL\t0 - 5\n';
  var r = findResidualSomeStudies(texto, {
    resLabs: ['BH\tHb 15.2 Hto 43.9 VCM 92 Leu 5.22 Plt 296'],
  });
  assert.ok(!r.candidates.some((c) => /^HCT$/i.test(String(c.label).trim())));
  assert.ok(!r.candidates.some((c) => /^MCV$/i.test(String(c.label).trim())));
  assert.ok(r.candidates.some((c) => /MARCADOR RARO/i.test(c.label)));
});

test('residual covers QS/ESC/PFHs synonyms when tokens exist', () => {
  clearLabPanelOverlayForTests();
  var texto =
    'QUIMICA CLINICA\n' +
    'Estudio\tResultado\tUnidades\tValor de Referencia\n' +
    'CALCIO EN SUERO\n*\n9.0\nmg/dL\t8.5 - 10.5\n' +
    'BILIRRUBINA INDIRECTA\n*\n0.5\nmg/dL\t0 - 0.8\n' +
    'COLESTEROL\n*\n160\nmg/dL\t0 - 200\n';
  var r = findResidualSomeStudies(texto, {
    resLabs: ['ESC\tCa 9.0', 'PFHs\tBI 0.5', 'QS\tCOL 160'],
  });
  assert.equal(r.candidates.length, 0);
});
