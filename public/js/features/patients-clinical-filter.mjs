import {
  isPatientReadableInClinicalScope,
} from '../clinico-access.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { CENSUS_TEAM_FILTER_UNASSIGNED } from './clinical-census-filters-ui.mjs';

/** Map chart patient row to scope patient shape. */
export function patientForScopeEvaluate(p) {
  return {
    id: String(p?.id || ''),
    service: String(p?.servicio || p?.service || ''),
    sub_area: String(p?.area || p?.sub_area || ''),
    sala: p?.sala,
    interconsult_type: p?.interconsult_type,
  };
}

/**
 * @param {object[]} patients
 * @param {object|null|undefined} user
 * @param {object} scopeContext
 * @param {Map<string, object>|null|undefined} [guardiasMap]
 */
export function filterPatientsForClinicalSidebar(patients, user, scopeContext, guardiasMap) {
  if (!user?.user_id) return patients || [];
  if (hasElevatedTeamPrivileges(user)) return patients || [];
  return (patients || []).filter((p) => {
    if (!p) return false;
    const mapped = patientForScopeEvaluate(p);
    const activeGuardia =
      guardiasMap && typeof guardiasMap.get === 'function'
        ? guardiasMap.get(String(p.id)) || null
        : null;
    return isPatientReadableInClinicalScope(user, mapped, activeGuardia, scopeContext);
  });
}

/**
 * Client-only filters for elevated users (sala / teamId / service substring).
 * @param {object[]} patients
 * @param {{ sala?: string, teamId?: string, service?: string }} filters
 */
export function applyElevatedPatientFilters(patients, filters) {
  let list = patients || [];
  const sala = filters?.sala;
  if (sala && sala !== '__all__') {
    list = list.filter((p) => String(p.sala || '') === sala);
  }
  if (filters?.teamId === CENSUS_TEAM_FILTER_UNASSIGNED) {
    list = list.filter((p) => p._noExplicitTeamAssignment === true);
  } else if (filters?.teamId) {
    list = list.filter((p) => String(p._filterTeamId || '') === String(filters.teamId));
  }
  if (filters?.service) {
    const q = String(filters.service).toLowerCase();
    list = list.filter((p) => String(p.servicio || '').toLowerCase().includes(q));
  }
  return list;
}
