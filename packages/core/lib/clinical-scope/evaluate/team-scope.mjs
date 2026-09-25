import { patientCoveredByGuardia } from '../guardia-coverage.mjs';
import {
  patientAssignedToTeam,
  patientHasExplicitTeamAssignment,
  patientInJoinedTeamScope,
  r3ExtendedStructuralAccess,
} from '../team-membership.mjs';
import { patientInUserSala } from '../patient-sala.mjs';

/** @param {object} ctx @returns {object|null} */
export function evaluateTeamScopeR4(ctx) {
  const { rank, enforceTeamPatientScope, allow } = ctx;
  if (!enforceTeamPatientScope && rank === 'R4') {
    return allow('R4: acceso global');
  }
  return null;
}

/** @param {object} ctx @returns {object|null} */
export function evaluateTeamScopeEntregaR1(ctx) {
  const {
    rank,
    entregaPhaseActive,
    enforceTeamPatientScope,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    userSala,
    now,
    allow,
    deny,
  } = ctx;

  if (!entregaPhaseActive || rank !== 'R1') return null;

  if (enforceTeamPatientScope) {
    if (
      patientInJoinedTeamScope(
        targetPatient,
        joinedTeams,
        assignments,
        joinedTeamIds,
        userId,
        now,
        { strictTeamFilter: true }
      )
    ) {
      return allow('Fase entrega R1: paciente de mi equipo', true, false);
    }
    return deny('Fase entrega R1: fuera de mi equipo');
  }
  if (patientInUserSala(targetPatient, userSala)) {
    return allow('Fase entrega R1: censo de sala', true, false);
  }
  return deny('Fase entrega R1: fuera de mi sala');
}

/** @param {object} ctx @returns {object|null} */
export function evaluateTeamScopeR1(ctx) {
  const {
    rank,
    strictTeamFilter,
    enforceTeamPatientScope,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    patientId,
    userSala,
    guardias,
    now,
    allow,
    deny,
  } = ctx;

  if (rank !== 'R1') return null;

  if (strictTeamFilter) {
    if (
      patientInJoinedTeamScope(
        targetPatient,
        joinedTeams,
        assignments,
        joinedTeamIds,
        userId,
        now,
        { strictTeamFilter: true }
      )
    ) {
      return allow('R1: paciente de mi equipo');
    }
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow('R1: paciente entregado');
    }
    return deny('R1: fuera de mi equipo');
  }
  if (!enforceTeamPatientScope && patientInUserSala(targetPatient, userSala)) {
    return allow('R1: paciente en mi sala');
  }
  return deny('R1: fuera de mi sala');
}

/** @param {object} ctx @returns {object|null} */
export function evaluateTeamScopeR2(ctx) {
  const {
    rank,
    patientId,
    userId,
    guardias,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    strictTeamFilter,
    enforceTeamPatientScope,
    userSala,
    now,
    allow,
    deny,
  } = ctx;

  if (rank !== 'R2') return null;

  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow('R2: paciente entregado');
  }
  if (
    patientInJoinedTeamScope(
      targetPatient,
      joinedTeams,
      assignments,
      joinedTeamIds,
      userId,
      now,
      { strictTeamFilter }
    )
  ) {
    return allow('R2: paciente de mi equipo');
  }
  if (!strictTeamFilter && !enforceTeamPatientScope && patientInUserSala(targetPatient, userSala)) {
    return allow('R2: paciente en mi sala');
  }
  return deny('R2: sin equipo ni entrega');
}

/** @param {object} ctx @returns {object|null} */
export function evaluateTeamScopeR3(ctx) {
  const {
    rank,
    targetPatient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    patientId,
    strictTeamFilter,
    currentUser,
    now,
    allow,
    deny,
  } = ctx;

  if (rank !== 'R3') return null;

  if (
    patientInJoinedTeamScope(
      targetPatient,
      joinedTeams,
      assignments,
      joinedTeamIds,
      userId,
      now,
      { strictTeamFilter }
    )
  ) {
    return allow('R3: paciente de mi equipo');
  }
  if (
    !strictTeamFilter &&
    !patientHasExplicitTeamAssignment(patientId, assignments) &&
    r3ExtendedStructuralAccess(currentUser, targetPatient, joinedTeams)
  ) {
    return allow('R3: servicio extendido');
  }
  return deny('R3: fuera de alcance');
}

/** @param {object} ctx @returns {object} */
export function evaluateTeamScopeTail(ctx) {
  const { patientId, assignments, joinedTeamIds, now, userId, guardias, allow, deny } = ctx;

  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds, now)) {
    return allow('Paciente del equipo (asignación)');
  }
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow('Paciente entregado (handoff)');
  }
  return deny('Fuera de alcance');
}

const TEAM_SCOPE_EVALUATORS = [
  evaluateTeamScopeR4,
  evaluateTeamScopeEntregaR1,
  evaluateTeamScopeR1,
  evaluateTeamScopeR2,
  evaluateTeamScopeR3,
];

/**
 * Non-guardia team/rank scope (everything after the guardiaMode block).
 * @param {object} ctx
 * @returns {object}
 */
export function evaluateTeamScope(ctx) {
  for (const evaluate of TEAM_SCOPE_EVALUATORS) {
    const result = evaluate(ctx);
    if (result != null) return result;
  }
  return evaluateTeamScopeTail(ctx);
}
