import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getHostBundleBases,
  setHostBundleBases,
  hostBundlePutBodyFromEnvelope,
} from './host-bundle-bases.mjs';

test('host bundle bases round-trip and PUT body', () => {
  global.localStorage = {
    _d: {},
    getItem(k) {
      return this._d[k] ?? null;
    },
    setItem(k, v) {
      this._d[k] = v;
    },
    removeItem(k) {
      delete this._d[k];
    },
  };
  setHostBundleBases('r1', { revision: 3, entityVersions: { 't:p1:t1': 2 } });
  const bases = getHostBundleBases('r1');
  assert.equal(bases.revision, 3);
  const body = hostBundlePutBodyFromEnvelope('r1', {
    clientId: 'c1',
    agenda: [],
    todos: { p1: [{ id: 't1', text: 'x' }] },
  });
  assert.equal(body.baseRevision, 3);
  assert.equal(body.baseEntityVersions['t:p1:t1'], 2);
});
