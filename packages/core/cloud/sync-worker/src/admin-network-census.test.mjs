import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoomState } from './crypto-at-rest.js';
import { currentRoomsBySala, handleNetworkCensus } from './admin.js';

const TEST_KEY = { WORKER_DATA_KEY: 'cd'.repeat(32) };

describe('currentRoomsBySala', () => {
  it('picks the highest turn_key per sala', () => {
    const rows = [
      { id: 'r1', sala: 'Sala 1', turn_key: '2026-07', revision: 5 },
      { id: 'r2', sala: 'Sala 1', turn_key: '2026-09', revision: 1 },
    ];
    assert.equal(currentRoomsBySala(rows).get('Sala 1').id, 'r2');
  });

  it('breaks a turn_key tie by revision', () => {
    const rows = [
      { id: 'r1', sala: 'Eme', turn_key: '2026-09', revision: 2 },
      { id: 'r2', sala: 'Eme', turn_key: '2026-09', revision: 9 },
    ];
    assert.equal(currentRoomsBySala(rows).get('Eme').id, 'r2');
  });

  it('ignores rows whose sala is not a known CLOUD_SALAS value', () => {
    const rows = [{ id: 'r1', sala: 'Sala Fantasma', turn_key: '2026-09', revision: 1 }];
    assert.equal(currentRoomsBySala(rows).size, 0);
  });
});

/** Minimal D1 fake backing `rooms` (network-census query) + `room_state` (loadRoomState). */
function fakeDb(rooms, stateByRoomId) {
  return {
    prepare(sql) {
      const run = (args) => ({
        async first() {
          if (sql.includes('FROM room_state')) {
            return stateByRoomId.get(args[0]) || null;
          }
          return null;
        },
        async all() {
          if (sql.startsWith('SELECT id, sala, code, turn_key')) {
            return { results: rooms };
          }
          return { results: [] };
        },
      });
      return { ...run([]), bind: (...args) => run(args) };
    },
  };
}

describe('handleNetworkCensus', () => {
  it('returns one row per sala, with decryptable state and the wrapped dek passed through', async () => {
    const encoded = await encodeRoomState(TEST_KEY, { entries: [{ id: 'p1', fields: { nombre: 'PEREZ' } }] });
    const rooms = [
      {
        id: 'room-a',
        sala: 'Área A/Pensionistas',
        code: 'AAAA',
        turn_key: '2026-09',
        revision: 1,
        wrapped_dek_ct: 'CT',
        wrapped_dek_iv: 'IV',
        wrapped_dek_salt: 'SALT',
      },
    ];
    const states = new Map([['room-a', { ciphertext: encoded.ciphertext, iv: encoded.iv }]]);
    const res = await handleNetworkCensus(TEST_KEY, fakeDb(rooms, states));
    const body = await res.json();
    assert.equal(body.salas.length, 8);
    const row = body.salas.find((s) => s.sala === 'Área A/Pensionistas');
    assert.equal(row.roomId, 'room-a');
    assert.deepEqual(row.dek, { ct: 'CT', iv: 'IV', salt: 'SALT' });
    assert.equal(row.state.entries[0].fields.nombre, 'PEREZ');
  });

  it('gives a sala with no current room an error row instead of throwing', async () => {
    const res = await handleNetworkCensus(TEST_KEY, fakeDb([], new Map()));
    const body = await res.json();
    assert.equal(body.salas.length, 8);
    assert.ok(body.salas.every((s) => s.error));
  });

  it('dek is null when the room never set one', async () => {
    const encoded = await encodeRoomState(TEST_KEY, { entries: [] });
    const rooms = [{ id: 'room-b', sala: 'Eme', code: 'BBBB', turn_key: '2026-09', revision: 1 }];
    const states = new Map([['room-b', { ciphertext: encoded.ciphertext, iv: encoded.iv }]]);
    const res = await handleNetworkCensus(TEST_KEY, fakeDb(rooms, states));
    const body = await res.json();
    assert.equal(body.salas.find((s) => s.sala === 'Eme').dek, null);
  });
});
