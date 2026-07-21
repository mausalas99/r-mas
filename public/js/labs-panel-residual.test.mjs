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
