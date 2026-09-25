import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_LAN_PROFILE_GATE_VERSION,
  bundledWardShiftPin,
  bundledWardHostUrl,
  bundledWardInviteUrl,
  ensureLanProfileGateDeviceReset,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
} from './clinical-settings.mjs';

describe('clinical-settings LAN profile gate', () => {
  /** @type {Map<string, string>} */
  let memory;

  beforeEach(() => {
    memory = new Map();
    global.localStorage = {
      getItem(k) {
        return memory.has(k) ? memory.get(k) : null;
      },
      setItem(k, v) {
        memory.set(k, String(v));
      },
      removeItem(k) {
        memory.delete(k);
      },
    };
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('bumps gate to 7.9.0 and clears machine/placeholder username when pending', () => {
    memory.set(
      'rpc-settings',
      JSON.stringify({
        clinicalLanProfileGateVersion: '5.5.7',
        clinicalUsername: 'lc_old',
        clinicalDisplayName: 'Usuario',
        clinicalUserId: 'u1',
      })
    );
    assert.equal(needsClinicalLanProfileGate(), true);
    const next = ensureLanProfileGateDeviceReset();
    assert.equal(next.clinicalUsername, undefined);
    assert.equal(next.clinicalDisplayName, undefined);
    assert.equal(next.clinicalUserId, 'u1');
    const stored = JSON.parse(memory.get('rpc-settings') || '{}');
    assert.equal(stored.clinicalUsername, undefined);
  });

  it('keeps a valid claimed @usuario when gate is pending', () => {
    memory.set(
      'rpc-settings',
      JSON.stringify({
        clinicalLanProfileGateVersion: '5.5.7',
        clinicalUsername: 'drmauricios',
        clinicalDisplayName: 'Dr. Mauricio Salas',
        clinicalUserId: 'u1',
      })
    );
    assert.equal(needsClinicalLanProfileGate(), true);
    const next = ensureLanProfileGateDeviceReset();
    assert.equal(next.clinicalUsername, 'drmauricios');
    assert.equal(next.clinicalDisplayName, 'Dr. Mauricio Salas');
  });

  it('persistClinicalUserBinding records gate complete so re-render keeps @usuario', () => {
    memory.set(
      'rpc-settings',
      JSON.stringify({
        clinicalLanProfileGateVersion: '5.5.7',
        clinicalUsername: 'lc_old',
      })
    );
    persistClinicalUserBinding({
      username: 'mgarcia',
      displayName: 'Dr. García',
      registered: true,
      lanProfileGateComplete: true,
    });
    assert.equal(needsClinicalLanProfileGate(), false);
    const next = ensureLanProfileGateDeviceReset();
    assert.equal(next.clinicalUsername, 'mgarcia');
    assert.equal(next.clinicalDisplayName, 'Dr. García');
  });

  it('does not clear fields when gate already complete', () => {
    memory.set(
      'rpc-settings',
      JSON.stringify({
        clinicalLanProfileGateVersion: CLINICAL_LAN_PROFILE_GATE_VERSION,
        clinicalUsername: 'mgarcia',
        clinicalDisplayName: 'Dr. García',
      })
    );
    const next = ensureLanProfileGateDeviceReset();
    assert.equal(next.clinicalUsername, 'mgarcia');
    assert.equal(next.clinicalDisplayName, 'Dr. García');
  });

  it('auto-completes gate for devices that already finished registration', () => {
    memory.set(
      'rpc-settings',
      JSON.stringify({
        clinicalRegistered: true,
        clinicalUsername: 'mgarcia',
        clinicalDisplayName: 'Dr. García',
        clinicalSala: 'Sala 1',
        clinicalLanProfileGateVersion: '5.5.7',
      })
    );
    assert.equal(needsClinicalLanProfileGate(), false);
    const stored = JSON.parse(memory.get('rpc-settings') || '{}');
    assert.equal(stored.clinicalLanProfileGateVersion, CLINICAL_LAN_PROFILE_GATE_VERSION);
    assert.equal(stored.clinicalUsername, 'mgarcia');
  });
});

describe('bundledWardShiftPin', () => {
  it('returns June 2026 ward PIN', () => {
    const pin = bundledWardShiftPin();
    if (new Date().getFullYear() === 2026 && new Date().getMonth() === 5) {
      assert.equal(pin, '527953');
    } else {
      assert.equal(pin, '');
    }
  });
});

describe('bundledWardHostUrl', () => {
  it('returns ward LAN host base URL', () => {
    assert.equal(bundledWardHostUrl(), 'http://10.0.57.65:3738');
  });
});

describe('bundledWardInviteUrl', () => {
  it('returns ward sala invite for this release', () => {
    assert.equal(
      bundledWardInviteUrl(),
      'http://10.0.57.65:3738/join/req_5246cafe2d94?th=1407e41b'
    );
  });
});

