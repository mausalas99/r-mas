import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCloudMobileClient } from './origin.mjs';

describe('isCloudMobileClient', () => {
  it('detects /mobile/ pathname', () => {
    const prev = globalThis.location;
    globalThis.location = { pathname: '/mobile/', search: '' };
    try {
      assert.equal(isCloudMobileClient(), true);
    } finally {
      globalThis.location = prev;
    }
  });

  it('detects __RPC_CLOUD_MOBILE__ flag', () => {
    const prev = globalThis.__RPC_CLOUD_MOBILE__;
    globalThis.__RPC_CLOUD_MOBILE__ = true;
    try {
      assert.equal(isCloudMobileClient(), true);
    } finally {
      globalThis.__RPC_CLOUD_MOBILE__ = prev;
    }
  });
});
