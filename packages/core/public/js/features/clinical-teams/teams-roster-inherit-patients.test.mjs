import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  preferredPreviousTeamId,
  groupBringablePatientsForInherit,
  listInheritSourceOptions,
  patientsForInheritSource,
} from './teams-roster-inherit-patients.mjs';
import {
  buildInheritStepDestinoHtml,
  buildInheritStepOrigenHtml,
  buildInheritStepPacientesHtml,
  buildInheritStepConfirmHtml,
  buildInheritStepDotsHtml,
} from './teams-roster-inherit-patients-modal.mjs';

describe('teams-roster-inherit-patients', () => {
  beforeEach(() => {
    clinicalSessionContext.user = { user_id: 'u1', rank: 'R2', sala: 'Sala 2' };
    clinicalSessionContext.teams = [
      {
        team_id: 't-leslie',
        name: 'Dra. Leslie',
        sala: 'Sala 2',
        sub_area_fraction: 'B',
        members: [{ user_id: 'u1' }],
      },
    ];
    clinicalSessionContext.scopeContext = {
      teams: clinicalSessionContext.teams,
      teams_archived: [
        {
          team_id: 't-fer',
          name: 'Dr. Fer',
          sala: 'Sala 2',
          sub_area_fraction: 'B',
          archived_at: '2026-08-01T00:00:00Z',
        },
        {
          team_id: 't-other',
          name: 'Otro',
          sala: 'Sala 1',
          sub_area_fraction: 'A',
          archived_at: '2026-08-01T00:00:00Z',
        },
      ],
      assignments: [
        { patient_id: 'p-fer-1', team_id: 't-fer', effective_at: '2026-07-01T00:00:00Z' },
        { patient_id: 'p-fer-2', team_id: 't-fer', effective_at: '2026-07-01T00:00:00Z' },
        { patient_id: 'p-free', team_id: 't-gone', effective_at: '2026-07-01T00:00:00Z' },
      ],
      now: '2026-08-07T12:00:00Z',
      guardias: [],
    };
  });

  it('preferredPreviousTeamId picks archived same sala + cycle', () => {
    const id = preferredPreviousTeamId({
      team_id: 't-leslie',
      sala: 'Sala 2',
      sub_area_fraction: 'B',
    });
    assert.equal(id, 't-fer');
  });

  it('groupBringablePatientsForInherit marks Fer group preferred', () => {
    const local = [
      { id: 'p-fer-1', nombre: 'Ana', registro: '1' },
      { id: 'p-fer-2', nombre: 'Luis', registro: '2' },
      { id: 'p-free', nombre: 'Ghost', registro: '3' },
    ];
    const model = groupBringablePatientsForInherit('t-leslie', clinicalSessionContext.teams[0], local);
    assert.equal(model.preferredSourceTeamId, 't-fer');
    assert.ok(model.groups[0].preferred);
    assert.match(model.groups[0].sourceLabel, /Dr\. Fer/);
    assert.equal(model.groups[0].patients.length, 2);
    assert.equal(model.total, 3);
  });

  it('listInheritSourceOptions exposes Fer as suggested pick (same sala)', () => {
    const local = [
      { id: 'p-fer-1', nombre: 'Ana', registro: '1' },
      { id: 'p-fer-2', nombre: 'Luis', registro: '2' },
      { id: 'p-free', nombre: 'Ghost', registro: '3' },
    ];
    const grouped = groupBringablePatientsForInherit('t-leslie', clinicalSessionContext.teams[0], local);
    const pick = listInheritSourceOptions(clinicalSessionContext.teams[0], grouped);
    assert.equal(pick.preferredSourceTeamId, 't-fer');
    assert.equal(pick.sources[0].teamId, 't-fer');
    assert.equal(pick.sources[0].preferred, true);
    assert.equal(pick.sources[0].patientCount, 2);
    assert.ok(!pick.sources.some((s) => s.teamId === 't-other'), 'other sala archived excluded');
    // p-free is assigned to unknown t-gone → counted under that source, not unassigned
    assert.equal(pick.unassignedCount, 0);
    assert.ok(pick.sources.some((s) => s.teamId === 't-gone' && s.patientCount === 1));
  });

  it('patientsForInheritSource filters by chosen origin', () => {
    const local = [
      { id: 'p-fer-1', nombre: 'Ana', registro: '1' },
      { id: 'p-fer-2', nombre: 'Luis', registro: '2' },
      { id: 'p-free', nombre: 'Ghost', registro: '3' },
      { id: 'p-none', nombre: 'Libre', registro: '4' }, // no assignment → unassigned
    ];
    const grouped = groupBringablePatientsForInherit('t-leslie', clinicalSessionContext.teams[0], local);
    const fer = patientsForInheritSource(grouped, 't-fer');
    assert.equal(fer.length, 2);
    const none = patientsForInheritSource(grouped, '');
    assert.ok(none.some((p) => p.id === 'p-none'));
    const gone = patientsForInheritSource(grouped, 't-gone');
    assert.equal(gone.length, 1);
    assert.equal(gone[0].id, 'p-free');
  });

  it('wizard step HTML: destino → origen (radio) → pacientes → confirmar', () => {
    assert.match(buildInheritStepDotsHtml(1), /inherit-step--current/);
    assert.match(buildInheritStepDotsHtml(1), /Origen/);

    const destino = buildInheritStepDestinoHtml({
      targetName: 'Dra. Leslie',
      sala: 'Sala 2',
      cycle: 'B',
    });
    assert.match(destino, /Paso 1/);
    assert.match(destino, /Dra\. Leslie/);
    assert.match(destino, /Sala 2 · ciclo B/);

    const origen = buildInheritStepOrigenHtml({
      targetName: 'Dra. Leslie',
      selectedSourceId: 't-fer',
      unassignedCount: 1,
      sources: [
        {
          teamId: 't-fer',
          name: 'Dr. Fer',
          sala: 'Sala 2',
          cycle: 'B',
          preferred: true,
          patientCount: 4,
        },
      ],
    });
    assert.match(origen, /Paso 2/);
    assert.match(origen, /te <strong>hereda<\/strong>/);
    assert.match(origen, /name="inherit-source"/);
    assert.match(origen, /data-inherit-source="t-fer"/);
    assert.match(origen, /Sugerido · misma sala y ciclo/);
    assert.match(origen, /Solo sin equipo/);
    assert.match(origen, /checked/);

    const pacientes = buildInheritStepPacientesHtml({
      targetName: 'Dra. Leslie',
      sourceName: 'Dr. Fer',
      patients: [{ id: 'p1', nombre: 'Ana', registro: '11' }],
      includeUnassigned: false,
      unassignedCount: 1,
    });
    assert.match(pacientes, /Paso 3/);
    assert.match(pacientes, /data-inherit-patient="p1"/);
    assert.match(pacientes, /Seleccionar todos/);
    assert.match(pacientes, /Incluir también 1 sin equipo/);

    const confirm = buildInheritStepConfirmHtml({
      targetName: 'Dra. Leslie',
      sourceName: 'Dr. Fer',
      selectedCount: 3,
    });
    assert.match(confirm, /Paso 4/);
    assert.match(confirm, /Desde/);
    assert.match(confirm, /Hacia/);
    assert.match(confirm, /3 pacientes/);
  });
});
