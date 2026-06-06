import { salaOnCallR1, resolvePatientSala } from '../../public/js/clinico-access.mjs';

/**
 * R1 de guardia on-call for a sala (cycle + team_guardia_today overrides).
 * @param {object} scopeContext
 * @param {string} sala
 * @param {Date|string} [now]
 */
export function resolveSalaR1GuardiaUserIds(scopeContext, sala, now = new Date()) {
  const teams = scopeContext?.teams || [];
  const salaGuardiaToday = scopeContext?.salaGuardiaToday || [];
  const onCall = salaOnCallR1(teams, sala, now, salaGuardiaToday);
  return [...new Set(onCall.map((row) => String(row.user_id)).filter(Boolean))];
}

/**
 * @param {object[]} patients
 * @param {object[]} activeGuardias
 * @param {string} sala
 * @param {string[]} r1GuardiaUserIds
 */
export function filterInternoScopePatients(patients, activeGuardias, sala, r1GuardiaUserIds) {
  const guardiaByPatient = new Map();
  for (const g of activeGuardias || []) {
    if (String(g.status || 'Active') !== 'Active') continue;
    guardiaByPatient.set(String(g.patient_id), g);
  }

  const r1Set = new Set((r1GuardiaUserIds || []).map(String));
  const useR1Filter = r1Set.size > 0;

  return (patients || []).filter((p) => {
    if (!p?.id) return false;
    const ps = resolvePatientSala(p);
    if (ps !== sala) return false;
    const g = guardiaByPatient.get(String(p.id));
    if (!g) return false;
    if (useR1Filter && !r1Set.has(String(g.covering_user_id || ''))) return false;
    return true;
  });
}
