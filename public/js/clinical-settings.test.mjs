import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_LAN_PROFILE_GATE_VERSION,
  ensureLanProfileGateDeviceReset,
  needsClinicalLanProfileGate,
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

  it('bumps gate to 6.6.6 and clears cached username/display when pending', () => {
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
});
