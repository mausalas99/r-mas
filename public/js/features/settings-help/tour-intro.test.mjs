import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

describe('tour intro launch', () => {
  it('loads startOnboarding from tour-flow (avoids circular import)', () => {
    const src = readFileSync(join(dir, 'tour-engine.mjs'), 'utf8');
    assert.match(src, /import\('\.\/tour-flow\.mjs'\)/);
    assert.match(src, /mod\.startOnboarding\(branch\)/);
    assert.doesNotMatch(src, /^\s*startOnboarding\('/m);
  });

  it('prompts Mi rotación after sala tour completion', () => {
    const src = readFileSync(join(dir, 'tour-flow.mjs'), 'utf8');
    assert.match(src, /handlePostGuidedTourOnboardingResume/);
    assert.match(src, /promptMiRotacionAfterSalaTourIfNeeded/);
    assert.match(src, /prepareSalaGuidedTourExitSync/);
    assert.match(src, /hideMainClinicalOnboarding/);
    assert.match(src, /setClinicalSyncModeLocalOnly\(false\)/);
    assert.match(src, /openClinicalTeamsPanel\(\{ skipProfileGate: true \}\)/);
    const roster = readFileSync(join(dir, '..', 'clinical-teams', 'teams-roster.mjs'), 'utf8');
    assert.match(roster, /skipProfileGate/);
    assert.match(src, /nombre completo de tu R2/);
    assert.match(src, /needsTeamOnboarding/);
    const state = readFileSync(join(dir, 'tour-state.mjs'), 'utf8');
    assert.match(state, /handlePostGuidedTourOnboardingResume/);
  });

  it('startOnboarding uses imported applyTourTargetForStep', () => {
    const src = readFileSync(join(dir, 'tour-flow.mjs'), 'utf8');
    assert.match(src, /applyTourTargetForStep\(tourState\.tourStepId\)/);
    assert.doesNotMatch(src, /applyTourNavigationForStep/);
  });

  it('applyTourTargetForStep imports demo constants from tour-demo-seed', () => {
    const src = readFileSync(join(dir, 'tour-engine.mjs'), 'utf8');
    assert.match(src, /TOUR_STEPS_USE_DEMO_PEREZ/);
    assert.match(src, /from '\.\/tour-demo-seed\.mjs'/);
    assert.doesNotMatch(src, /^\s*var TOUR_STEPS_USE_DEMO_PEREZ/m);
  });

  it('tour-flow imports tour-engine cleanup helpers', () => {
    const flow = readFileSync(join(dir, 'tour-flow.mjs'), 'utf8');
    const importBlock = flow.match(/from '\.\/tour-engine\.mjs';/);
    assert.ok(importBlock);
    const beforeEngine = flow.slice(0, flow.indexOf("from './tour-engine.mjs';"));
    assert.match(beforeEngine, /clearTourSoapButtonHighlight/);
    assert.match(beforeEngine, /syncLearnHubContinueVisibility/);
  });

  it('wrap step uses guidedTourFinish and completes on last step', () => {
    const flow = readFileSync(join(dir, 'tour-flow.mjs'), 'utf8');
    assert.match(flow, /export function finishGuidedTour/);
    assert.match(flow, /guidedTourFinish\(\)/);
    const click = flow.match(/function guidedTourClickNext\(\) \{[\s\S]*?\n\}/);
    assert.ok(click);
    assert.match(
      click[0],
      /if \(tourState\.tourStepId === 'wrap' \|\| tourState\.tourStepId === 'quick_wrap'\)/
    );
    const wrapIdx = click[0].indexOf(
      "if (tourState.tourStepId === 'wrap' || tourState.tourStepId === 'quick_wrap')"
    );
    const idxCheck = click[0].indexOf('if (i < 0) return');
    assert.ok(wrapIdx < idxCheck, 'wrap finish runs before i < 0 bail');
    assert.match(click[0], /if \(i \+ 1 >= steps\.length\) \{\s*finishGuidedTour/);
    const lazy = readFileSync(join(dir, '..', '..', 'lazy-feature-routes.mjs'), 'utf8');
    assert.match(lazy, /guidedTourFinish: 'finishGuidedTour'/);
    const index = readFileSync(join(dir, 'index.mjs'), 'utf8');
    assert.match(index, /guidedTourFinish:\s*finishGuidedTour/);
    assert.match(index, /finishGuidedTour,/);
  });

  it('tour-demo-seed imports applyTourDemoIngresoDates from tour-demo-dates', () => {
    const seed = readFileSync(join(dir, 'tour-demo-seed.mjs'), 'utf8');
    assert.match(seed, /applyTourDemoIngresoDates/);
    assert.match(seed, /from '\.\.\/\.\.\/tour-demo-dates\.mjs'/);
    assert.doesNotMatch(seed, /function applyTourDemoIngresoDates/);
  });

  it('tour lab registration uses preview Agregar paciente (no auto-modal when preview open)', () => {
    const flow = readFileSync(join(dir, 'tour-flow.mjs'), 'utf8');
    const afterBulk = flow.match(/export function tourAfterBulkLabParse\(blocks\) \{[\s\S]*?\n\}/);
    assert.ok(afterBulk);
    assert.match(afterBulk[0], /isBulkLabPreviewModalOpen/);
    const onPreview = flow.match(/export function tourOnBulkPreviewPatientSaved\(\) \{[\s\S]*?\n\}/);
    assert.ok(onPreview);
    assert.match(onPreview[0], /Agregar paciente en la tabla/);
    assert.doesNotMatch(onPreview[0], /scheduleTourDemoPatientRegistrationFromLab/);
    const patients = readFileSync(join(dir, '..', 'patients.mjs'), 'utf8');
    assert.match(patients, /isAddPatientModalOpenForRegistro/);
  });

  it('clinical-onboarding-main calls post-registration education hook', () => {
    const main = readFileSync(
      join(dir, '..', 'clinical-onboarding-main.mjs'),
      'utf8'
    );
    assert.match(main, /tryShowPostRegistrationEducationIfNeeded/);
    assert.doesNotMatch(main, /tryShowGuidedTourIntroIfNeeded/);
  });

  it('guardia-v7 gating requires post-registration', () => {
    const gating = readFileSync(
      join(dir, '..', '..', 'guardia-v7-gating.mjs'),
      'utf8'
    );
    assert.match(gating, /needsOnboarding/);
    assert.match(gating, /shouldOfferGuardiaV7Education/);
  });

  it('learn-hub and upgrade card modules exist', () => {
    const hub = readFileSync(join(dir, 'learn-hub.mjs'), 'utf8');
    assert.match(hub, /openLearnHub/);
    assert.match(hub, /GUARDIA_V7_HUB_MODULES/);
    const card = readFileSync(join(dir, 'guardia-v7-upgrade-card.mjs'), 'utf8');
    assert.match(card, /maybeShowGuardiaV7UpgradeCard/);
    assert.match(card, /dismissGuardiaV7UpgradeCard/);
  });

  it('tourAfterBulkLabParse advances lab_parse when both demo patients are in census', () => {
    const flow = readFileSync(join(dir, 'tour-flow.mjs'), 'utf8');
    const fn = flow.match(
      /export function tourAfterBulkLabParse\(blocks\) \{[\s\S]*?\n\}/
    );
    assert.ok(fn, 'tourAfterBulkLabParse export');
    assert.match(fn[0], /onboardingAdvanceAfterParse\(\)/);
    assert.doesNotMatch(fn[0], /if \(tourDemoPatientsBothInCensus\(patients\)\) return;/);
    const lab = readFileSync(join(dir, '..', 'lab-panel.mjs'), 'utf8');
    assert.match(lab, /notifyTourAfterBulkLabStore/);
  });
});
