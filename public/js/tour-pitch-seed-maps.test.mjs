import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillPitchDemoClinicalMaps } from './tour-pitch-seed-maps.mjs';
import { PITCH_DEMO_PATIENT_ID } from './tour-pitch-sandbox.mjs';
import { countMedTurnoItems, buildMedTurnoHeaderText } from './features/medications-panel-rows.mjs';
import { collectDietasFromRecetaBlock, listDietCandidates } from './med-receta-diet.mjs';

/**
 * Regression coverage for the Manejo (4a) fixture: the DEMO PÉREZ patient's medReceta
 * needs a real diet entry and a real O₂ "apoyo" item so the Manejo screen's
 * "Dieta detectada" card and "más N apoyo (O₂)" split-count header have data to render
 * against during verification — see docs/superpowers/plans/2026-08-19-teal-workbench-full-rollout.md
 * Phase 4.
 */
function buildMaps() {
  const maps = {
    notes: {},
    indicaciones: {},
    labHistory: {},
    listadoProblemas: {},
    medRecetaByPatient: {},
    medNotaSelectionByPatient: {},
    recetaHuByPatient: {},
  };
  fillPitchDemoClinicalMaps(maps, '19/08/2026', '08:00', new Date('2026-08-19T08:00:00'));
  return maps;
}

test('DEMO PÉREZ medReceta: includes a diet entry the Manejo "Dieta detectada" card can render', () => {
  const maps = buildMaps();
  const block = maps.medRecetaByPatient[PITCH_DEMO_PATIENT_ID];
  assert.ok(block, 'medReceta block seeded');
  const dietas = collectDietasFromRecetaBlock(block);
  assert.ok(dietas.length >= 1, 'at least one dieta present');
  const candidates = listDietCandidates(dietas);
  assert.ok(candidates.length >= 1, 'at least one renderable diet candidate');
  assert.match(candidates[0].label, /renal/i);
});

test('DEMO PÉREZ medReceta: includes an O₂ apoyo item so the split-count header is non-empty', () => {
  const maps = buildMaps();
  const block = maps.medRecetaByPatient[PITCH_DEMO_PATIENT_ID];
  const counts = countMedTurnoItems(block.items);
  assert.equal(counts.apoyoCount, 1, 'exactly one apoyo item (the O2 mask)');
  assert.deepEqual(counts.apoyoKinds, ['oxigeno']);
  assert.ok(counts.medCount >= 2, 'the two real medications still count separately');
  const header = buildMedTurnoHeaderText(counts);
  assert.match(header.secondary, /más 1 apoyo \(O₂\)/);
});
