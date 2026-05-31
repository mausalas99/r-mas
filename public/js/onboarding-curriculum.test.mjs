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

test('getSalaTourSteps has 19 base steps without Neo', () => {
  const steps = getSalaTourSteps();
  assert.equal(steps.length, 19);
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.equal(steps[0], 'map_sidebar');
  assert.equal(steps.indexOf('lab_view'), 5);
  assert.equal(steps.indexOf('servicio_default'), 6);
  assert.equal(steps.indexOf('sala_expediente_tabs'), 7);
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

test('getChapterProgressLabel for step in chapter 2', () => {
  const label = getChapterProgressLabel('historia_clinica', 'sala');
  assert.match(label.chapterTitle, /Expediente/);
  assert.ok(label.stepInChapter >= 1);
  assert.ok(label.chapterSteps >= 1);
});

test('HUB_MODULES includes neo extension', () => {
  const neo = HUB_MODULES.find((m) => m.id === 'neo-lab');
  assert.ok(neo);
  assert.equal(neo.companion, 'neo');
});

test('getInterconsultaTourSteps still lab-first and no Neo', () => {
  const steps = getInterconsultaTourSteps();
  assert.equal(steps.indexOf('lab_parse'), steps.indexOf('map_lab_teaser') + 2);
  assert.ok(!steps.includes('sala_casiopea_lab'));
});
