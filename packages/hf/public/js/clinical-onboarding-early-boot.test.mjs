import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const earlyBootSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-early-boot.js'),
  'utf8'
);

describe('clinical-onboarding-early-boot', () => {
  it('exports mount hook before app bundle', () => {
    assert.match(earlyBootSrc, /window\.rpcMountEarlySyncModeOnboardingIfNeeded/);
    assert.match(earlyBootSrc, /window\.rpcNeedsEarlySyncModeChoice/);
    assert.match(earlyBootSrc, /clinical-onboarding-active/);
  });

  it('mounts sync mode without waiting for SQLCipher', () => {
    assert.match(earlyBootSrc, /¿Cómo usarás R\+?/);
    assert.match(earlyBootSrc, /clinical-onboard-boot-spinner/);
    assert.doesNotMatch(earlyBootSrc, /dbClinicalAccessBootstrap/);
    assert.doesNotMatch(earlyBootSrc, /ensureClinicalDbUnlocked/);
  });


  it('index.src.html must not eagerly load app.bundle (keeps sync-mode clicks responsive)', () => {
    const indexSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../index.src.html'),
      'utf8'
    );
    assert.doesNotMatch(indexSrc, /app\.bundle\.mjs/);
    assert.doesNotMatch(indexSrc, /vendor\/sortable/);
    assert.doesNotMatch(indexSrc, /vendor\/chart\.umd/);
    assert.match(indexSrc, /clinical-onboarding-early-boot\.js/);
  });

  it('defers heavy app bundle until sync mode is chosen', () => {
    assert.match(earlyBootSrc, /__RPC_DEFER_APP_BUNDLE__/);
    assert.match(earlyBootSrc, /rpcLoadDeferredAppScripts/);
    assert.match(earlyBootSrc, /app\.bundle\.mjs/);
    assert.match(earlyBootSrc, /scheduleAppScriptsLoad\(\)/);
  });

  it('persists mode choice to rpc-settings for bundle handoff', () => {
    assert.match(earlyBootSrc, /rpc-settings/);
    assert.match(earlyBootSrc, /__RPC_EARLY_SYNC_MODE_CHOSEN__/);
    assert.match(earlyBootSrc, /clinicalOnboardingExistingAccount/);
  });
});

describe('early-boot remember durable fallback', () => {
  it('checks electronAPI.cloudSyncRememberGetSync when LS token missing', () => {
    const earlyBootSrc = readFileSync(
      new URL('./clinical-onboarding-early-boot.js', import.meta.url),
      'utf8'
    );
    assert.match(earlyBootSrc, /cloudSyncRememberGetSync/);
  });
});
