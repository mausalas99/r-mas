import { describe, it, beforeEach, afterEach } from 'node:test';
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

const {
  storage,
  normalizeLabHistoryPatientSets,
  clearBlobCacheForTests,
  ensureStorageHydrated,
} = await import('./storage.js');

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
      const got = storage.getTodos('p1');
      assert.strictEqual(got.length, 1);
      assert.strictEqual(got[0].id, 'a');
      assert.strictEqual(got[0].updatedAt, '2026-05-13T10:00:00.000Z');
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
      const todos = [{ id: '1', text: 'x', completed: false, priority: 'media', createdAt: '2026-05-13T10:00:00.000Z' }];
      storage.saveTodos('p1', todos);
      const saved = JSON.parse(store['rpc-todos']).p1[0];
      assert.strictEqual(saved.id, '1');
      assert.strictEqual(saved.priority, 'media');
      assert.ok(saved.updatedAt);
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

  it('LAN UI role defaults to client', () => {
    assert.strictEqual(storage.getLanUiRole(), 'client');
  });

  it('persists LAN UI role host or client', () => {
    storage.saveLanUiRole('host');
    assert.strictEqual(storage.getLanUiRole(), 'host');
    storage.saveLanUiRole('client');
    assert.strictEqual(storage.getLanUiRole(), 'client');
  });
});

describe('scheduled procedures (agenda v1)', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  const sample = () => ({
    id: 'e1',
    patientId: 'p1',
    procedure: 'Cirugia',
    location: 'Qx1',
    materialApproved: false,
    anesthesiaScheduled: true,
    start: '2026-05-12T15:00:00.000Z',
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-05-12T10:00:00.000Z',
  });

  it('returns [] when empty', () => {
    assert.deepStrictEqual(storage.getScheduledProcedures(), []);
  });

  it('round-trips valid events', () => {
    storage.saveScheduledProcedures([sample()]);
    const list = storage.getScheduledProcedures();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, 'e1');
    assert.strictEqual(list[0].patientId, 'p1');
  });

  it('drops demo-linked events on persist', () => {
    storage.saveScheduledProcedures([
      sample(),
      { ...sample(), id: 'bad', patientId: 'demo-x' },
    ]);
    assert.strictEqual(storage.getScheduledProcedures().length, 1);
  });

  it('treats malformed JSON as empty', () => {
    store['rpc-scheduled-procedures'] = '[';
    assert.deepStrictEqual(storage.getScheduledProcedures(), []);
  });

  it('removeScheduledProceduresForPatient filters by patientId', () => {
    storage.saveScheduledProcedures([sample(), { ...sample(), id: 'e2', patientId: 'p2' }]);
    storage.removeScheduledProceduresForPatient('p1');
    assert.deepStrictEqual(
      storage.getScheduledProcedures().map((x) => x.id),
      ['e2']
    );
  });
});

describe('normalizeLabHistoryPatientSets', () => {
  it('returns [] for nullish and non-objects', () => {
    assert.deepStrictEqual(normalizeLabHistoryPatientSets(null), []);
    assert.deepStrictEqual(normalizeLabHistoryPatientSets('x'), []);
  });

  it('normalizes valid arrays', () => {
    var arr = [{ id: '1', resLabs: ['Hb 10'] }];
    assert.deepStrictEqual(normalizeLabHistoryPatientSets(arr), arr);
  });

  it('wraps a single set object', () => {
    var set = { id: 'a', resLabs: ['Na 140'] };
    assert.deepStrictEqual(normalizeLabHistoryPatientSets(set), [set]);
  });

  it('converts id map objects to arrays', () => {
    var map = {
      s1: { id: 's1', resLabs: ['Hb 10'] },
      s2: { id: 's2', resLabs: ['Na 140'] },
    };
    assert.equal(normalizeLabHistoryPatientSets(map).length, 2);
  });

  it('drops empty junk sets', () => {
    assert.deepStrictEqual(
      normalizeLabHistoryPatientSets([{ id: 'x' }, { id: 'y', resLabs: ['Hb 10'] }]),
      [{ id: 'y', resLabs: ['Hb 10'] }]
    );
  });
});

