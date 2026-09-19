import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectOpenPendientesBySourceTeam,
  patientLabelForFinTurno,
  resolveGuardiasForSourceTeam,
  summarizeFinTurnoGroups,
} from './guardia-fin-turno-model.mjs';

function openItem(label) {
  return {
    id: 'i-' + label,
    type: 'procedimiento',
    kind: 'imagen',
    label,
    completedAt: null,
  };
}

describe('guardia-fin-turno-model', () => {
  it('patientLabelForFinTurno uses bed + name', () => {
    assert.equal(
      patientLabelForFinTurno({ cuarto: '402', cama: 'A', name: 'Pérez' }, 'p1'),
      '402-A · Pérez'
    );
    assert.match(patientLabelForFinTurno(null, 'abcdef12'), /Paciente abcdef12/);
  });

  it('groups open estudios by source_team_id for covering user', () => {
    const guardias = [
      {
        guardia_id: 'g1',
        patient_id: 'p1',
        covering_user_id: 'night',
        source_team_id: 't-fer',
        status: 'Active',
        pendientes_json: JSON.stringify({
          version: 2,
          items: [openItem('TAC tórax'), { ...openItem('done'), completedAt: '2026-08-07T01:00:00.000Z' }],
        }),
      },
      {
        guardia_id: 'g2',
        patient_id: 'p2',
        covering_user_id: 'night',
        source_team_id: 't-fer',
        status: 'Active',
        pendientes_json: JSON.stringify({ version: 2, items: [openItem('gasometría')] }),
      },
      {
        guardia_id: 'g3',
        patient_id: 'p3',
        covering_user_id: 'night',
        source_team_id: 't-leslie',
        status: 'Active',
        pendientes_json: JSON.stringify({ version: 2, items: [openItem('US abdomen')] }),
      },
      {
        guardia_id: 'g4',
        patient_id: 'p4',
        covering_user_id: 'other',
        source_team_id: 't-fer',
        status: 'Active',
        pendientes_json: JSON.stringify({ version: 2, items: [openItem('ignore')] }),
      },
      {
        guardia_id: 'g5',
        patient_id: 'p5',
        covering_user_id: 'night',
        source_team_id: 't-fer',
        status: 'Active',
        pendientes_json: JSON.stringify({ version: 2, items: [] }),
      },
    ];
    const patients = [
      { id: 'p1', cuarto: '402', name: 'Pérez' },
      { id: 'p2', cuarto: '318', name: 'Ruiz' },
      { id: 'p3', cuarto: '211', name: 'Soto' },
    ];
    const groups = collectOpenPendientesBySourceTeam(guardias, patients, {
      coveringUserId: 'night',
      teamLabelById: (id) => (id === 't-fer' ? 'Equipo Fer' : 'Equipo Leslie'),
    });
    assert.equal(groups.length, 2);
    const fer = groups.find((g) => g.sourceTeamId === 't-fer');
    const leslie = groups.find((g) => g.sourceTeamId === 't-leslie');
    assert.ok(fer);
    assert.ok(leslie);
    assert.equal(fer.openCount, 2);
    assert.equal(fer.patients.length, 2);
    assert.equal(leslie.openCount, 1);
    const summary = summarizeFinTurnoGroups(groups);
    assert.equal(summary.openCount, 3);
    assert.equal(summary.teamCount, 2);
  });

  it('puts missing source team under Sin equipo / otros', () => {
    const groups = collectOpenPendientesBySourceTeam(
      [
        {
          guardia_id: 'g1',
          patient_id: 'p1',
          covering_user_id: 'u1',
          source_team_id: '',
          status: 'Active',
          pendientes_json: JSON.stringify({ version: 2, items: [openItem('huérfano')] }),
        },
      ],
      [{ id: 'p1', name: 'X' }],
      { coveringUserId: 'u1' }
    );
    assert.equal(groups.length, 1);
    assert.equal(groups[0].sourceTeamId, '');
    assert.match(groups[0].teamLabel, /Sin equipo/i);
  });

  it('resolveGuardiasForSourceTeam counts resolved vs failed', async () => {
    const group = {
      patients: [
        { patientId: 'p1', guardiaId: 'g1' },
        { patientId: 'p2', guardiaId: 'g2' },
      ],
    };
    const result = await resolveGuardiasForSourceTeam(group, {
      resolveOne: async ({ patientId }) =>
        patientId === 'p1' ? { ok: true, resolved: true } : { ok: true, resolved: false },
    });
    assert.deepEqual(result, { resolved: 1, total: 2, failed: 1 });
  });
});
