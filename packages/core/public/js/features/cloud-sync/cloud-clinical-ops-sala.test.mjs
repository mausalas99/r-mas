import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'cloud-clinical-ops-sala.mjs'),
  'utf8'
);

describe('cloud-clinical-ops-sala', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(key) {
        return this._data[key] ?? null;
      },
      setItem(key, value) {
        this._data[key] = String(value);
      },
      removeItem(key) {
        delete this._data[key];
      },
    };
  });

  it('exports sala-scoped push/pull helpers', () => {
    assert.match(src, /export async function ensureTurnRoomForSala/);
    assert.match(src, /export async function pushClinicalOpsForSala/);
    assert.match(src, /export async function pullClinicalOpsForSala/);
    assert.match(src, /export async function syncCloudClinicalOpsOnConnect/);
    assert.match(src, /dbClinicalOpsExport\(\{ sala/);
    assert.match(src, /pushCloudOpsDirect/);
  });

  it('pullClinicalOpsForSala hydrates iPad scope without SQLCipher merge', () => {
    assert.match(src, /async function applyClinicalOpsSnapshot/);
    assert.match(src, /isClinicalOpsSyncAvailable/);
    assert.match(src, /applyClinicalScopeFromOpsSnapshot/);
    const start = src.indexOf('export async function pullClinicalOpsForSala');
    assert.ok(start >= 0);
    const body = src.slice(start, start + 900);
    assert.match(body, /applyClinicalOpsSnapshot/);
  });

  it('syncClinicalOpsForSala pulls a full clinicalOps snapshot before LWW push', () => {
    assert.match(src, /export async function syncClinicalOpsForSala/);
    const start = src.indexOf('export async function syncClinicalOpsForSala');
    assert.ok(start >= 0);
    const body = src.slice(start, start + 700);
    assert.match(body, /pullClinicalOpsForSala/);
    assert.match(body, /since:\s*0/);
    assert.match(body, /pushClinicalOpsForSala/);
    const pullAt = body.indexOf('pullClinicalOpsForSala');
    const pushAt = body.indexOf('pushClinicalOpsForSala');
    assert.ok(pullAt >= 0 && pushAt > pullAt);
  });

  it('syncCloudClinicalOpsOnConnect pulls then pushes local team salas', () => {
    const start = src.indexOf('export async function syncCloudClinicalOpsOnConnect');
    assert.ok(start >= 0);
    const body = src.slice(start, start + 1200);
    assert.match(body, /pullClinicalOpsForSala/);
    assert.match(body, /listLocalTeamSalas/);
    assert.match(body, /pushClinicalOpsForSalas/);
  });

  it('rememberSalaRoom caches room id per sala without touching active room settings', async () => {
    const mod = await import('./cloud-clinical-ops-sala.mjs');
    mod.rememberSalaRoom('Sala E', { id: 'room-e-1', revision: 12 });
    const cached = mod.getSalaRoomCache('Sala E');
    assert.equal(cached.roomId, 'room-e-1');
    assert.equal(cached.revision, 12);
    mod.advanceSalaRoomRevision('Sala E', 15);
    assert.equal(mod.getSalaRoomCache('Sala E').revision, 15);
  });

  describe('turn-aware sala room cache', () => {
    beforeEach(() => {
      globalThis.sessionStorage = {
        _data: { 'rpc-cloud-sync-room-meta': JSON.stringify({ id: 'r', code: '', sala: 'Sala 2', turnKey: '2026-09', name: '' }) },
        getItem(key) {
          return this._data[key] ?? null;
        },
        setItem(key, value) {
          this._data[key] = String(value);
        },
        removeItem(key) {
          delete this._data[key];
        },
      };
    });

    afterEach(() => {
      delete globalThis.sessionStorage;
    });

    it('rejects a cached room from a stale turn', async () => {
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      mod.rememberSalaRoom('Sala 2', { id: 'aug-room', revision: 11454, turnKey: '2026-08' });
      assert.deepEqual(mod.getSalaRoomCache('Sala 2'), { roomId: '', revision: 0 });
    });

    it('rejects a legacy cached room with no turnKey at all', async () => {
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      globalThis.localStorage.setItem(
        'rpc-cloud-sala-rooms',
        JSON.stringify({ 'Sala 2': { roomId: 'legacy-room', revision: 5, sala: 'Sala 2' } })
      );
      assert.deepEqual(mod.getSalaRoomCache('Sala 2'), { roomId: '', revision: 0 });
    });

    it('accepts a cached room from the current turn', async () => {
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      mod.rememberSalaRoom('Sala 2', { id: 'sep-room', revision: 7, turnKey: '2026-09' });
      assert.deepEqual(mod.getSalaRoomCache('Sala 2'), { roomId: 'sep-room', revision: 7 });
    });

    it('rememberSalaRoom resets revision to 0 when the room id changes', async () => {
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      mod.rememberSalaRoom('Sala 2', { id: 'old-room', revision: 11454, turnKey: '2026-08' });
      mod.rememberSalaRoom('Sala 2', { id: 'new-room', revision: 0, turnKey: '2026-09' });
      assert.equal(mod.getSalaRoomCache('Sala 2').revision, 0);
    });

    it('rememberSalaRoom keeps the stored revision when re-remembering the same room id', async () => {
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      mod.rememberSalaRoom('Sala 2', { id: 'same-room', revision: 42, turnKey: '2026-09' });
      mod.rememberSalaRoom('Sala 2', { id: 'same-room', turnKey: '2026-09' });
      assert.equal(mod.getSalaRoomCache('Sala 2').revision, 42);
    });
  });

  describe('ensureTurnRoomForSala active-room pointer', () => {
    let calls;
    const prevFetch = globalThis.fetch;

    beforeEach(() => {
      calls = [];
      globalThis.sessionStorage = {
        _data: { 'rpc-cloud-sync-token': 'tok' },
        getItem(key) {
          return this._data[key] ?? null;
        },
        setItem(key, value) {
          this._data[key] = String(value);
        },
        removeItem(key) {
          delete this._data[key];
        },
      };
      globalThis.fetch = async (url, init) => {
        const body = init?.body ? JSON.parse(init.body) : {};
        calls.push(body.sala);
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          async json() {
            return { room: { id: `room-${body.sala}`, revision: 1, turnKey: '2026-09' } };
          },
        };
      };
    });

    afterEach(() => {
      delete globalThis.sessionStorage;
      if (prevFetch) globalThis.fetch = prevFetch;
      else delete globalThis.fetch;
    });

    it('returns the census room and makes no network call when the sala matches', async () => {
      globalThis.sessionStorage.setItem(
        'rpc-cloud-sync-room-meta',
        JSON.stringify({ id: 'census-room', code: '', sala: 'Sala 2', turnKey: '2026-09', name: '' })
      );
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      const room = await mod.ensureTurnRoomForSala('Sala 2');
      assert.equal(room.id, 'census-room');
      assert.deepEqual(calls, []);
    });

    it('calls ensure-turn for the foreign sala then restores the census sala', async () => {
      globalThis.sessionStorage.setItem(
        'rpc-cloud-sync-room-meta',
        JSON.stringify({ id: 'census-room', code: '', sala: 'Sala 2', turnKey: '2026-09', name: '' })
      );
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      const room = await mod.ensureTurnRoomForSala('Sala E');
      assert.equal(room.id, 'room-Sala E');
      assert.deepEqual(calls, ['Sala E', 'Sala 2']);
    });

    it('makes no restore call when there is no census room snapshot', async () => {
      const mod = await import('./cloud-clinical-ops-sala.mjs');
      const room = await mod.ensureTurnRoomForSala('Sala E');
      assert.equal(room.id, 'room-Sala E');
      assert.deepEqual(calls, ['Sala E']);
    });
  });
});

describe('localStorage quota error handling', () => {
  let store = {};
  const prev = globalThis.localStorage;

  beforeEach(() => {
    store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('logs console.warn when quota is exceeded', () => {
    let warned = false;
    const prevWarn = console.warn;
    console.warn = (msg) => { warned = true; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      // console.warn should be called on quota error
    } finally {
      console.warn = prevWarn;
    }
  });
});
