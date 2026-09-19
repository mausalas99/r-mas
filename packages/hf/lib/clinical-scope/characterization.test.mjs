import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

import {
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
} from './patient-sala.mjs';

import {
  patientMatchesTeam,
  getJoinedTeamsForUser,
  getJoinedTeams,
  userHasJoinedClinicalTeams,
  patientHasExplicitTeamAssignment,
  resolvePatientTeamIdFromAssignments,
  patientAssignedToTeam,
  patientInJoinedTeamScope,
  teamForMemberCycle,
  patientMatchesAnyJoinedTeam,
} from './team-membership.mjs';

import { evaluateClinicalScope } from './evaluate/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixtures(name) {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
}

const patientSalaFixtures = loadFixtures('patient-sala.json');
const teamMembershipFixtures = loadFixtures('team-membership.json');
const evaluateClinicalScopeFixtures = loadFixtures('evaluate-clinical-scope.json');

const patientSalaFns = {
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
};

describe('clinical-scope patient-sala characterization', () => {
  for (const fx of patientSalaFixtures) {
    test(fx.id, () => {
      if (fx.fn === 'stampPatientClinicalSala') {
        const patient = { ...fx.patient };
        stampPatientClinicalSala(patient, fx.user, fx.opts || undefined);
        assert.equal(patient.sala, fx.expectedSala);
        return;
      }
      if (fx.fn === 'migratePatientsClinicalSala') {
        const patients = fx.patients.map((p) => ({ ...p }));
        const n = migratePatientsClinicalSala(patients, fx.user);
        assert.equal(n, fx.expectedCount);
        for (let i = 0; i < fx.expectedSalas.length; i += 1) {
          const want = fx.expectedSalas[i];
          if (want == null) {
            assert.equal(String(patients[i].sala || '').trim(), '');
          } else {
            assert.equal(patients[i].sala, want);
          }
        }
        return;
      }
      const fn = patientSalaFns[fx.fn];
      assert.ok(fn, `unknown fn ${fx.fn}`);
      assert.equal(fn(...fx.args), fx.expected);
    });
  }
});

describe('clinical-scope team-membership characterization', () => {
  for (const fx of teamMembershipFixtures) {
    test(fx.id, () => {
      if (fx.fn === 'patientMatchesTeam') {
        assert.equal(patientMatchesTeam(...fx.args), fx.expected);
        return;
      }
      if (fx.fn === 'getJoinedTeamsForUser') {
        const teams = getJoinedTeamsForUser(fx.teams, fx.userOrUserId, fx.usernameHint || undefined);
        assert.deepEqual(
          teams.map((t) => t.team_id),
          fx.expectedTeamIds
        );
        return;
      }
      if (fx.fn === 'getJoinedTeams') {
        const teams = getJoinedTeams(fx.teams, fx.userId);
        assert.deepEqual(
          teams.map((t) => t.team_id),
          fx.expectedTeamIds
        );
        return;
      }
      if (fx.fn === 'userHasJoinedClinicalTeams') {
        assert.equal(userHasJoinedClinicalTeams(fx.teams, fx.userId), fx.expected);
        return;
      }
      if (fx.fn === 'patientHasExplicitTeamAssignment') {
        assert.equal(patientHasExplicitTeamAssignment(...fx.args), fx.expected);
        return;
      }
      if (fx.fn === 'resolvePatientTeamIdFromAssignments') {
        assert.equal(resolvePatientTeamIdFromAssignments(...fx.args), fx.expected);
        return;
      }
      if (fx.fn === 'patientAssignedToTeam') {
        const [patientId, assignments, joinedIds, now] = fx.args;
        assert.equal(
          patientAssignedToTeam(patientId, assignments, new Set(joinedIds), now),
          fx.expected
        );
        return;
      }
      if (fx.fn === 'patientInJoinedTeamScope') {
        assert.equal(
          patientInJoinedTeamScope(
            fx.patient,
            fx.joinedTeams,
            fx.assignments,
            new Set(fx.joinedTeamIds),
            fx.userId,
            fx.now,
            fx.opts
          ),
          fx.expected
        );
        return;
      }
      if (fx.fn === 'teamForMemberCycle') {
        const scoped = teamForMemberCycle(fx.team, fx.userId);
        assert.equal(scoped.sub_area_fraction, fx.expectedFrac);
        return;
      }
      if (fx.fn === 'patientMatchesAnyJoinedTeam') {
        assert.equal(
          patientMatchesAnyJoinedTeam(fx.patient, fx.joinedTeams, fx.userId),
          fx.expected
        );
        return;
      }
      assert.fail(`unknown fn ${fx.fn}`);
    });
  }
});

function scopeWithoutTimestamp(scope) {
  const { audit, ...rest } = scope;
  const auditRest = { ...(audit || {}) };
  delete auditRest.timestamp;
  const auditClean = Object.fromEntries(
    Object.entries(auditRest).filter(([, value]) => value !== undefined)
  );
  return { ...rest, audit: auditClean };
}

describe('clinical-scope evaluateClinicalScope characterization', () => {
  for (const fx of evaluateClinicalScopeFixtures) {
    test(fx.id, () => {
      const result = evaluateClinicalScope(fx.user, fx.patient, fx.activeGuardia, fx.context);
      assert.deepEqual(scopeWithoutTimestamp(result), fx.expected);
    });
  }
});

test('fixture corpus patient+team still ≥20', () => {
  assert.ok(
    patientSalaFixtures.length + teamMembershipFixtures.length >= 20,
    'need ≥20 patient/team characterization scenarios'
  );
});

test('fixture corpus evaluateClinicalScope ≥5', () => {
  assert.ok(
    evaluateClinicalScopeFixtures.length >= 5,
    'need ≥5 evaluateClinicalScope characterization scenarios'
  );
});
