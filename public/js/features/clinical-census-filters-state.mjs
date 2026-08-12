/** Shared Filtros censo state (sidebar + Guardia board). */
import { readElevatedTeamFilterPreference } from './clinical-census-filters-ui.mjs';

export const elevatedPatientFilters = { sala: '__all__', teamId: '', service: '' };

/** Apply persisted Equipo preference before the first sidebar paint. */
export function hydrateElevatedPatientFiltersFromStorage(storage) {
  try {
    var pref = readElevatedTeamFilterPreference(storage);
    if (pref.pinned) {
      elevatedPatientFilters.teamId = pref.teamId ? String(pref.teamId) : '';
    }
  } catch (_e) {
    void _e;
  }
  return elevatedPatientFilters;
}

hydrateElevatedPatientFiltersFromStorage();

/** @param {{ sala?: string, teamId?: string, service?: string }} [filters] */
export function censusFiltersAreActive(filters) {
  var f = filters || elevatedPatientFilters;
  return (
    String(f.sala || '__all__') !== '__all__' ||
    !!String(f.teamId || '').trim() ||
    !!String(f.service || '').trim()
  );
}
