import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_ONBOARDING_MAIN_ID,
  CLINICAL_ONBOARDING_ACTIVE_CLASS,
  describeOnboardingSessionBlock,
} from './clinical-onboarding-main.mjs';

describe('clinical-onboarding-main', () => {
  it('exports stable host id', () => {
    assert.equal(CLINICAL_ONBOARDING_MAIN_ID, 'clinical-onboarding-main');
    assert.equal(CLINICAL_ONBOARDING_ACTIVE_CLASS, 'clinical-onboarding-active');
  });

  it('describeOnboardingSessionBlock mentions local DB not LAN', async () => {
    const msg = await describeOnboardingSessionBlock();
    assert.match(msg, /base de datos local|base local/i);
    assert.match(msg, /no necesitas R\+ Cloud|No necesitas R\+ Cloud/i);
  });

  it('team step refresh avoids full bootstrap reload loop', async () => {
    const mainSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-main.mjs', import.meta.url), 'utf8')
    );
    const teamSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-team.mjs', import.meta.url), 'utf8')
    );
    assert.match(mainSrc, /refreshTeamOnboardingShellOnly/);
    assert.match(mainSrc, /showMainClinicalOnboardingInflight/);
    assert.doesNotMatch(teamSrc, /refreshMainClinicalOnboardingIfNeeded/);
  });

  it('refreshMainClinicalOnboardingIfNeeded reloads teams before dismissing team step', async () => {
    const mainSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-main.mjs', import.meta.url), 'utf8')
    );
    const start = mainSrc.indexOf('export async function refreshMainClinicalOnboardingIfNeeded');
    assert.ok(start >= 0);
    const body = mainSrc.slice(start, start + 900);
    assert.match(body, /fetchClinicalTeamsFromDb/);
    const fetchIdx = body.indexOf('fetchClinicalTeamsFromDb');
    const gateIdx = body.indexOf('needsOnboardingShell');
    assert.ok(fetchIdx >= 0 && gateIdx > fetchIdx);
  });

  it('showMainClinicalOnboarding fast-paths sync mode before team fetch', async () => {
    const mainSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-main.mjs', import.meta.url), 'utf8')
    );
    const start = mainSrc.indexOf('async function showMainClinicalOnboardingBody');
    assert.ok(start >= 0);
    const body = mainSrc.slice(start, start + 900);
    assert.match(body, /needsClinicalSyncModeChoice/);
    const syncIdx = body.indexOf('needsClinicalSyncModeChoice');
    const reloadTeamsIdx = body.indexOf('reloadClinicalTeamsBeforeGate');
    assert.ok(syncIdx >= 0 && reloadTeamsIdx > syncIdx);

    const helperStart = mainSrc.indexOf('async function reloadClinicalTeamsBeforeGate');
    assert.ok(helperStart >= 0);
    const helperBody = mainSrc.slice(helperStart, helperStart + 300);
    assert.match(helperBody, /fetchClinicalTeamsFromDb/);
  });

  it('showMainClinicalOnboarding animates boot progress before rendering form', async () => {
    const mainSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-main.mjs', import.meta.url), 'utf8')
    );
    assert.match(mainSrc, /animateOnboardingBootComplete/);
    assert.match(mainSrc, /ensureOnboardingBootLoading/);
  });

  it('hideMainClinicalOnboarding notifies app shell to resume deferred boot', async () => {
    const mainSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-main.mjs', import.meta.url), 'utf8')
    );
    assert.match(mainSrc, /rpc-clinical-onboarding-finished/);
  });

  it('only resumes the stored cloud token when onboarding is actually needed', async () => {
    const mainSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./clinical-onboarding-main.mjs', import.meta.url), 'utf8')
    );
    const start = mainSrc.indexOf('async function showMainClinicalOnboardingBody');
    assert.ok(start >= 0);
    const body = mainSrc.slice(start, start + 900);
    assert.match(body, /if \(needsOnboardingShell\(\)\) \{\s*await resumeStoredCloudTokenIfPresent\(\);/);
  });

  it('app.js no pre-marca deferredShellBootDone antes de runDeferredShellAfterOnboarding', async () => {
    const appSrc = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8')
    );
    assert.doesNotMatch(
      appSrc,
      /if \(!onboardingBootActive\) \{\s*deferredShellBootDone = true;\s*runDeferredShellAfterOnboarding\(\);/
    );
    assert.match(appSrc, /if \(!onboardingBootActive\) \{\s*runDeferredShellAfterOnboarding\(\);/);
  });
});
