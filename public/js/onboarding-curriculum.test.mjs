import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_VERSION,
  getSalaTourSteps,
  getInterconsultaTourSteps,
  getNeoCompanionSteps,
  getChapterForStep,
  getChapterProgressLabel,
  HUB_MODULES,
} from './onboarding-curriculum.mjs';

test('CURRICULUM_VERSION is 7 with estado actual post-registro substeps', () => {
  assert.equal(CURRICULUM_VERSION, 7);
});

test('getSalaTourSteps has 24 base steps without Neo or Manejo', () => {
  const steps = getSalaTourSteps();
  assert.equal(steps.length, 24);
  assert.ok(!steps.includes('sala_manejo'));
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.equal(steps[0], 'map_sidebar');
  assert.equal(steps.indexOf('lab_view'), 4);
  assert.equal(steps.indexOf('servicio_default'), 5);
  assert.equal(steps.indexOf('sala_expediente_tabs'), 6);
  assert.equal(steps.indexOf('historia_clinica'), 7);
  assert.equal(steps.indexOf('estado_actual'), 8);
  assert.equal(steps.indexOf('estado_actual_registro'), 9);
  assert.equal(steps.indexOf('estado_actual_snapshot'), 10);
  assert.equal(steps.indexOf('estado_actual_charts'), 11);
  assert.equal(steps.indexOf('estado_actual_historial'), 12);
  assert.equal(steps.indexOf('eventualidades'), 13);
  assert.ok(steps.indexOf('estado_actual_historial') < steps.indexOf('eventualidades'));
  assert.ok(steps.includes('listado_problemas'));
  assert.ok(steps.includes('sala_vpo'));
  assert.ok(steps.includes('sala_receta_hu'));
  assert.equal(steps.indexOf('listado_problemas'), steps.indexOf('sala_med') + 1);
  assert.ok(steps.includes('sala_agenda'));
  assert.equal(steps[steps.length - 1], 'wrap');
});

test('getNeoCompanionSteps is separate', () => {
  assert.deepEqual(getNeoCompanionSteps(), ['sala_casiopea_lab', 'sala_casiopea_trends']);
});

test('getChapterForStep maps servicio_default to ch-patient-lab', () => {
  const ch = getChapterForStep('servicio_default', 'sala');
  assert.equal(ch.id, 'ch-patient-lab');
  assert.match(ch.title, /Paciente|laboratorio/i);
});

test('estado_actual is in ch-chart not ch-salida', () => {
  assert.equal(getChapterForStep('estado_actual', 'sala').id, 'ch-chart');
  assert.equal(getChapterForStep('sala_vpo', 'sala').id, 'ch-salida');
  assert.equal(getChapterForStep('sala_agenda', 'sala').id, 'ch-agenda');
});

test('getChapterProgressLabel for step in chapter 2', () => {
  const label = getChapterProgressLabel('historia_clinica', 'sala');
  assert.match(label.chapterTitle, /Clínico|Expediente/i);
  assert.ok(label.stepInChapter >= 1);
  assert.ok(label.chapterSteps >= 1);
});

test('HUB_MODULES includes neo extension and agenda module', () => {
  const neo = HUB_MODULES.find((m) => m.id === 'neo-lab');
  assert.ok(neo);
  assert.equal(neo.companion, 'neo');
  assert.ok(HUB_MODULES.some((m) => m.chapterId === 'ch-agenda'));
});

test('getInterconsultaTourSteps still lab-first and no Neo', () => {
  const steps = getInterconsultaTourSteps();
  assert.equal(steps.indexOf('lab_parse'), steps.indexOf('map_lab_teaser') + 1);
  assert.ok(!steps.includes('sala_casiopea_lab'));
});
