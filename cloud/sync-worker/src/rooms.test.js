import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.js';
import { emptyRoomState, randomRoomCode, validateCloudSalaForRoom } from './rooms.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('randomRoomCode', () => {
  it('returns requested length', () => {
    assert.equal(randomRoomCode().length, 6);
    assert.equal(randomRoomCode(8).length, 8);
  });

  it('uses unambiguous alphabet only', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomRoomCode(12);
      assert.match(code, /^[A-Z2-9]+$/);
      for (const ch of code) {
        assert.ok(ROOM_CODE_ALPHABET.includes(ch), `unexpected char: ${ch}`);
      }
    }
  });
});

describe('emptyRoomState', () => {
  it('matches expected initial shape', () => {
    assert.deepEqual(emptyRoomState(), {
      revision: 0,
      entries: [],
      entityVersions: {},
      todos: {},
      agenda: [],
      clinicalOps: null,
      labSidecars: {},
    });
  });
});

describe('create sala gate', () => {
  it('rejects LAN-only salas for cloud create', () => {
    const rejected = ['Interconsultas', 'UX', 'Eme', 'Área A/Pensionistas'];
    for (const sala of rejected) {
      assert.equal(isCloudSala(sala), false, sala);
    }
  });

  it('accepts normalized cloud salas', () => {
    const allowed = ['Sala', 'Sala 1', 'Torre HU', 'torre-hu'];
    for (const sala of allowed) {
      assert.equal(isCloudSala(sala), true, sala);
      assert.ok(['Sala', 'Torre HU'].includes(normalizeCloudSala(sala)));
    }
  });
});


describe('validateCloudSalaForRoom (ensure-turn gate)', () => {
  it('rejects LAN-only salas', () => {
    const rejected = ['Interconsultas', 'UX', 'Eme', 'Área A/Pensionistas'];
    for (const sala of rejected) {
      assert.throws(() => validateCloudSalaForRoom(sala), (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'invalid_request');
        return true;
      }, sala);
    }
  });

  it('accepts cloud salas and normalizes', () => {
    assert.equal(validateCloudSalaForRoom('Sala 1'), 'Sala');
    assert.equal(validateCloudSalaForRoom('torre-hu'), 'Torre HU');
  });

  it('rejects missing sala', () => {
    assert.throws(() => validateCloudSalaForRoom(''), SyncError);
    assert.throws(() => validateCloudSalaForRoom(null), SyncError);
  });
});
