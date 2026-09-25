import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { isCloudSala, normalizeCloudSala, CLOUD_SALAS } from './sala-allowlist.js';
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
  it('accepts all clinical wards on Nube', () => {
    const allowed = [
      'Sala 1',
      'Sala 2',
      'Sala E',
      'Torre HU',
      'torre-hu',
      'Interconsultas',
      'UX',
      'Eme',
      'Área A/Pensionistas',
    ];
    for (const sala of allowed) {
      assert.equal(isCloudSala(sala), true, sala);
      assert.ok(CLOUD_SALAS.includes(normalizeCloudSala(sala)), sala);
    }
  });
});


describe('validateCloudSalaForRoom (ensure-turn gate)', () => {
  it('accepts all clinical wards', () => {
    const allowed = ['Sala 1', 'Interconsultas', 'UX', 'Eme', 'Área A/Pensionistas', 'torre-hu'];
    for (const sala of allowed) {
      assert.equal(validateCloudSalaForRoom(sala), normalizeCloudSala(sala), sala);
    }
  });

  it('rejects missing sala', () => {
    assert.throws(() => validateCloudSalaForRoom(''), SyncError);
    assert.throws(() => validateCloudSalaForRoom(null), SyncError);
  });
});
