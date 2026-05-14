import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// storage.js reads localStorage lazily inside its methods, so reasignar
// global.localStorage en beforeEach es suficiente; no requiere reimport.
let store = {};
const mock = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};
global.localStorage = mock;
global.window = { localStorage: mock };

const { storage } = await import('./storage.js');

describe('storage todos', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  describe('getTodos', () => {
    it('returns [] when no todos stored', () => {
      assert.deepStrictEqual(storage.getTodos('p1'), []);
    });

    it('returns [] for invalid JSON', () => {
      store['rpc-todos'] = '{not json';
      assert.deepStrictEqual(storage.getTodos('p1'), []);
    });

    it('returns the todos for the patient', () => {
      const todos = [{ id: 'a', text: 't', completed: false, priority: 'alta', createdAt: '2026-05-13T10:00:00.000Z' }];
      store['rpc-todos'] = JSON.stringify({ p1: todos });
      assert.deepStrictEqual(storage.getTodos('p1'), todos);
    });

    it('normalizes missing priority to "media"', () => {
      store['rpc-todos'] = JSON.stringify({ p1: [{ id: 'a', text: 't', completed: false }] });
      const result = storage.getTodos('p1');
      assert.strictEqual(result[0].priority, 'media');
    });

    it('maps legacy "normal" priority to "media"', () => {
      store['rpc-todos'] = JSON.stringify({ p1: [{ id: 'a', text: 't', completed: false, priority: 'normal' }] });
      assert.strictEqual(storage.getTodos('p1')[0].priority, 'media');
    });

    it('coerces completed to boolean', () => {
      store['rpc-todos'] = JSON.stringify({ p1: [{ id: 'a', text: 't', completed: 1, priority: 'baja' }] });
      assert.strictEqual(storage.getTodos('p1')[0].completed, true);
    });
  });

  describe('saveTodos', () => {
    it('saves todos for the patient', () => {
      const todos = [{ id: '1', text: 'x', completed: false, priority: 'media', createdAt: '' }];
      storage.saveTodos('p1', todos);
      assert.deepStrictEqual(JSON.parse(store['rpc-todos']).p1, todos);
    });

    it('preserves entries for other patients', () => {
      store['rpc-todos'] = JSON.stringify({ p2: [{ id: 'x', text: 'y', completed: true, priority: 'media', createdAt: '' }] });
      storage.saveTodos('p1', [{ id: '1', text: 'a', completed: false, priority: 'alta', createdAt: '' }]);
      const obj = JSON.parse(store['rpc-todos']);
      assert.strictEqual(obj.p1.length, 1);
      assert.strictEqual(obj.p2.length, 1);
    });

    it('does NOT write for demo- patients', () => {
      storage.saveTodos('demo-foo', [{ id: '1', text: 'a', completed: false, priority: 'media', createdAt: '' }]);
      assert.strictEqual(store['rpc-todos'], undefined);
    });
  });
});

describe('lan config', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('persists and reads LAN config', () => {
    const cfg = { hostUrl: 'http://192.168.1.10:3738', teamCode: 'testcode' };
    storage.saveLanConfig(cfg);
    assert.deepStrictEqual(storage.getLanConfig(), cfg);
  });

  it('persists and reads host patient map', () => {
    storage.saveHostPatientMap({ a: 'b' });
    assert.deepStrictEqual(storage.getHostPatientMap(), { a: 'b' });
  });

  it('clears LAN config when saveLanConfig(null)', () => {
    storage.saveLanConfig({ hostUrl: 'http://x', teamCode: 'y' });
    storage.saveLanConfig(null);
    assert.strictEqual(storage.getLanConfig(), null);
  });
});
