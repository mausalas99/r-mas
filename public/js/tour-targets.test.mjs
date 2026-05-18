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
  assert.ok(steps.includes('lab_parse'));
  assert.ok(steps.includes('lab_send'));
  assert.ok(steps.includes('estado_actual'), 'debe presentar Estado Actual');
  assert.ok(steps.includes('listado_problemas'), 'debe presentar Listado de Problemas');
  assert.ok(steps.includes('livesync_desktop'), 'debe explicar LiveSync en escritorio');
  assert.ok(steps.includes('livesync_mobile'), 'debe explicar R+ Móvil');
  assert.ok(!steps.includes('sala_soap'), 'Sala no debe mostrar el paso heredado de Nota de evolución');
  assert.equal(steps[steps.length - 1], 'wrap');
  assert.equal(steps[steps.length - 3], 'livesync_desktop');
  assert.ok(steps.includes('sala_tend_chart'), 'debe presentar Gráfica del estudio');
  assert.equal(steps.indexOf('sala_tend_chart'), steps.indexOf('sala_tend') + 1);
  assert.equal(steps.length, 17);
  assert.equal(steps[1], 'pase_enter');
  assert.equal(steps[2], 'pase_board', 'tour en Sala incluye resumen Pase');
});

test('getInterconsultaTourSteps incluye entrada a Pase y tablero', () => {
  const steps = getInterconsultaTourSteps();
  assert.equal(steps[1], 'pase_enter');
  assert.equal(steps[2], 'pase_board');
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

test('getTourTarget para pase_enter resalta el área principal', () => {
  const t = getTourTarget('pase_enter', 'sala');
  assert.match(t.selector || '', /main-area/);
});

test('getTourTarget para pase_board apunta al scroll del tablero Pase', () => {
  const t = getTourTarget('pase_board', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.match(t.selector || '', /pase-board-scroll/);
});

test('getTourTarget devuelve selector para lab_parse en Laboratorio', () => {
  const t = getTourTarget('lab_parse', 'sala');
  assert.equal(t.appTab, 'lab');
  assert.match(t.selector, /procesar|btn-procesar|lab-input/i);
  assert.equal(stepRequiresUserAction('lab_parse'), true);
});

test('getTourTarget para lab_send también requiere acción del usuario', () => {
  const t = getTourTarget('lab_send', 'sala');
  assert.equal(t.appTab, 'lab');
  assert.equal(stepRequiresUserAction('lab_send'), true);
});

test('getTourTarget para estado_actual apunta al expediente con su botón', () => {
  const t = getTourTarget('estado_actual', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, undefined);
  assert.match(t.selector, /estado-actual|btn-estado-actual/i);
});

test('getTourTarget para listado_problemas apunta al tab interno listado', () => {
  const t = getTourTarget('listado_problemas', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, 'listado');
});

test('getTourTarget para servicio_default apunta a Mi Perfil', () => {
  const t = getTourTarget('servicio_default', 'sala');
  assert.match(t.selector, /servicio|profile-default-servicio|profile-modal/i);
});

test('stepRequiresUserAction incluye pase_enter', () => {
  assert.equal(stepRequiresUserAction('pase_enter'), true);
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
  assert.equal(stepRequiresUserAction('pase_board'), false);
  assert.equal(stepRequiresUserAction('wrap'), false);
  assert.equal(stepRequiresUserAction('livesync_desktop'), false);
  assert.equal(stepRequiresUserAction('livesync_mobile'), false);
});
