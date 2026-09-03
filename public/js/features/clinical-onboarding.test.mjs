import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLegacyMachineUsername } from '../clinical-username.mjs';
import {
  CLINICAL_LAN_PROFILE_GATE_VERSION,
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLocalOnlyPlaceholderUsername,
  needsClinicalLanProfileGate,
  setClinicalExistingAccountPath,
  setClinicalSyncModeLocalOnly,
} from '../clinical-settings.mjs';
import { needsClinicalSyncModeChoice, needsTeamOnboarding } from './clinical-onboarding.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';

describe('clinical-onboarding helpers', () => {
  it('detects legacy username for onboarding gate', () => {
    assert.equal(isLegacyMachineUsername('lc_device_x', 'lc_device_x'), true);
    assert.equal(isLegacyMachineUsername('mgarcia', 'lc_device_x'), false);
  });

  it('requires LAN profile gate until version 7.9.0 is recorded', () => {
    assert.equal(needsClinicalLanProfileGate({}), true);
    assert.equal(needsClinicalLanProfileGate({ clinicalRegistered: true }), true);
    assert.equal(
      needsClinicalLanProfileGate({
        clinicalLanProfileGateVersion: CLINICAL_LAN_PROFILE_GATE_VERSION,
      }),
      false
    );
  });

  it('skips LAN profile gate in local-only mode', () => {
    assert.equal(needsClinicalLanProfileGate({ clinicalLocalOnly: true }), false);
    assert.equal(isClinicalLocalOnlyMode({ clinicalLocalOnly: true }), true);
    assert.equal(isClinicalSyncModeChosen({ clinicalLocalOnly: false }), true);
    assert.equal(isClinicalSyncModeChosen({}), false);
  });

  it('detects local-only placeholder @usuario', () => {
    assert.equal(isLocalOnlyPlaceholderUsername('local_abc123'), true);
    assert.equal(isLocalOnlyPlaceholderUsername('drmendoza'), false);
  });

  it('needsClinicalSyncModeChoice before DB session (local-first boot)', () => {
    const store = { 'rpc-settings': '{}' };
    const ls = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    const prevWin = globalThis.window;
    const prevLs = globalThis.localStorage;
    globalThis.localStorage = ls;
    globalThis.window = {
      electronAPI: { dbClinicalLoadAll: async () => ({ ok: true, blobs: {} }) },
    };
    try {
      assert.equal(needsClinicalSyncModeChoice(), true);
      store['rpc-settings'] = JSON.stringify({ clinicalRegistered: true });
      assert.equal(needsClinicalSyncModeChoice(), false);
      store['rpc-settings'] = JSON.stringify({ clinicalLocalOnly: true });
      assert.equal(needsClinicalSyncModeChoice(), false);
    } finally {
      if (prevWin === undefined) delete globalThis.window;
      else globalThis.window = prevWin;
      if (prevLs === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevLs;
    }
  });

  it('setClinicalSyncModeLocalOnly sets clinicalLocalOnly on settings object', () => {
    const store = { 'rpc-settings': '{}' };
    const ls = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    const prev = globalThis.localStorage;
    globalThis.localStorage = ls;
    try {
      setClinicalSyncModeLocalOnly(false);
      assert.equal(JSON.parse(store['rpc-settings']).clinicalLocalOnly, false);
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });

  it('sync mode choice offers Nube, existing account, and offline paths', () => {
    const shellSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-shell.mjs'),
      'utf8'
    );
    assert.match(shellSrc, /data-sync-mode="nube"/);
    assert.match(shellSrc, /data-sync-mode="existing"/);
    assert.match(shellSrc, /data-sync-mode="local"/);
    assert.match(shellSrc, /Ya tengo cuenta/);
  });

  it('existing account path gates login until profile is persisted', async () => {
    const { needsExistingAccountLogin } = await import('./clinical-onboarding-existing-login.mjs');
    const store = { 'rpc-settings': '{}' };
    const ls = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    const prevLs = globalThis.localStorage;
    globalThis.localStorage = ls;
    try {
      setClinicalExistingAccountPath(true);
      assert.equal(needsExistingAccountLogin(), true);
      store['rpc-settings'] = JSON.stringify({
        clinicalOnboardingExistingAccount: true,
        clinicalRegistered: true,
        clinicalUsername: 'drmendoza',
        clinicalDisplayName: 'Dr. Mendoza',
        clinicalSala: 'Sala 1',
        clinicalLanProfileGateVersion: CLINICAL_LAN_PROFILE_GATE_VERSION,
      });
      assert.equal(needsExistingAccountLogin(), false);
    } finally {
      if (prevLs === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevLs;
    }
  });

  it('stored cloud token resume uses auth/me when local handle is machine id', () => {
    const loginSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-existing-login.mjs'),
      'utf8'
    );
    const renderSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-render.mjs'),
      'utf8'
    );
    assert.match(loginSrc, /export async function tryResumeOnboardingFromStoredCloudToken/);
    assert.match(loginSrc, /client\.me\(\)/);
    assert.match(loginSrc, /isLegacyMachineUsername/);
    assert.match(renderSrc, /tryResumeOnboardingFromStoredCloudToken/);
    assert.match(renderSrc, /getCloudSyncToken\(\)/);
  });

  it('boot onboarding resumes remember-me cloud session before showing registro', async () => {
    const mainSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-main.mjs'),
      'utf8'
    );
    const gatesSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-gates.mjs'),
      'utf8'
    );
    assert.match(mainSrc, /tryResumeOnboardingFromStoredCloudToken/);
    assert.match(gatesSrc, /hasTrustedCloudRememberMe/);
  });

  it('onboarding no longer mounts the 7.9 cutover wizard', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const renderSrc = readFileSync(join(here, 'clinical-onboarding-render.mjs'), 'utf8');
    const finishSrc = readFileSync(join(here, 'clinical-onboarding-cloud-finish.mjs'), 'utf8');
    const unlockSrc = readFileSync(join(here, 'db-unlock-completion.mjs'), 'utf8');
    const handlersSrc = readFileSync(join(here, 'clinical-onboarding-handlers.mjs'), 'utf8');
    const nubeSrc = readFileSync(join(here, 'clinical-onboarding-nube.mjs'), 'utf8');
    for (const [name, src] of [
      ['render', renderSrc],
      ['cloud-finish', finishSrc],
      ['unlock', unlockSrc],
      ['handlers', handlersSrc],
      ['nube', nubeSrc],
    ]) {
      assert.doesNotMatch(src, /cutover/i, `${name} still mentions cutover`);
    }
    assert.match(finishSrc, /export async function finishOnboardingCloud/);
    assert.match(finishSrc, /registerCloudDuringOnboarding/);
  });

  it('needsTeamOnboarding is false for R4 and Admin without a team', () => {
    const prevUser = clinicalSessionContext.user;
    const prevTeams = clinicalSessionContext.teams;
    try {
      clinicalSessionContext.user = { user_id: 'r4-1', rank: 'R4' };
      clinicalSessionContext.teams = [];
      assert.equal(needsTeamOnboarding(), false);
      clinicalSessionContext.user = { user_id: 'adm-1', rank: 'Admin' };
      assert.equal(needsTeamOnboarding(), false);
      clinicalSessionContext.user = { user_id: 'r2-1', rank: 'R2' };
      assert.equal(needsTeamOnboarding(), true);
    } finally {
      clinicalSessionContext.user = prevUser;
      clinicalSessionContext.teams = prevTeams;
    }
  });
});
