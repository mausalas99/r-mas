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
import { needsClinicalSyncModeChoice, needsTeamOnboarding } from './clinical-onboarding.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';

describe('clinical-onboarding helpers', () => {
  it('detects legacy username for onboarding gate', () => {
    assert.equal(isLegacyMachineUsername('lc_device_x', 'lc_device_x'), true);
    assert.equal(isLegacyMachineUsername('mgarcia', 'lc_device_x'), false);
  });

  it('requires LAN profile gate until version 6.6.6 is recorded', () => {
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

  it('registration shows connect-needed message when LAN push returns NO_LAN', () => {
    const onboardingSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-onboarding.mjs'),
      'utf8'
    );
    assert.match(onboardingSrc, /LAN_PROFILE_NEEDS_CONNECT_MSG/);
    assert.match(onboardingSrc, /isLanProfileNeedsConnectCode\(lanPush\.code\)/);
    assert.match(onboardingSrc, /toast\(LAN_PROFILE_NEEDS_CONNECT_MSG, 'info'\)/);
    assert.match(onboardingSrc, /!localOnly[\s\S]*isLanProfileNeedsConnectCode/);
  });
});
