import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDriveImportReviewSteps,
  applyReviewStepsToParsed,
} from './drive-import-review.mjs';
import { hcPatchValueToEditText, editTextToHcPatchValue } from './drive-import-hc-edit.mjs';

test('hc edit round-trip for motivoConsulta', () => {
  const original = 'DOLOR TORÁCICO';
  const text = hcPatchValueToEditText('motivoConsulta', original);
  assert.equal(text, original);
  assert.equal(editTextToHcPatchValue('motivoConsulta', 'DOLOR ABDOMINAL', original), 'DOLOR ABDOMINAL');
});

test('applyReviewStepsToParsed omits unchecked HC section', () => {
  const parsed = {
    header: {},
    hcPatch: { motivoConsulta: 'A', padecimientoActual: 'B' },
    eventualidades: { entries: [], skippedEstimate: 0 },
    laboratorios: { sets: [], allSets: [], skippedEstimate: 0 },
    warnings: [],
  };
  const steps = buildDriveImportReviewSteps(parsed, { applyMode: 'fill' });
  assert.ok(steps.length >= 2);
  const motivo = steps.find(function (s) {
    return s.kind === 'hc' && s.key === 'motivoConsulta';
  });
  assert.ok(motivo);
  motivo.include = false;
  const out = applyReviewStepsToParsed(parsed, steps);
  assert.equal(out.hcPatch.motivoConsulta, undefined);
  assert.equal(out.hcPatch.padecimientoActual, 'B');
});

test('buildDriveImportReviewSteps lists all lab dates and marks duplicates', () => {
  const sets = [
    { fecha: '02/06/2026', hora: '', resLabs: ['BH\tHb 1'] },
    { fecha: '01/06/2026', hora: '', resLabs: ['BH\tHb 2'] },
    { fecha: '30/05/2026', hora: '', resLabs: ['BH\tHb 3'] },
  ];
  const parsed = {
    header: {},
    hcPatch: {},
    eventualidades: { entries: [], skippedEstimate: 0 },
    laboratorios: { sets: [sets[0]], allSets: sets, skippedEstimate: 2 },
    warnings: [],
  };
  const steps = buildDriveImportReviewSteps(parsed, {
    applyMode: 'fill',
    existingLabHistory: [{ fecha: '01/06/2026', hora: '', resLabs: ['BH\tHb 2'] }],
  });
  const labStep = steps.find(function (s) {
    return s.kind === 'labs';
  });
  assert.ok(labStep);
  assert.equal(labStep.sets.length, 3);
  assert.equal(labStep.sets.filter((s) => s.include).length, 2);
  assert.equal(labStep.sets.filter((s) => s.isDuplicate).length, 1);
  assert.match(labStep.label, /3 fechas/);
});

test('applyReviewStepsToParsed filters eventualidades', () => {
  const parsed = {
    header: {},
    hcPatch: {},
    eventualidades: {
      entries: [
        { at: '2026-06-01T12:00:00.000Z', text: 'Nota uno' },
        { at: '2026-06-02T12:00:00.000Z', text: 'Nota dos' },
      ],
      skippedEstimate: 0,
    },
    laboratorios: { sets: [], allSets: [], skippedEstimate: 0 },
    warnings: [],
  };
  const steps = buildDriveImportReviewSteps(parsed, { applyMode: 'eventos' });
  const evStep = steps.find(function (s) {
    return s.kind === 'eventos';
  });
  assert.ok(evStep);
  evStep.entries[0].include = false;
  evStep.entries[1].text = 'Nota dos corregida';
  const out = applyReviewStepsToParsed(parsed, steps);
  assert.equal(out.eventualidades.entries.length, 1);
  assert.match(out.eventualidades.entries[0].text, /corregida/);
});
