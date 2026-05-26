import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTourTarget,
  getSalaTourSteps,
  getInterconsultaTourSteps,
  stepRequiresUserAction,
} from './tour-targets.mjs';

test('getSalaTourSteps incluye pasos clave de v3.0', () => {
  const steps = getSalaTourSteps();
  assert.ok(steps.includes('map_sidebar'), 'orientación guiada por zonas');
  assert.ok(steps.includes('map_lab_teaser'));
  assert.ok(!steps.includes('map'), 'paso único map reemplazado por subtareas');
  assert.ok(steps.includes('servicio_default'), 'debe pedir servicio default al inicio');
  assert.ok(steps.includes('lab_bulk_separator'));
  assert.ok(steps.includes('lab_parse'));
  assert.ok(!steps.includes('lab_send'), 'envío a nota ya no es paso del tour');
  assert.ok(steps.includes('estado_actual'), 'debe presentar Estado Actual');
  assert.ok(steps.includes('listado_problemas'), 'debe presentar Listado de Problemas');
  assert.ok(steps.includes('livesync_desktop'), 'debe explicar LiveSync en escritorio');
  assert.ok(steps.includes('livesync_mobile'), 'debe explicar R+ Móvil');
  assert.ok(!steps.includes('sala_soap'), 'Sala no debe mostrar el paso heredado de Nota de evolución');
  assert.ok(!steps.includes('pase_enter'), 'Modo Pase ya no es paso obligatorio del tour');
  assert.ok(!steps.includes('pase_board'));
  assert.equal(steps[steps.length - 1], 'wrap');
  assert.equal(steps[steps.length - 3], 'livesync_desktop');
  assert.ok(steps.includes('sala_tend_chart'), 'debe presentar Gráfica del estudio');
  assert.equal(steps.indexOf('sala_tend_chart'), steps.indexOf('sala_tend') + 1);
  assert.ok(steps.includes('sala_casiopea_lab'), 'debe explicar envío lab a Neo');
  assert.ok(steps.includes('sala_casiopea_trends'), 'debe explicar envío tendencias a Neo');
  assert.equal(steps.indexOf('sala_casiopea_lab'), steps.indexOf('lab_view') + 2);
  assert.equal(steps.indexOf('sala_manejo'), steps.indexOf('sala_casiopea_lab') + 1);
  assert.equal(steps.indexOf('sala_casiopea_trends'), steps.indexOf('sala_tend_chart') + 1);
  assert.ok(steps.includes('sala_expediente_tabs'));
  assert.equal(steps.indexOf('sala_expediente_tabs'), steps.indexOf('lab_view') + 1);
  assert.equal(steps.length, 19);
  assert.equal(steps[1], 'map_tabs');
});

test('getInterconsultaTourSteps no incluye pasos de Modo Pase', () => {
  const steps = getInterconsultaTourSteps();
  assert.ok(!steps.includes('pase_enter'));
  assert.ok(!steps.includes('pase_board'));
  assert.equal(steps[1], 'map_tabs');
  assert.ok(steps.includes('sala_tend_chart'));
});

test('getInterconsultaTourSteps mantiene pasos clásicos sin Estado Actual ni Listado', () => {
  const steps = getInterconsultaTourSteps();
  assert.ok(steps.includes('map_sidebar'));
  assert.ok(!steps.includes('map'));
  assert.ok(!steps.includes('estado_actual'));
  assert.ok(!steps.includes('listado_problemas'));
  assert.ok(steps.includes('ic_nota'));
  assert.ok(steps.includes('ic_indica'));
  assert.ok(steps.includes('livesync_desktop'));
  assert.ok(steps.includes('livesync_mobile'));
  assert.equal(steps[steps.length - 1], 'wrap');
});

test('getTourTarget devuelve selector para lab_parse en Laboratorio', () => {
  const t = getTourTarget('lab_parse', 'sala');
  assert.equal(t.appTab, 'lab');
  assert.match(t.selector, /procesar|btn-procesar|lab-input/i);
  assert.equal(stepRequiresUserAction('lab_parse'), true);
});

test('getTourTarget para estado_actual apunta al expediente con su botón', () => {
  const t = getTourTarget('estado_actual', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, undefined);
  assert.match(t.selector, /estado-actual|btn-estado-actual/i);
});

test('getTourTarget para listado_problemas abre listado y resalta Generar', () => {
  const t = getTourTarget('listado_problemas', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, 'listado');
  assert.equal(t.selector, '#btn-gen-listado, #itab-salida');
  assert.equal(t.spotlightClass, 'tour-spotlight-action');
  assert.equal(stepRequiresUserAction('listado_problemas'), false);
});

test('getTourTarget para servicio_default apunta a Mi Perfil', () => {
  const t = getTourTarget('servicio_default', 'sala');
  assert.match(t.selector, /servicio|profile-default-servicio|profile-modal/i);
});

test('getTourTarget para sala_tend_chart resalta botón Gráfica', () => {
  const t = getTourTarget('sala_tend_chart', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, 'tend');
  assert.match(t.selector, /tend-section-chart-btn/);
  assert.equal(t.spotlightClass, 'tour-spotlight-action');
});

test('getTourTarget livesync_desktop abre panel ⇄', () => {
  const t = getTourTarget('livesync_desktop', 'sala');
  assert.match(t.selector || '', /team-sync/);
  assert.equal(t.openConnection, true);
});

test('stepRequiresUserAction es false para pasos puramente narrativos', () => {
  assert.equal(stepRequiresUserAction('map_sidebar'), false);
  assert.equal(stepRequiresUserAction('map_tabs'), false);
  assert.equal(stepRequiresUserAction('map_lab_teaser'), false);
  assert.equal(stepRequiresUserAction('wrap'), false);
  assert.equal(stepRequiresUserAction('livesync_desktop'), false);
  assert.equal(stepRequiresUserAction('livesync_mobile'), false);
  assert.equal(stepRequiresUserAction('sala_casiopea_lab'), false);
  assert.equal(stepRequiresUserAction('sala_casiopea_trends'), false);
});

test('getTourTarget para sala_casiopea_lab apunta al botón Tablas SOME', () => {
  const t = getTourTarget('sala_casiopea_lab', 'sala');
  assert.equal(t.appTab, 'lab');
  assert.match(t.selector, /lab-some-tables-btn/);
  assert.equal(stepRequiresUserAction('sala_casiopea_lab'), false);
});

test('getTourTarget para sala_casiopea_trends apunta al botón Enviar Neo', () => {
  const t = getTourTarget('sala_casiopea_trends', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, 'tend');
  assert.match(t.selector, /casiopea-trends-send/);
  assert.equal(stepRequiresUserAction('sala_casiopea_trends'), false);
});

test('getInterconsultaTourSteps no incluye pasos Neo', () => {
  const steps = getInterconsultaTourSteps();
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.ok(steps.includes('ic_expediente_tabs'));
  assert.equal(steps.indexOf('ic_expediente_tabs'), steps.indexOf('lab_view') + 1);
  assert.equal(steps.length, 18);
});

test('getTourTarget for sala_expediente_tabs apunta a barra de pestañas', () => {
  const t = getTourTarget('sala_expediente_tabs', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.selector, '.inner-tab-bar');
});
