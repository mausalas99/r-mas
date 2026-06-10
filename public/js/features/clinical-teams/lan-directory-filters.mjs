/**
 * Pure filter logic for the LAN user directory (testable without DOM).
 */

/**
 * @param {{ search?: string, hasTeam?: boolean, sala?: string, activityTier?: string }} meta
 * @param {{ query?: string, status?: string, sala?: string, activity?: string }} filters
 */
export function lanDirectoryUserMatchesFilters(meta, filters) {
  const q = String(filters.query || '').trim().toLowerCase();
  const status = filters.status || 'all';
  const sala = String(filters.sala || '').trim();
  const activity = filters.activity || 'all';

  if (q && !String(meta.search || '').includes(q)) return false;
  if (activity === 'active' && meta.activityTier !== 'active') return false;
  if (activity === 'inactive' && meta.activityTier === 'active') return false;
  if (status === 'unassigned' && meta.hasTeam) return false;
  if (status === 'assigned' && !meta.hasTeam) return false;
  if (sala && String(meta.sala || '').trim() !== sala) return false;
  return true;
}
