import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { seedCloudMobileClinicalUser } from './hydrate-identity.mjs';

function mockStorage() {
  const store = new Map();
  const api = {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
  };
  globalThis.localStorage = api;
  globalThis.sessionStorage = api;
}

describe('seedCloudMobileClinicalUser', () => {
  beforeEach(() => {
    mockStorage();
    clinicalSessionContext.user = null;
  });

  it('seeds username as session handle for clinicalOps match', () => {
    const seeded = seedCloudMobileClinicalUser({
      id: 'd1-uuid',
      username: 'drmendoza',
      displayName: 'Dr. Mendoza',
    });
    assert.equal(seeded?.username, 'drmendoza');
    assert.equal(clinicalSessionContext.user?.username, 'drmendoza');
    assert.equal(clinicalSessionContext.user?.clinical_name, 'Dr. Mendoza');
  });
});
