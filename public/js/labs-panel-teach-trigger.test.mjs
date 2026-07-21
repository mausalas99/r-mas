import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldOpenLabPanelTeach } from './labs-panel-teach-trigger.mjs';
import { clearLabPanelOverlayForTests } from './labs-panel-overlay-store.mjs';

test('empty resLabs + residual candidates → open true', () => {
  clearLabPanelOverlayForTests();
  var texto =
    'Nombre: X\nExpediente: 1\nQUIMICA CLINICA\n' +
    'MARCADOR RARO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    'MARCADOR RARO\t\n*\n12\nng/mL\t0 - 5\n';
  var teach = shouldOpenLabPanelTeach(texto, { resLabs: [] });
  assert.equal(teach.empty, true);
  assert.ok(teach.residual.candidates.length > 0);
  assert.equal(teach.open, true);
});

test('resLabs present + no residual (glucosa covered) → open false', () => {
  clearLabPanelOverlayForTests();
  var texto =
    'QUIMICA CLINICA\n' +
    'Estudio\tResultado\tUnidades\tValor de Referencia\n' +
    'GLUCOSA EN SANGRE\n*\n95\nmg/dL\t70 - 100\n';
  var teach = shouldOpenLabPanelTeach(texto, { resLabs: ['QS\tGlu 95'] });
  assert.equal(teach.empty, false);
  assert.equal(teach.residual.candidates.length, 0);
  assert.equal(teach.open, false);
});
