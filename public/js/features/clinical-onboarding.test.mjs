import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isLegacyMachineUsername } from '../clinical-username.mjs';

describe('clinical-onboarding helpers', () => {
  it('detects legacy username for onboarding gate', () => {
    assert.equal(isLegacyMachineUsername('lc_device_x', 'lc_device_x'), true);
    assert.equal(isLegacyMachineUsername('mgarcia', 'lc_device_x'), false);
  });
});
