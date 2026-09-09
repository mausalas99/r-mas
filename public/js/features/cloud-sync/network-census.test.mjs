import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchNetworkCensus } from './network-census.mjs';
import { clearRoomDekCache } from './room-dek.mjs';
import { CLOUD_SALAS } from './sala-allowlist.mjs';

/** Fake server: one call, `adminNetworkCensus()`, returns every sala's row. */
function makeFakeApi(salas) {
  return {
    async adminNetworkCensus() {
      return { salas };
    },
  };
}

describe('fetchNetworkCensus', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('is a single request — no per-sala round trips', async () => {
    let calls = 0;
    const api = {
      async adminNetworkCensus() {
        calls += 1;
        return { salas: [] };
      },
    };
    await fetchNetworkCensus(api);
    assert.equal(calls, 1);
  });

  it('returns entries for a sala with a current room, dek: null', async () => {
    const salas = CLOUD_SALAS.map((sala) => ({ sala, error: 'Sin sala activa este mes.' }));
    const areaA = salas.find((s) => s.sala === 'Área A/Pensionistas');
    Object.assign(areaA, {
      error: undefined,
      roomId: 'r-a',
      code: 'AAAA',
      dek: null,
      state: { entries: [{ id: 'p1', fields: { nombre: 'PEREZ', cama: '3' } }] },
    });
    const census = await fetchNetworkCensus(makeFakeApi(salas));
    assert.equal(census.length, CLOUD_SALAS.length);
    const row = census.find((c) => c.sala === 'Área A/Pensionistas');
    assert.equal(row.entries.length, 1);
    assert.equal(row.entries[0].fields.nombre, 'PEREZ');
  });

  it('carries each room\'s clinicalOps through, for the Red tab team filter', async () => {
    const salas = CLOUD_SALAS.map((sala) => ({ sala, error: 'Sin sala activa este mes.' }));
    const sala1 = salas.find((s) => s.sala === 'Sala 1');
    Object.assign(sala1, {
      error: undefined,
      roomId: 'r-1',
      code: 'CCCC',
      dek: null,
      state: { entries: [], clinicalOps: { teams: [{ team_id: 't1', name: 'Equipo Azul' }] } },
    });
    const census = await fetchNetworkCensus(makeFakeApi(salas));
    const row = census.find((c) => c.sala === 'Sala 1');
    assert.deepEqual(row.clinicalOps, { teams: [{ team_id: 't1', name: 'Equipo Azul' }] });
  });

  it('passes through an error row (no current room) untouched', async () => {
    const salas = CLOUD_SALAS.map((sala) => ({ sala, error: 'Sin sala activa este mes.' }));
    const census = await fetchNetworkCensus(makeFakeApi(salas));
    assert.equal(census.length, CLOUD_SALAS.length);
    assert.ok(census.every((c) => c.error === 'Sin sala activa este mes.'));
  });

  it('one sala with no current room does not block the rest', async () => {
    const salas = [
      { sala: 'Área A/Pensionistas', error: 'Sin sala activa este mes.' },
      { sala: 'Eme', roomId: 'r-b', code: 'BBBB', dek: null, state: { entries: [{ id: 'p2', fields: { nombre: 'GOMEZ' } }] } },
    ];
    const census = await fetchNetworkCensus(makeFakeApi(salas));
    assert.ok(census.find((c) => c.sala === 'Área A/Pensionistas').error);
    assert.equal(census.find((c) => c.sala === 'Eme').entries[0].fields.nombre, 'GOMEZ');
  });
});
