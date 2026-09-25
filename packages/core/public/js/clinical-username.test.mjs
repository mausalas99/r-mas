import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUsernameFormat,
  normalizeUsername,
  shouldClaimClinicalUsername,
} from './clinical-username.mjs';
import * as rendererUsername from './clinical-username.mjs';
import * as libUsername from '../../lib/db/clinical-username.mjs';

describe('clinical-username (renderer)', () => {
  it('matches db validation rules', () => {
    assert.equal(isValidUsernameFormat('mgarcia'), true);
    assert.equal(normalizeUsername(' MGarcia '), 'mgarcia');
  });

  it('shouldClaimClinicalUsername when handle changes or row is legacy/local', () => {
    assert.equal(shouldClaimClinicalUsername('lc_device_a', 'drmendoza', 'lc_device_a'), true);
    assert.equal(shouldClaimClinicalUsername('lc_device_a', 'lc_device_a', 'lc_device_a'), true);
    assert.equal(shouldClaimClinicalUsername('local_abc123', 'local_abc123', 'x'), true);
    assert.equal(shouldClaimClinicalUsername('mgarcia', 'mgarcia', 'other-device'), false);
    assert.equal(shouldClaimClinicalUsername('mgarcia', 'msalas', 'other-device'), true);
  });

  it('stays in parity with lib/db/clinical-username.mjs', () => {
    const names = [
      'normalizeUsername',
      'isValidUsernameFormat',
      'isLegacyMachineUsername',
      'isDirectoryPendingUsername',
      'isRegisteredClinicalUser',
      'shouldClaimClinicalUsername',
    ];
    for (const name of names) {
      assert.equal(typeof rendererUsername[name], 'function');
      assert.equal(typeof libUsername[name], 'function');
    }
    assert.equal(libUsername.normalizeUsername(' @MGarcia '), rendererUsername.normalizeUsername(' @MGarcia '));
    assert.equal(
      libUsername.shouldClaimClinicalUsername('lc_a', 'lc_a', 'lc_a'),
      rendererUsername.shouldClaimClinicalUsername('lc_a', 'lc_a', 'lc_a')
    );
  });
});
