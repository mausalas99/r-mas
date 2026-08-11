import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isClinicalRepoEventualidadesEnabled,
  setClinicalRepoEventualidadesEnabled,
  CLINICAL_REPO_EVENTUALIDADES_LS_KEY,
} from './clinical-repo-flag.mjs';

describe('clinical-repo-flag', () => {
  const prevEnv = process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES;
  /** @type {Map<string, string>} */
  let store;

  beforeEach(() => {
    delete process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES;
    store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      },
    };
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES;
    else process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES = prevEnv;
    delete globalThis.localStorage;
  });

  it('defaults off', () => {
    assert.equal(isClinicalRepoEventualidadesEnabled(), false);
  });

  it('enables via localStorage', () => {
    setClinicalRepoEventualidadesEnabled(true);
    assert.equal(store.get(CLINICAL_REPO_EVENTUALIDADES_LS_KEY), '1');
    assert.equal(isClinicalRepoEventualidadesEnabled(), true);
    setClinicalRepoEventualidadesEnabled(false);
    assert.equal(isClinicalRepoEventualidadesEnabled(), false);
  });

  it('enables via env', () => {
    process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES = '1';
    assert.equal(isClinicalRepoEventualidadesEnabled(), true);
  });
});
