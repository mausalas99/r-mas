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
  setClinicalSyncModeLocalOnly,
} from '../clinical-settings.mjs';
import { needsClinicalOnboarding, needsClinicalSyncModeChoice, needsTeamOnboarding, needsTeamOnboardingStep, needsOnboardingShell } from './clinical-onboarding.mjs';
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
    const { setClinicalExistingAccountPath } = await import('../clinical-settings.mjs');
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

  it('skips registro when session already has a joined team', () => {
    const store = {
      'rpc-settings': JSON.stringify({
        clinicalRegistered: false,
        clinicalLocalOnly: false,
      }),
    };
    const ls = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    const prevUser = clinicalSessionContext.user;
    const prevTeams = clinicalSessionContext.teams;
    const prevWin = globalThis.window;
    const prevLs = globalThis.localStorage;
    globalThis.localStorage = ls;
    globalThis.window = {
      electronAPI: { dbClinicalLoadAll: async () => ({ ok: true, blobs: {} }) },
    };
    try {
      clinicalSessionContext.user = {
        user_id: 'r1-joined',
        rank: 'R1',
        username: 'drmauricios',
        clinical_name: 'Dr. Mauricio',
        sala: 'Sala 2',
      };
      clinicalSessionContext.teams = [
        {
          team_id: 'leslie',
          name: 'Dra. Leslie',
          members: [{ user_id: 'r1-joined', username: 'drmauricios' }],
        },
      ];
      assert.equal(needsClinicalOnboarding(), false);
      assert.equal(needsTeamOnboardingStep(), false);
      assert.equal(needsOnboardingShell(), false);
      const saved = JSON.parse(store['rpc-settings'] || '{}');
      assert.equal(saved.clinicalRegistered, true);
      assert.equal(saved.clinicalUsername, 'drmauricios');
    } finally {
      clinicalSessionContext.user = prevUser;
      clinicalSessionContext.teams = prevTeams;
      if (prevWin === undefined) delete globalThis.window;
      else globalThis.window = prevWin;
      if (prevLs === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevLs;
    }
  });

  it('needsTeamOnboardingStep after profile, before team join', () => {
    const store = {
      'rpc-settings': JSON.stringify({
        clinicalRegistered: true,
        clinicalLocalOnly: false,
        clinicalUsername: 'drmendoza',
        clinicalDisplayName: 'Dr Mendoza',
        clinicalSala: 'Sala 1',
        clinicalLanProfileGateVersion: CLINICAL_LAN_PROFILE_GATE_VERSION,
      }),
    };
    const ls = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    const prevUser = clinicalSessionContext.user;
    const prevTeams = clinicalSessionContext.teams;
    const prevWin = globalThis.window;
    const prevLs = globalThis.localStorage;
    globalThis.localStorage = ls;
    globalThis.window = {
      electronAPI: { dbClinicalLoadAll: async () => ({ ok: true, blobs: {} }) },
    };
    try {
      clinicalSessionContext.user = {
        user_id: 'r1-1',
        rank: 'R1',
        username: 'drmendoza',
        clinical_name: 'Dr Mendoza',
        sala: 'Sala 1',
      };
      clinicalSessionContext.teams = [];
      assert.equal(needsClinicalOnboarding(), false);
      assert.equal(needsTeamOnboardingStep(), true);
      assert.equal(needsOnboardingShell(), true);
      clinicalSessionContext.teams = [
        {
          team_id: 't1',
          name: 'Dr. Gutiérrez',
          members: [{ user_id: 'r1-1', rank: 'R1' }],
        },
      ];
      assert.equal(needsTeamOnboardingStep(), false);
      assert.equal(needsOnboardingShell(), false);
    } finally {
      clinicalSessionContext.user = prevUser;
      clinicalSessionContext.teams = prevTeams;
      if (prevWin === undefined) delete globalThis.window;
      else globalThis.window = prevWin;
      if (prevLs === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevLs;
    }
  });

  it('tour education defers until team onboarding step completes', () => {
    const eduSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'settings-help/tour-intro-education.mjs'),
      'utf8'
    );
    assert.match(eduSrc, /needsTeamOnboardingStep/);
    assert.match(eduSrc, /clinical-onboarding-active/);
  });

  it('registration shows connect-needed message when LAN push returns NO_LAN', () => {
    const handlersSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-handlers.mjs'),
      'utf8'
    );
    assert.match(handlersSrc, /LAN_PROFILE_NEEDS_CONNECT_MSG/);
    assert.match(handlersSrc, /isLanProfileNeedsConnectCode\(lanPush\.code\)/);
    assert.match(handlersSrc, /toast\(LAN_PROFILE_NEEDS_CONNECT_MSG, 'info'\)/);
    assert.match(handlersSrc, /refreshMainClinicalOnboardingIfNeeded/);
    assert.match(handlersSrc, /finishRegistrationLanSideEffects/);
  });

  it('modal registration form submit is wired again', () => {
    const regSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-registration.mjs'),
      'utf8'
    );
    assert.match(regSrc, /wireRegistrationFormOnce/);
    assert.match(regSrc, /handleClinicalRegistrationSubmit/);
  });

  it('local-only registered users skip onboarding gate', () => {
    const store = {
      'rpc-settings': JSON.stringify({ clinicalRegistered: true, clinicalLocalOnly: true }),
    };
    const ls = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    const prevUser = clinicalSessionContext.user;
    const prevWin = globalThis.window;
    const prevLs = globalThis.localStorage;
    globalThis.localStorage = ls;
    globalThis.window = {
      electronAPI: { dbClinicalLoadAll: async () => ({ ok: true, blobs: {} }) },
    };
    clinicalSessionContext.user = { user_id: 'local-1' };
    try {
      assert.equal(needsClinicalOnboarding(), false);
    } finally {
      clinicalSessionContext.user = prevUser;
      if (prevWin === undefined) delete globalThis.window;
      else globalThis.window = prevWin;
      if (prevLs === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevLs;
    }
  });

  it('local-only skips second profile screen', () => {
    const renderSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-render.mjs'),
      'utf8'
    );
    assert.equal(renderSrc.includes('renderLocalOnlyProfilePanel'), false);
    assert.match(renderSrc, /submitLocalOnlyProfile/);
  });

  it('registration submit resumes taken @usuario instead of bootstrapping a peer row', () => {
    const submitSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-registration-submit.mjs'),
      'utf8'
    );
    assert.match(submitSrc, /resumeClinicalIdentityByUsername/);
    assert.match(submitSrc, /never bootstrap a second peer_/i);
    assert.doesNotMatch(submitSrc, /retryBootstrapWithUsername_/);
  });

  it('resume requires an existing DB user and claim runs for legacy handles', () => {
    const handlersSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-handlers.mjs'),
      'utf8'
    );
    assert.match(handlersSrc, /lookupClinicalUserByUsername/);
    assert.match(handlersSrc, /shouldClaimClinicalUsername/);
    assert.equal(handlersSrc.includes('window.confirm('), false);
    assert.match(
      handlersSrc,
      /No encontramos @\$\{username\} en esta base de datos/
    );
  });
});
