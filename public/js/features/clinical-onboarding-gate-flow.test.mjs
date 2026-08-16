import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLINICAL_LAN_PROFILE_GATE_VERSION } from '../clinical-settings.mjs';
import {
  needsClinicalOnboarding,
  needsTeamOnboardingStep,
  needsOnboardingShell,
} from './clinical-onboarding.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';

describe('clinical-onboarding gate flow', () => {
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
    assert.match(handlersSrc, /PROFILE_NEEDS_CONNECT_MSG/);
    assert.match(handlersSrc, /isProfileNeedsConnectCode\(lanPush\.code\)/);
    assert.match(handlersSrc, /toast\(PROFILE_NEEDS_CONNECT_MSG, 'info'\)/);
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

  it('local-only shows confirm screen with back to sync mode choice', () => {
    const renderSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-render.mjs'),
      'utf8'
    );
    const handlersSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-handlers.mjs'),
      'utf8'
    );
    assert.match(renderSrc, /renderLocalOnlyConfirmPanel/);
    assert.match(renderSrc, /clinical-onboard-local-confirm-btn/);
    assert.match(renderSrc, /clinical-onboard-mode-back-btn/);
    assert.match(handlersSrc, /handleLocalOnlyConfirmClick/);
    assert.match(handlersSrc, /submitLocalOnlyProfile/);
  });

  it('profile and existing-login steps offer Cambiar modo back to step 1', () => {
    const renderSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-render.mjs'),
      'utf8'
    );
    const syncSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding-sync-mode.mjs'),
      'utf8'
    );
    assert.match(renderSrc, /clinical-onboard-mode-back-btn/);
    assert.match(syncSrc, /wireOnboardingModeBackButtons/);
    assert.match(syncSrc, /handleSyncModeBack/);
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
