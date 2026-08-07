import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { setPatients } from '../../app-state.mjs';
import {
  listBringableLocalPatients,
  buildBringPatientsConfirmMessage,
  assignBringablePatientsToTeam,
  offerBringPatientsAfterTeamJoin,
} from './teams-roster-bring-patients.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('teams-roster-bring-patients', () => {
  beforeEach(() => {
    clinicalSessionContext.user = { user_id: 'u1', rank: 'R2' };
    // User only joined the new Nube team; t-lan is stale LAN assignment still in DB.
    clinicalSessionContext.teams = [
      { team_id: 't-new', name: 'Dra. Leslie', members: [{ user_id: 'u1' }] },
      {
        team_id: 't-lan',
        name: 'Equipo LAN viejo',
        members: [{ user_id: 'someone-else' }],
      },
      {
        team_id: 't-mine-other',
        name: 'Mi otro equipo',
        members: [{ user_id: 'u1' }],
      },
    ];
    clinicalSessionContext.scopeContext = {
      teams: clinicalSessionContext.teams,
      assignments: [
        { patient_id: 'p-lan', team_id: 't-lan', effective_at: '2026-07-01T00:00:00Z' },
        { patient_id: 'p-new', team_id: 't-new', effective_at: '2026-08-01T00:00:00Z' },
        { patient_id: 'p-mine', team_id: 't-mine-other', effective_at: '2026-08-01T00:00:00Z' },
        { patient_id: 'p-ghost', team_id: 't-gone', effective_at: '2026-07-01T00:00:00Z' },
      ],
      guardias: [],
      now: '2026-08-07T12:00:00Z',
    };
    setPatients([]);
  });

  afterEach(() => {
    setPatients([]);
  });

  it('lists unassigned + stale LAN/unknown team; skips target and my other joined teams', () => {
    const local = [
      { id: 'p-free', nombre: 'Libre', registro: '1' },
      { id: 'p-lan', nombre: 'De LAN', registro: '2' },
      { id: 'p-ghost', nombre: 'Team id muerto', registro: '3' },
      { id: 'p-new', nombre: 'Ya en Nube', registro: '4' },
      { id: 'p-mine', nombre: 'Otro mio', registro: '5' },
    ];
    const bringable = listBringableLocalPatients('t-new', local);
    assert.deepEqual(
      bringable.map((p) => p.id).sort(),
      ['p-free', 'p-ghost', 'p-lan']
    );
  });

  it('buildBringPatientsConfirmMessage mentions Nube / LAN', () => {
    const msg = buildBringPatientsConfirmMessage(
      [{ id: 'p1', nombre: 'Ana', registro: '99' }],
      'Dra. Leslie'
    );
    assert.match(msg, /1 paciente local/);
    assert.match(msg, /Nube/);
    assert.match(msg, /LAN/);
    assert.match(msg, /Dra\. Leslie/);
    assert.match(msg, /Ana · 99/);
    assert.match(msg, /no desaparezcan/);
  });

  it('assignBringablePatientsToTeam counts only ok results', async () => {
    const assign = mock.fn(async (pid) => ({ ok: pid !== 'bad' }));
    const res = await assignBringablePatientsToTeam(['a', 'bad', 'c'], 't-new', { assign });
    assert.equal(res.claimed, 2);
    assert.deepEqual(res.errors, ['bad']);
    assert.equal(assign.mock.callCount(), 3);
  });

  it('offerBringPatientsAfterTeamJoin skips when user declines', async () => {
    setPatients([
      { id: 'p-free', nombre: 'Libre', registro: '1' },
      { id: 'p-lan', nombre: 'De LAN', registro: '2' },
    ]);
    const assign = mock.fn(async () => ({ ok: true }));
    const res = await offerBringPatientsAfterTeamJoin('t-new', 'Dra. Leslie', {
      confirm: () => false,
      assign,
      skipFetch: true,
    });
    assert.equal(res.offered, true);
    assert.equal(res.skipped, true);
    assert.equal(res.claimed, 0);
    assert.equal(assign.mock.callCount(), 0);
  });

  it('offerBringPatientsAfterTeamJoin claims stale LAN patients when confirmed', async () => {
    setPatients([
      { id: 'p-free', nombre: 'Libre', registro: '1' },
      { id: 'p-lan', nombre: 'De LAN', registro: '2' },
    ]);
    const assign = mock.fn(async () => ({ ok: true }));
    const res = await offerBringPatientsAfterTeamJoin('t-new', 'Dra. Leslie', {
      confirm: () => true,
      assign,
      skipFetch: true,
    });
    assert.equal(res.offered, true);
    assert.equal(res.claimed, 2);
    assert.equal(assign.mock.callCount(), 2);
  });

  it('bring/inherit modules stay off active_guardias / entrega pendientes', () => {
    const bring = readFileSync(join(__dirname, 'teams-roster-bring-patients.mjs'), 'utf8');
    const inherit = readFileSync(join(__dirname, 'teams-roster-inherit-patients.mjs'), 'utf8');
    for (const src of [bring, inherit]) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      assert.doesNotMatch(code, /active_guardias|pendientes_json|dbGuardiaUpsert|clinical-entrega/);
      assert.doesNotMatch(code, /from ['"].*entrega/);
      assert.doesNotMatch(code, /from ['"].*guardia/);
    }
  });
});
