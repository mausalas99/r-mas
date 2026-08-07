import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalServiceForSala } from '../clinical-salas.mjs';
import {
  AGOSTO_2026_TEAMS,
  agostoTeamCreatePayload,
  planAgosto2026TeamSeed,
} from './agosto-2026-teams.mjs';

describe('AGOSTO_2026_TEAMS', () => {
  it('has 32 teams: 8 salas × 4 guardias (skips UCIA/POSQX/Infecto)', () => {
    assert.equal(AGOSTO_2026_TEAMS.length, 32);
    const salas = new Set(AGOSTO_2026_TEAMS.map((t) => t.sala));
    assert.equal(salas.size, 8);
    assert.ok(![...salas].some((s) => /ucia|posqx|infecto/i.test(s)));
  });

  it('uses census naming rules for sample leaders', () => {
    const find = (sala, cycle) =>
      AGOSTO_2026_TEAMS.find((t) => t.sala === sala && t.cycle === cycle)?.name;
    assert.equal(find('Sala 1', 'A'), 'Dr. Adrián');
    assert.equal(find('Interconsultas', 'A'), 'Dra. Astrid/Arturo');
    assert.equal(find('UX', 'A'), 'Dra. Laura');
    assert.equal(find('UX', 'B'), 'Dra. Karla');
    assert.equal(find('Eme', 'A'), 'Dr. Manuel');
    assert.equal(find('Área A/Pensionistas', 'A'), 'Dra. Katia');
    assert.equal(find('Área A/Pensionistas', 'B'), 'Dra. Elide');
  });

  it('maps each sala to the correct clinical service', () => {
    for (const row of AGOSTO_2026_TEAMS) {
      const payload = agostoTeamCreatePayload(row, 'admin-1');
      assert.equal(payload.service, clinicalServiceForSala(row.sala));
      assert.equal(payload.subAreaFraction, row.cycle);
      assert.equal(payload.createdBy, 'admin-1');
    }
  });
});

describe('planAgosto2026TeamSeed', () => {
  it('creates all when roster is empty', () => {
    const plan = planAgosto2026TeamSeed([]);
    assert.equal(plan.create.length, 32);
    assert.equal(plan.rename.length, 0);
    assert.equal(plan.skip.length, 0);
  });

  it('skips exact sala+name matches', () => {
    const plan = planAgosto2026TeamSeed([
      { team_id: 't1', sala: 'Sala 1', name: 'Dr. Adrián', sub_area_fraction: 'A' },
    ]);
    assert.equal(plan.skip.length, 1);
    assert.equal(plan.create.length, 31);
  });

  it('renames when same sala+cycle exists under another name', () => {
    const plan = planAgosto2026TeamSeed([
      { team_id: 't-old', sala: 'Sala 1', name: 'Equipo viejo', sub_area_fraction: 'A' },
    ]);
    assert.equal(plan.rename.length, 1);
    assert.equal(plan.rename[0].teamId, 't-old');
    assert.equal(plan.rename[0].spec.name, 'Dr. Adrián');
    assert.equal(plan.create.length, 31);
  });
});
