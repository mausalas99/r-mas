import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTourTarget,
  getSalaTourSteps,
  getInterconsultaTourSteps,
  getQuickRouteTourSteps,
  stepRequiresUserAction,
} from './tour-targets.mjs';

test('getSalaTourSteps orden: mapa y alta primero, lab con tendencias, clínico, salida', () => {
  const steps = getSalaTourSteps();
  assert.equal(steps.length, 23);
  assert.ok(!steps.includes('lab_bulk_separator'));
  assert.ok(!steps.includes('sala_manejo'));
  assert.ok(!steps.includes('historia_clinica'));
  assert.equal(steps[0], 'map_tabs');
  assert.equal(steps.indexOf('map_add_patient'), 2);
  assert.equal(steps.indexOf('map_incomplete'), 3);
  assert.equal(steps.indexOf('servicio_default'), 4);
  assert.equal(steps.indexOf('sala_tend'), steps.indexOf('lab_view') + 1);
  assert.equal(steps.indexOf('estado_actual_registro'), steps.indexOf('estado_actual') + 1);
  assert.equal(steps.indexOf('estado_actual_review'), steps.indexOf('estado_actual_registro') + 1);
  assert.equal(steps.indexOf('eventualidades'), steps.indexOf('estado_actual_review') + 1);
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.ok(steps.includes('listado_problemas'));
  assert.ok(steps.includes('sala_vpo'));
  assert.ok(steps.includes('sala_receta_hu'));
  assert.ok(steps.includes('sala_agenda'));
  assert.equal(steps[steps.length - 1], 'wrap');
});

