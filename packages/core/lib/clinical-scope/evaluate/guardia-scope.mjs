import { patientCoveredByGuardia } from '../guardia-coverage.mjs';
import { patientInJoinedTeamScope } from '../team-membership.mjs';
import { normalizeServiceKey } from '../shared.mjs';

/** @param {object} ctx @returns {object|null} */
export function evaluateGuardiaR1(ctx) {
  const {
    rank,
    userId,
    userSala,
    patientId,
    targetPatient,
    joinedTeams,
    joinedTeamIds,
    assignments,
    guardias,
    enforceTeamPatientScope,
    onCallGuardiaReceiver,
    now,
    allow,
    deny,
  } = ctx;

  if (rank !== 'R1') return null;

  if (onCallGuardiaReceiver) {
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow('Modo Guardia R1: paciente entregado', true, false);
    }
    return deny('Modo Guardia R1: sin entrega recibida');
  }
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
      return allow('Modo Guardia R1: paciente de mi equipo', true, false);
    }
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow('Modo Guardia R1: paciente entregado', true, false);
    }
    return deny('Modo Guardia R1: fuera de mi equipo');
  }
  const patientSala = targetPatient?.sala || '';
  if (patientSala && patientSala === userSala) {
    return allow('Modo Guardia R1: visibilidad de Sala completa', true, false);
  }
  return deny('Modo Guardia R1: fuera de mi Sala');
}

/** @param {object} ctx @returns {object|null} */
export function evaluateGuardiaR2(ctx) {
  const { rank, userId, patientId, guardias, allow, deny } = ctx;

  if (rank !== 'R2') return null;

  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow('Modo Guardia R2: paciente entregado', true, false);
  }
  return deny('Modo Guardia R2: sin entrega recibida');
}

/** @param {object} ctx @returns {object|null} */
export function evaluateGuardiaR4(ctx) {
  const { rank, targetPatient, allow, deny } = ctx;

  if (rank !== 'R4') return null;

  const svc = normalizeServiceKey(targetPatient?.service);
  if (svc.includes('sala') || svc.includes('torre')) {
    return allow('Modo Guardia R4: cobertura Sala + Torre', true, false);
  }
  return deny('Modo Guardia R4: fuera de dominio');
}

/** Guardia mode ranks without dedicated evaluators (R3, R5, …). */
export function evaluateGuardiaFallback(ctx) {
  const { rank, deny } = ctx;
  if (rank === 'R1' || rank === 'R2' || rank === 'R4') return null;
  return deny('Modo Guardia: rango sin cobertura');
}

export const GUARDIA_SCOPE_EVALUATORS = [
  evaluateGuardiaR1,
  evaluateGuardiaR2,
  evaluateGuardiaR4,
  evaluateGuardiaFallback,
];
