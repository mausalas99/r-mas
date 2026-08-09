/** Shared Filtros censo state (sidebar + Guardia board). */
export const elevatedPatientFilters = { sala: '__all__', teamId: '', service: '' };

/** @param {{ sala?: string, teamId?: string, service?: string }} [filters] */
export function censusFiltersAreActive(filters) {
  var f = filters || elevatedPatientFilters;
  return (
    String(f.sala || '__all__') !== '__all__' ||
    !!String(f.teamId || '').trim() ||
    !!String(f.service || '').trim()
  );
}
