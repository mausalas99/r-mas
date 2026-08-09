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
