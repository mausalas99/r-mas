import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isHostOnCurrentSubnets } from './lan-network-roam.mjs';

describe('lan-network-roam', () => {
  it('isHostOnCurrentSubnets matches /24 prefix', () => {
    assert.equal(
      isHostOnCurrentSubnets('http://10.55.1.9:3738', ['10.55.1', '10.9.8']),
      true
    );
    assert.equal(
      isHostOnCurrentSubnets('http://10.55.2.9:3738', ['10.55.1', '10.9.8']),
      false
    );
    assert.equal(isHostOnCurrentSubnets('', ['10.55.1']), false);
    assert.equal(isHostOnCurrentSubnets('http://10.55.1.9:3738', []), false);
  });
});
