import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshSoporteCalcHints } from './estado-actual-panel-clinico-html.mjs';

test('refreshSoporteCalcHints reemplaza la lista al editar PEEP/meseta', () => {
  var html = '';
  var insights = {
    querySelector: function () { return null; },
    insertAdjacentHTML: function (_pos, h) { html = h; },
  };
  var mount = { querySelector: function () { return insights; } };
  refreshSoporteCalcHints(mount, { soporte: 'Ventilación mecánica', vmPeep: 10, vmPmeseta: 32 }, {});
  assert.match(html, /data-ea-soporte-calc/);
  assert.match(html, /Driving pressure 22/);
  refreshSoporteCalcHints(mount, { soporte: 'Alto flujo', vmPeep: 10, vmPmeseta: 32 }, {});
  assert.equal(html, '');
});
