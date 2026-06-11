/**
 * Pure helpers for teamless patient TTL policy (importable from Node tests).
 */

import { patientHasExplicitTeamAssignment } from '../public/js/clinico-access.mjs';

export const TEAMLESS_PATIENT_TTL_MS = 24 * 60 * 60 * 1000;

const TOUR_DEMO_IDS = new Set(['demo-onboarding', 'demo-onboarding-2']);

/** @param {string|number|undefined|null} registeredAt */
export function teamlessPatientExpiresAtMs(registeredAt) {
  const raw = String(registeredAt || '').trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  if (!Number.isFinite(ms)) return null;
  return ms + TEAMLESS_PATIENT_TTL_MS;
}

function isDemoPatient(patient) {
  if (!patient) return true;
  if (patient.isDemo) return true;
  const id = String(patient.id || '');
  return id.indexOf('demo-') === 0 || TOUR_DEMO_IDS.has(id);
}

/**
 * @param {object} patient
 * @param {object[]} assignments
 * @param {string} [nowIso]
 */
export function isTeamlessPatientExpired(patient, assignments, nowIso) {
  if (!patient || isDemoPatient(patient)) return false;
  if (patientHasExplicitTeamAssignment(String(patient.id || ''), assignments || [])) return false;
  const expiresAt = teamlessPatientExpiresAtMs(patient.registeredAt);
  if (expiresAt == null) return false;
  const nowMs = new Date(nowIso || new Date().toISOString()).getTime();
  return Number.isFinite(nowMs) && nowMs >= expiresAt;
}

/**
 * @param {object[]} patientList
 * @param {{ assignments?: object[], guardias?: object[], now?: string }} ctx
 */
export function selectExpiredTeamlessPatients(patientList, ctx) {
  const assignments = Array.isArray(ctx?.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx?.guardias) ? ctx.guardias : [];
  const activeGuardiaIds = new Set(
    guardias
      .filter((g) => g && !g.resolved_at && !g.resolvedAt)
      .map((g) => String(g.patient_id || g.patientId || ''))
      .filter(Boolean)
  );
  const nowIso = ctx?.now || new Date().toISOString();
  return (patientList || []).filter(function (patient) {
    const pid = String(patient?.id || '');
    if (!pid || activeGuardiaIds.has(pid)) return false;
    return isTeamlessPatientExpired(patient, assignments, nowIso);
  });
}