test('getInterconsultaTourSteps no incluye pasos de Modo Pase', () => {
  const steps = getInterconsultaTourSteps();
  assert.ok(!steps.includes('pase_enter'));
  assert.ok(!steps.includes('pase_board'));
  assert.equal(steps[1], 'map_sidebar');
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

test('getTourTarget para estado_actual apunta al segmento Estado actual (Sala)', () => {
  const t = getTourTarget('estado_actual', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, 'estadoActual');
  assert.match(t.selector, /ea-snapshot|ea-charts-summary/);
  assert.equal(t.spotlightClass, 'tour-spotlight-action');
});

test('getTourTarget para estado_actual_review combina snapshot, gráficas e historial', () => {
  const review = getTourTarget('estado_actual_review', 'sala');
  assert.match(review.selector, /ea-snapshot/);
  assert.match(review.selector, /ea-charts-summary/);
  assert.match(review.selector, /ea-historial/);
});

test('gv7 action steps require user interaction', () => {
  assert.equal(stepRequiresUserAction('gv7_guardia_toggle'), true);
  assert.equal(stepRequiresUserAction('gv7_lan_wifi'), true);
  assert.equal(stepRequiresUserAction('gv7_mobile_link'), true);
  assert.equal(stepRequiresUserAction('livesync_desktop'), true);
});

test('getTourTarget para eventualidades en Clínico (Sala)', () => {
  const ev = getTourTarget('eventualidades', 'sala');
  assert.equal(ev.innerTab, 'eventualidades');
  assert.match(ev.selector, /exp-segment-eventualidades/);
});

test('getTourTarget para sala_vpo, sala_receta_hu y sala_agenda', () => {
  const vpo = getTourTarget('sala_vpo', 'sala');
  assert.equal(vpo.innerTab, 'vpo');
  assert.match(vpo.selector, /vpo/);
  const rec = getTourTarget('sala_receta_hu', 'sala');
  assert.equal(rec.innerTab, 'recetaHu');
  const ag = getTourTarget('sala_agenda', 'sala');
  assert.equal(ag.appTab, 'agenda');
  assert.match(ag.selector, /agenda/);
});

test('getTourTarget para listado_problemas abre listado y resalta Generar', () => {
  const t = getTourTarget('listado_problemas', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.innerTab, 'listado');
  assert.equal(t.selector, '#listado-form, #exp-segment-listado, #btn-gen-listado');
  assert.equal(t.spotlightClass, 'tour-spotlight-action');
  assert.equal(stepRequiresUserAction('listado_problemas'), false);
});

test('getTourTarget para servicio_default apunta a Mi Perfil', () => {
  const t = getTourTarget('servicio_default', 'sala');
  assert.match(t.selector, /servicio|profile-default-servicio|profile-modal/i);
});

test('getTourTarget para sala_tend_chart resalta botón Gráfica en Laboratorio', () => {
  const t = getTourTarget('sala_tend_chart', 'sala');
  assert.equal(t.appTab, 'lab');
  assert.equal(t.labInner, 'tend');
  assert.match(t.selector, /tend-section-chart-btn/);
  assert.equal(t.spotlightClass, 'tour-spotlight-action');
});

test('getTourTarget para map_add_patient y map_incomplete', () => {
  const add = getTourTarget('map_add_patient', 'sala');
  assert.match(add.selector, /btn-add/);
  const inc = getTourTarget('map_incomplete', 'sala');
  assert.equal(inc.openAddModalFullManual, true);
  assert.match(inc.selector, /m-cuarto/);
});

test('getTourTarget gv7 trust strip y fin turno en guardia', () => {
  const trust = getTourTarget('gv7_trust_strip', 'guardia-v7');
  assert.match(trust.selector, /guardia-trust-strip/);
  assert.equal(trust.openGuardiaDensity, true);
  const fin = getTourTarget('gv7_fin_turno', 'guardia-v7');
  assert.match(fin.selector, /guardia-phase-bar|finalizar-turno/);
  const rejoin = getTourTarget('gv7_rotacion_rejoin', 'guardia-v7');
  assert.match(rejoin.selector, /equipo|rotation/);
  assert.equal(rejoin.openConnection, true);
  const inherit = getTourTarget('gv7_inherit_patients', 'guardia-v7');
  assert.match(inherit.selector, /equipo|inherit/);
  assert.equal(inherit.openConnection, true);
});

test('stepRequiresUserAction es false para pasos puramente narrativos', () => {
  assert.equal(stepRequiresUserAction('map_sidebar'), false);
  assert.equal(stepRequiresUserAction('map_tabs'), false);
  assert.equal(stepRequiresUserAction('map_lab_teaser'), false);
  assert.equal(stepRequiresUserAction('wrap'), false);
  assert.equal(stepRequiresUserAction('livesync_desktop'), true);
  assert.equal(stepRequiresUserAction('livesync_mobile'), false);
});

test('getInterconsultaTourSteps orden curriculum: 18 pasos, mapa antes de laboratorio', () => {
  const steps = getInterconsultaTourSteps();
  assert.equal(steps.length, 18);
  assert.equal(steps[0], 'map_tabs');
  assert.ok(steps.includes('map_add_patient'));
  assert.ok(steps.includes('map_incomplete'));
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.ok(!steps.includes('sala_manejo'));
  assert.ok(steps.includes('ic_expediente_tabs'));
  assert.equal(steps.indexOf('sala_tend'), steps.indexOf('lab_view') + 1);
  assert.equal(steps.indexOf('ic_expediente_tabs'), steps.indexOf('sala_tend_chart') + 1);
});

test('getTourTarget for sala_expediente_tabs apunta a barra de pestañas', () => {
  const t = getTourTarget('sala_expediente_tabs', 'sala');
  assert.equal(t.appTab, 'nota');
  assert.equal(t.selector, '.inner-tab-bar');
});

test('every sala, IC and quick-route step has a target selector', () => {
  const ids = [...getSalaTourSteps(), ...getInterconsultaTourSteps(), ...getQuickRouteTourSteps()];
  for (const id of new Set(ids)) {
    const t = getTourTarget(id, 'sala');
    assert.ok(t.selector, `missing selector for ${id}`);
  }
});
