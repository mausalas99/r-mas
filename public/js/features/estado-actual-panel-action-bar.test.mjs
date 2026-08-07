import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEaActionBarButtons } from './estado-actual-panel-action-bar.mjs';

test('buildEaActionBarButtons — sala solo registro manual', () => {
  const html = buildEaActionBarButtons({ appMode: 'sala' });
  assert.match(html, /Registro manual/);
  assert.doesNotMatch(html, /Enviar a nota/);
  assert.doesNotMatch(html, /Guardar/);
  assert.doesNotMatch(html, /Copiar indicaciones/);
});

test('buildEaActionBarButtons — interconsulta incluye enviar a nota', () => {
  const html = buildEaActionBarButtons({ appMode: 'interconsulta' });
  assert.match(html, /Registro manual/);
  assert.match(html, /Enviar a nota/);
  assert.match(html, /estadoActualEnviarANota/);
  assert.doesNotMatch(html, /Guardar/);
  assert.doesNotMatch(html, /Copiar indicaciones/);
});
