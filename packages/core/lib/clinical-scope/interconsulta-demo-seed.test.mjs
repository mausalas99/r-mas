import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildInterconsultaDemoPatients,
  buildInterconsultaDemoTeams,
  buildInterconsultaDemoAssignments,
} from './interconsulta-demo-seed.mjs';
import { classifyInterconsultaBoardBucket } from './interconsulta-board-buckets.mjs';
import { getInterconsultaTeamRoles } from './interconsulta-team-roles.mjs';
import { resolvePatientTeamIdFromAssignments } from './team-membership.mjs';

const NOW = new Date('2026-08-25T12:00:00Z');
const ROLES = {
  guardia: { team_id: 't-guardia' },
  activo: [{ team_id: 't-activo-1' }, { team_id: 't-activo-2' }],
};

test('returns 12 patients: 8 follow-up + 2 VPO + 2 new IC', () => {
  const patients = buildInterconsultaDemoPatients(ROLES, NOW);
  assert.equal(patients.length, 12);
  const ids = new Set(patients.map((p) => p.id));
  assert.equal(ids.size, 12, 'ids must be unique');
});

test('8 recurring follow-ups split 2 each across guardia/activo1/activo2/sin-equipo', () => {
  const patients = buildInterconsultaDemoPatients(ROLES, NOW);
  const followUps = patients.filter((p) => p.interconsult_type === 'Follow-up' && p.consultInfo.followUpStatus === 'en_curso');
  assert.equal(followUps.length, 8);
  const byTeam = {};
  followUps.forEach((p) => {
    byTeam[p.censusTeamId] = (byTeam[p.censusTeamId] || 0) + 1;
  });
  assert.equal(byTeam['t-guardia'], 2);
  assert.equal(byTeam['t-activo-1'], 2);
  assert.equal(byTeam['t-activo-2'], 2);
  assert.equal(byTeam[''], 2);
});

test('2 VPOs and 2 new interconsultas both belong to the on-call (guardia) team', () => {
  const patients = buildInterconsultaDemoPatients(ROLES, NOW);
  const vpos = patients.filter((p) => p.interconsult_type === 'Ephemeral_VPO');
  const newIcs = patients.filter((p) => p.interconsult_type === 'Follow-up' && p.consultInfo.followUpStatus === 'pendiente');
  assert.equal(vpos.length, 2);
  assert.equal(newIcs.length, 2);
  vpos.concat(newIcs).forEach((p) => assert.equal(p.censusTeamId, 't-guardia'));
});

test('VPOs and new-today ICs land in the guardia lane\'s Preop/Nuevas hoy bucket, follow-ups land in Pendientes', () => {
  const patients = buildInterconsultaDemoPatients(ROLES, NOW);
  patients.forEach((p) => {
    const bucket = classifyInterconsultaBoardBucket(p, { isGuardiaTeam: p.censusTeamId === 't-guardia', now: NOW });
    if (p.interconsult_type === 'Ephemeral_VPO' || p.consultInfo.followUpStatus === 'pendiente') {
      assert.equal(bucket, p.censusTeamId === 't-guardia' ? 'preop' : 'pendientes');
    } else {
      assert.equal(bucket, 'pendientes');
    }
  });
});

test('degrades gracefully with fewer than 2 activo teams (falls back toward guardia, never throws)', () => {
  const patients = buildInterconsultaDemoPatients({ guardia: { team_id: 't-g' }, activo: [] }, NOW);
  assert.equal(patients.length, 12);
});

test('buildInterconsultaDemoTeams + real getInterconsultaTeamRoles resolves a guardia team deterministically', () => {
  const teams = buildInterconsultaDemoTeams();
  assert.equal(teams.length, 4);
  const roles = getInterconsultaTeamRoles(teams, NOW);
  assert.ok(roles.guardia, 'one of the 4 A-D demo teams must be on call for any date');
});

test('assignment rows round-trip through the real resolver — a patient resolves to the team it was built for', () => {
  const teams = buildInterconsultaDemoTeams();
  const roles = getInterconsultaTeamRoles(teams, NOW);
  const patients = buildInterconsultaDemoPatients(roles, NOW);
  const assignments = buildInterconsultaDemoAssignments(patients, NOW);
  patients.forEach((p) => {
    const resolved = resolvePatientTeamIdFromAssignments(p.id, assignments, NOW);
    assert.equal(resolved, p.censusTeamId, p.id + ' must resolve to its intended team via assignments');
  });
});
