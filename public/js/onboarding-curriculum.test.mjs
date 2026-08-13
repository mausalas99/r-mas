import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_VERSION,
  getSalaTourSteps,
  getInterconsultaTourSteps,
  getGuardiaV7TourSteps,
  getQuickRouteTourSteps,
  getChapterForStep,
  getChapterProgressLabel,
  HUB_MODULES,
  migrateTourStepId,
} from './onboarding-curriculum.mjs';

test('CURRICULUM_VERSION is 17 after structure-first onboarding', () => {
  assert.equal(CURRICULUM_VERSION, 17);
});

test('getSalaTourSteps has 23 steps: map first, then lab with tendencias', () => {
  const steps = getSalaTourSteps();
  assert.equal(steps.length, 23);
  assert.ok(!steps.includes('sala_manejo'));
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.ok(!steps.includes('estado_actual_snapshot'));
  assert.ok(!steps.includes('historia_clinica'));
  assert.ok(steps.includes('estado_actual_review'));
  assert.equal(steps[0], 'map_tabs');
  assert.equal(steps[1], 'map_sidebar');
  assert.equal(steps[2], 'map_add_patient');
  assert.equal(steps[3], 'map_incomplete');
  assert.equal(steps[4], 'servicio_default');
  assert.equal(steps.indexOf('map_lab_teaser'), 5);
  assert.equal(steps.indexOf('lab_parse'), 6);
  assert.equal(steps.indexOf('lab_view'), 7);
  assert.equal(steps.indexOf('sala_tend'), 8);
  assert.equal(steps.indexOf('sala_tend_chart'), 9);
  assert.equal(steps.indexOf('sala_expediente_tabs'), 10);
  assert.equal(steps.indexOf('estado_actual'), 11);
  assert.ok(steps.indexOf('estado_actual_review') < steps.indexOf('eventualidades'));
  assert.ok(steps.includes('listado_problemas'));
  assert.ok(steps.includes('sala_vpo'));
  assert.ok(steps.includes('sala_receta_hu'));
  assert.equal(steps.indexOf('listado_problemas'), steps.indexOf('sala_med') + 1);
  assert.ok(steps.includes('sala_agenda'));
  assert.equal(steps[steps.length - 1], 'wrap');
});

test('getQuickRouteTourSteps starts with map then alta', () => {
  const steps = getQuickRouteTourSteps();
  assert.equal(steps.length, 6);
  assert.equal(steps[0], 'map_tabs');
  assert.equal(steps[1], 'map_add_patient');
  assert.equal(steps[2], 'lab_parse');
  assert.equal(steps[3], 'gv7_guardia_chip');
  assert.equal(steps[steps.length - 1], 'quick_wrap');
});

test('getChapterProgressLabel quick-route uses linear index', () => {
  const label = getChapterProgressLabel('gv7_guardia_chip', 'quick-route');
  assert.equal(label.stepInChapter, 4);
  assert.equal(label.chapterSteps, 6);
  assert.match(label.chapterTitle, /Ruta rápida/i);
});

test('migrateTourStepId maps retired gv7_lan_pin to directorio', () => {
  assert.equal(migrateTourStepId('gv7_lan_pin', 'guardia-v7'), 'gv7_lan_directorio');
});

test('migrateTourStepId maps legacy estado_actual substeps', () => {
  assert.equal(migrateTourStepId('estado_actual_charts', 'sala'), 'estado_actual_review');
  assert.equal(migrateTourStepId('sala_soap', 'interconsulta'), 'sala_med');
  assert.equal(migrateTourStepId('historia_clinica', 'sala'), 'estado_actual');
  assert.equal(migrateTourStepId('lab_view', 'sala'), 'lab_view');
});

test('getChapterForStep maps map and servicio_default to ch-map', () => {
  const ch = getChapterForStep('servicio_default', 'sala');
  assert.equal(ch.id, 'ch-map');
  assert.match(ch.title, /armada|estructura/i);
  assert.equal(getChapterForStep('map_add_patient', 'sala').id, 'ch-map');
  assert.equal(getChapterForStep('map_incomplete', 'sala').id, 'ch-map');
});

test('lab chapter includes tendencias; chart stays clínico', () => {
  assert.equal(getChapterForStep('sala_tend', 'sala').id, 'ch-patient-lab');
  assert.equal(getChapterForStep('lab_parse', 'sala').id, 'ch-patient-lab');
  assert.equal(getChapterForStep('estado_actual', 'sala').id, 'ch-chart');
  assert.equal(getChapterForStep('sala_vpo', 'sala').id, 'ch-salida');
  assert.equal(getChapterForStep('sala_agenda', 'sala').id, 'ch-agenda');
});

test('guardia-v7 censo chapter precedes entrega', () => {
  assert.equal(getChapterForStep('gv7_censo_r1', 'guardia-v7').id, 'ch-guardia-censo');
  assert.equal(getChapterForStep('gv7_trust_strip', 'guardia-v7').id, 'ch-guardia-modo');
  assert.equal(getChapterForStep('gv7_fin_turno', 'guardia-v7').id, 'ch-guardia-entrega');
  assert.equal(getChapterForStep('gv7_inherit_patients', 'guardia-v7').id, 'ch-guardia-nube');
  const steps = getGuardiaV7TourSteps();
  assert.equal(steps.length, 22);
  assert.ok(!steps.includes('gv7_lan_pin'));
  assert.ok(steps.indexOf('gv7_censo_sync') < steps.indexOf('gv7_entrega_phase'));
  assert.ok(steps.indexOf('gv7_trust_strip') < steps.indexOf('gv7_guardia_toggle'));
  assert.ok(steps.indexOf('gv7_entrega_pendientes') < steps.indexOf('gv7_fin_turno'));
  assert.ok(steps.indexOf('gv7_lan_rotacion') < steps.indexOf('gv7_rotacion_rejoin'));
});

test('getChapterProgressLabel for estado_actual in clínico chapter', () => {
  const label = getChapterProgressLabel('estado_actual', 'sala');
  assert.match(label.chapterTitle, /Clínico|Expediente/i);
  assert.ok(label.stepInChapter >= 1);
  assert.ok(label.chapterSteps >= 1);
});

test('HUB_MODULES starts with structure and has no Resultados chapter', () => {
  assert.ok(!HUB_MODULES.some((m) => m.id === 'neo-lab'));
  assert.ok(!HUB_MODULES.some((m) => m.chapterId === 'ch-results'));
  assert.equal(HUB_MODULES[0].chapterId, 'ch-map');
  assert.match(HUB_MODULES[0].label, /armada/i);
  assert.ok(HUB_MODULES.some((m) => m.chapterId === 'ch-agenda'));
  assert.ok(HUB_MODULES.some((m) => m.chapterId === 'ch-patient-lab'));
});

test('getInterconsultaTourSteps is map-first then lab then clínico', () => {
  const steps = getInterconsultaTourSteps();
  assert.equal(steps[0], 'map_tabs');
  assert.equal(steps.indexOf('lab_parse'), steps.indexOf('map_lab_teaser') + 1);
  assert.ok(steps.indexOf('map_add_patient') < steps.indexOf('lab_parse'));
  assert.ok(steps.indexOf('sala_tend') < steps.indexOf('ic_expediente_tabs'));
  assert.ok(!steps.includes('sala_casiopea_lab'));
});
