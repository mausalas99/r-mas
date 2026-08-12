import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isClinicalRepoEventualidadesEnabled,
  setClinicalRepoEventualidadesEnabled,
  CLINICAL_REPO_EVENTUALIDADES_LS_KEY,
  isClinicalRepoSyncProjectorEnabled,
  setClinicalRepoSyncProjectorEnabled,
  CLINICAL_REPO_SYNC_PROJECTOR_LS_KEY,
  isClinicalRepoPersistEnabled,
  setClinicalRepoPersistEnabled,
  CLINICAL_REPO_PERSIST_LS_KEY,
} from './clinical-repo-flag.mjs';

describe('clinical-repo-flag', () => {
  const prevEnv = process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES;
  const prevProjEnv = process.env.R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR;
  const prevPersistEnv = process.env.R_PLUS_CLINICAL_REPO_PERSIST;
  /** @type {Map<string, string>} */
  let store;

  beforeEach(() => {
    delete process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES;
    delete process.env.R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR;
    delete process.env.R_PLUS_CLINICAL_REPO_PERSIST;
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
    if (prevProjEnv === undefined) delete process.env.R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR;
    else process.env.R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR = prevProjEnv;
    if (prevPersistEnv === undefined) delete process.env.R_PLUS_CLINICAL_REPO_PERSIST;
    else process.env.R_PLUS_CLINICAL_REPO_PERSIST = prevPersistEnv;
    delete globalThis.localStorage;
  });

  it('eventualidades defaults on', () => {
    assert.equal(isClinicalRepoEventualidadesEnabled(), true);
  });

  it('eventualidades opt-out via localStorage 0', () => {
    setClinicalRepoEventualidadesEnabled(false);
    assert.equal(store.get(CLINICAL_REPO_EVENTUALIDADES_LS_KEY), '0');
    assert.equal(isClinicalRepoEventualidadesEnabled(), false);
    setClinicalRepoEventualidadesEnabled(true);
    assert.equal(isClinicalRepoEventualidadesEnabled(), true);
  });

  it('eventualidades env 0 overrides default on', () => {
    process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES = '0';
    assert.equal(isClinicalRepoEventualidadesEnabled(), false);
  });

  it('eventualidades env 1 keeps on', () => {
    process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES = '1';
    assert.equal(isClinicalRepoEventualidadesEnabled(), true);
  });

  it('syncProjector defaults on', () => {
    assert.equal(isClinicalRepoSyncProjectorEnabled(), true);
  });

  it('syncProjector opt-out via localStorage 0', () => {
    setClinicalRepoSyncProjectorEnabled(false);
    assert.equal(store.get(CLINICAL_REPO_SYNC_PROJECTOR_LS_KEY), '0');
    assert.equal(isClinicalRepoSyncProjectorEnabled(), false);
    setClinicalRepoSyncProjectorEnabled(true);
    assert.equal(isClinicalRepoSyncProjectorEnabled(), true);
  });

  it('syncProjector env 0 overrides default on', () => {
    process.env.R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR = '0';
    assert.equal(isClinicalRepoSyncProjectorEnabled(), false);
  });

  it('persist defaults off (separate from eventualidades)', () => {
    assert.equal(isClinicalRepoPersistEnabled(), false);
    process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES = '1';
    assert.equal(isClinicalRepoPersistEnabled(), false);
  });

  it('persist enables via localStorage', () => {
    setClinicalRepoPersistEnabled(true);
    assert.equal(store.get(CLINICAL_REPO_PERSIST_LS_KEY), '1');
    assert.equal(isClinicalRepoPersistEnabled(), true);
    setClinicalRepoPersistEnabled(false);
    assert.equal(isClinicalRepoPersistEnabled(), false);
  });

  it('persist enables via env', () => {
    process.env.R_PLUS_CLINICAL_REPO_PERSIST = '1';
    assert.equal(isClinicalRepoPersistEnabled(), true);
  });
});
