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
  r3ExtendedStructuralAccess,
} from './team-membership.mjs';

import {
  isSalaWardService,
  usesSalaR1LinePicker,
  getCycleLetterOptionsForRank,
  getCycleConfig,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  letterIndexForTeam,
  isOnCallToday,
  activeCycleLetterForDate,
  isIncomingPreviewWindow,
  isMemberOnCallToday,
  isTeamRankOnCallToday,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
} from './cycle-letters.mjs';

import {
  patientCoveredByGuardia,
  isActiveGuardiaCoveringUser,
  R4_GUARDIA_SECTOR_ORDER,
  resolveR4GuardiaSectorLabel,
  isR4MacroPatient,
  hasSalaGuardiaDeclaredForLetter,
  computeSalaAbcdefDeficitWrite,
  salaOnCallR1,
  userIsOnGuardiaCallToday,
  userIsOnCallForLanHost,
  salaOnCallR2,
  teamGuardiaOverride,
  canR2SalaAbcdefDeficitWrite,
} from './guardia-coverage.mjs';

import {
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
} from './interconsultas.mjs';

import {
  ENTREGA_PHASE_LS_KEY,
  readEntregaPhaseActive,
} from './entrega-phase.mjs';

import { evaluateClinicalScope } from './evaluate/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixtures(name) {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
}

const patientSalaFixtures = loadFixtures('patient-sala.json');
const teamMembershipFixtures = loadFixtures('team-membership.json');
const cycleLettersFixtures = loadFixtures('cycle-letters.json');
const guardiaCoverageFixtures = loadFixtures('guardia-coverage.json');
const interconsultasFixtures = loadFixtures('interconsultas.json');
const entregaPhaseFixtures = loadFixtures('entrega-phase.json');
const evaluateClinicalScopeFixtures = loadFixtures('evaluate-clinical-scope.json');

const patientSalaFns = {
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
};

const cycleFns = {
  isSalaWardService,
  usesSalaR1LinePicker,
  getCycleLetterOptionsForRank,
  getCycleConfig,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  letterIndexForTeam,
  isOnCallToday,
  activeCycleLetterForDate,
  isIncomingPreviewWindow,
  isMemberOnCallToday,
  isTeamRankOnCallToday,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
};

const guardiaFns = {
  patientCoveredByGuardia,
  isActiveGuardiaCoveringUser,
  resolveR4GuardiaSectorLabel,
  isR4MacroPatient,
  hasSalaGuardiaDeclaredForLetter,
  computeSalaAbcdefDeficitWrite,
  salaOnCallR1,
  userIsOnGuardiaCallToday,
  userIsOnCallForLanHost,
  salaOnCallR2,
  teamGuardiaOverride,
  canR2SalaAbcdefDeficitWrite,
};

const interconsultasFns = {
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
};

function runArgsExpected(fnMap, fx) {
  if (fx.fn === 'R4_GUARDIA_SECTOR_ORDER') {
    assert.deepEqual(R4_GUARDIA_SECTOR_ORDER, fx.expected);
    return;
  }
  const fn = fnMap[fx.fn];
  assert.ok(fn, `unknown fn ${fx.fn}`);
  const got = fn(...(fx.args || []));
  if (fx.expectedIncludes) {
    for (const [key, needle] of Object.entries(fx.expectedIncludes)) {
      assert.match(String(got?.[key] || ''), new RegExp(needle, 'i'));
    }
    return;
  }
  assert.deepEqual(got, fx.expected);
}

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
      if (fx.fn === 'r3ExtendedStructuralAccess') {
        assert.equal(
          r3ExtendedStructuralAccess(fx.user, fx.patient, fx.joinedTeams),
          fx.expected
        );
        return;
      }
      assert.fail(`unknown fn ${fx.fn}`);
    });
  }
});

describe('clinical-scope cycle-letters characterization', () => {
  for (const fx of cycleLettersFixtures) {
    test(fx.id, () => runArgsExpected(cycleFns, fx));
  }
});

describe('clinical-scope guardia-coverage characterization', () => {
  for (const fx of guardiaCoverageFixtures) {
    test(fx.id, () => runArgsExpected(guardiaFns, fx));
  }
});

function makeStorage(map) {
  if (map == null) return null;
  return {
    getItem(key) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) return null;
      return map[key];
    },
  };
}

describe('clinical-scope interconsultas characterization', () => {
  for (const fx of interconsultasFixtures) {
    test(fx.id, () => runArgsExpected(interconsultasFns, fx));
  }
});

describe('clinical-scope entrega-phase characterization', () => {
  for (const fx of entregaPhaseFixtures) {
    test(fx.id, () => {
      if (fx.fn === 'ENTREGA_PHASE_LS_KEY') {
        assert.equal(ENTREGA_PHASE_LS_KEY, fx.expected);
        return;
      }
      if (fx.fn === 'readEntregaPhaseActive') {
        assert.equal(readEntregaPhaseActive(makeStorage(fx.storage)), fx.expected);
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
