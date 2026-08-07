/** @param {HTMLElement} row */
export function rowSalaForFilter(row) {
  const sel = row.querySelector('.cloud-sync-admin-equipos-user-sala');
  if (sel instanceof HTMLSelectElement) return String(sel.value || '').trim();
  return String(row.getAttribute('data-sala') || '').trim();
}

/** @param {string} hay @param {string} term */
function matchesEquiposSearch(hay, term) {
  return !term || hay.includes(term);
}

/** @param {string} rowSala @param {string} salaFilter */
function matchesEquiposSala(rowSala, salaFilter) {
  return !salaFilter || !rowSala || rowSala === salaFilter;
}

/** @param {string} activityFlag @param {string} activity */
function matchesEquiposActivity(activityFlag, activity) {
  if (activity === 'all') return true;
  if (activity === 'has' || activity === 'active') return activityFlag === 'has';
  if (activity === 'none' || activity === 'inactive') return activityFlag !== 'has';
  return true;
}

/** @param {boolean} hasTeam @param {string} teamStatus */
function matchesEquiposTeamStatus(hasTeam, teamStatus) {
  if (teamStatus === 'all') return true;
  if (teamStatus === 'unassigned') return !hasTeam;
  if (teamStatus === 'assigned') return hasTeam;
  return true;
}

/**
 * @param {HTMLElement} row
 * @param {{ q?: string, sala?: string, activity?: string, teamStatus?: string }} opts
 */
export function rowMatchesEquiposFilters(row, opts) {
  const term = String(opts.q || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
  const salaFilter = String(opts.sala || '').trim();
  const activity = String(opts.activity || 'all').trim() || 'all';
  const teamStatus = String(opts.teamStatus || 'all').trim() || 'all';

  const hay = String(row.getAttribute('data-search') || '');
  const rowSala = rowSalaForFilter(row);
  const activityFlag = String(row.getAttribute('data-activity') || 'none');
  const hasTeam = String(row.getAttribute('data-has-team') || '0') === '1';

  return (
    matchesEquiposSearch(hay, term) &&
    matchesEquiposSala(rowSala, salaFilter) &&
    matchesEquiposActivity(activityFlag, activity) &&
    matchesEquiposTeamStatus(hasTeam, teamStatus)
  );
}

/**
 * Client-only hide/show — never remounts rows (keeps checkbox selections).
 * @param {HTMLElement} host
 * @param {{ q?: string, sala?: string, activity?: string, teamStatus?: string }} opts
 */
export function applyEquiposClientFilters(host, opts = {}) {
  host.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    row.hidden = !rowMatchesEquiposFilters(row, opts);
  });
}