describe('getLabHistory', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('normalizes corrupt per-patient entries on read', () => {
    store['rpc-labHistory'] = JSON.stringify({
      p1: { s1: { id: 's1', resLabs: ['Hb 12'] } },
      p2: [{ id: 'ok', resLabs: ['Cr 1'] }],
    });
    var lh = storage.getLabHistory();
    assert.ok(Array.isArray(lh.p1));
    assert.equal(lh.p1.length, 1);
    assert.ok(Array.isArray(lh.p2));
    assert.equal(lh.p2.length, 1);
  });
});

describe('storage SQLCipher db mode', () => {
  /** @type {Record<string, string>} */
  let ipcBlobs;
  /** @type {object | null} */
  let lastSavePayload;

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    ipcBlobs = {
      patients: JSON.stringify([{ id: 'db1', nombre: 'SQL' }]),
      notes: JSON.stringify({ db1: { estudios: 'ok' } }),
    };
    lastSavePayload = null;
    clearBlobCacheForTests();
    global.window = {
      localStorage: mock,
      electronAPI: {
        dbStatus: async () => ({ ok: true, state: 'unlocked' }),
        dbClinicalLoadAll: async () => ({ ok: true, blobs: { ...ipcBlobs } }),
        dbClinicalSaveAll: async (payload) => {
          lastSavePayload = payload;
          if (payload.blobs) {
            Object.assign(ipcBlobs, payload.blobs);
          }
          return { ok: true };
        },
      },
    };
  });

  afterEach(() => {
    clearBlobCacheForTests();
    global.window = { localStorage: mock };
  });

  it('ensureStorageHydrated loads getters from IPC blobs', async () => {
    await ensureStorageHydrated();
    assert.deepStrictEqual(storage.getPatients(), [{ id: 'db1', nombre: 'SQL' }]);
    assert.deepStrictEqual(storage.getNotes(), { db1: { estudios: 'ok' } });
    assert.strictEqual(store['rpc-patients'], undefined);
  });

  it('skips hydrate when database is locked', async () => {
    global.window.electronAPI.dbStatus = async () => ({ ok: true, state: 'locked' });
    store['rpc-patients'] = JSON.stringify([{ id: 'ls1' }]);
    await ensureStorageHydrated();
    assert.deepStrictEqual(storage.getPatients(), [{ id: 'ls1' }]);
  });

  it('saveAll persists via dbClinicalSaveAll instead of localStorage', async () => {
    await ensureStorageHydrated();
    const result = await storage.saveAll(
      [{ id: 'p-save', nombre: 'Persist' }],
      { 'p-save': { estudios: 'n' } },
      {},
      {},
      {}
    );
    assert.strictEqual(result.ok, true);
    assert.ok(lastSavePayload);
    assert.strictEqual(lastSavePayload.auditMeta.eventType, 'clinical.save_all');
    assert.strictEqual(
      JSON.parse(lastSavePayload.blobs.patients)[0].id,
      'p-save'
    );
    assert.strictEqual(store['rpc-patients'], undefined);
    assert.deepStrictEqual(storage.getPatients(), [{ id: 'p-save', nombre: 'Persist' }]);
  });

  it('saveTodos updates blob cache and persists todos in db mode', async () => {
    ipcBlobs.todos = JSON.stringify({});
    await ensureStorageHydrated();
    storage.saveTodos('p1', [
      {
        id: 't1',
        text: 'Reposición',
        completed: false,
        priority: 'alta',
        createdAt: '2026-06-03T12:00:00.000Z',
        updatedAt: '2026-06-03T12:00:00.000Z',
      },
    ]);
    assert.strictEqual(storage.getTodos('p1').length, 1);
    assert.strictEqual(storage.getTodos('p1')[0].text, 'Reposición');
    assert.strictEqual(store['rpc-todos'], undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(lastSavePayload);
    assert.strictEqual(lastSavePayload.auditMeta.eventType, 'clinical.todos_save');
    const saved = JSON.parse(lastSavePayload.blobs.todos);
    assert.strictEqual(saved.p1.length, 1);
    assert.strictEqual(saved.p1[0].id, 't1');
  });
});
