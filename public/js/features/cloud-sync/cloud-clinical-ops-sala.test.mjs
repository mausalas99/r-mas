import { describe, it, beforeEach } from 'node:test';
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
});
