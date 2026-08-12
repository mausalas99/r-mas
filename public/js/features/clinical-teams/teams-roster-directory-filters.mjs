/** LAN directorio toolbar, client-side filters, collapse persistence. */
import { CLINICAL_SALAS } from './shared.mjs';
import { escapeHtml, escapeAttr } from './shared.mjs';
import { directoryUserMatchesFilters } from './teams-directory-filters.mjs';
import { directoryUsersModalBackdropEl, directoryUsersModalBodyEl } from './teams-roster-directory-dom.mjs';
import {
  directoryRt,
  LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD,
  LAN_DIRECTORY_FILTER_SELECT_IDS,
} from './teams-roster-directory-state.mjs';

function lanRankGroupKey(rank) {
  return String(rank || '').trim() || 'Otros';
}

/** @param {string} rank @param {number} userCount */
export function shouldRankGroupOpen(rank, userCount) {
  const key = lanRankGroupKey(rank);
  if (directoryRt.collapsedRanks.has(key)) return false;
  if (directoryRt.expandedRanks.has(key)) return true;
  return userCount <= LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD;
}

/** @param {HTMLElement} host */
export function captureDirectoryCollapseState(host) {
  host.querySelectorAll('details.clinical-directory-rank-group').forEach((el) => {
    const key = String(el.dataset.lanRankGroup || '').trim();
    if (!key) return;
    const count = Number(el.dataset.lanRankCount) || 0;
    if (el.open) {
      directoryRt.collapsedRanks.delete(key);
      if (count > LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD) {
        directoryRt.expandedRanks.add(key);
      }
    } else {
      directoryRt.collapsedRanks.add(key);
      directoryRt.expandedRanks.delete(key);
    }
  });
}

/** @param {object[]} users @param {object[]} teams */
function lanDirectorySalaFilterOptions(users, teams) {
  const salas = new Set(CLINICAL_SALAS);
  for (const u of users || []) {
    const sala = String(u?.sala || '').trim();
    if (sala) salas.add(sala);
  }
  for (const t of teams || []) {
    const sala = String(t?.sala || '').trim();
    if (sala) salas.add(sala);
  }
  return [...salas].sort((a, b) => a.localeCompare(b, 'es'));
}

export function renderDirectoryToolbarHtml(users, teams) {
  const salas = lanDirectorySalaFilterOptions(users, teams);
  const salaOptions = salas
    .map(
      (s) =>
        `<option value="${escapeAttr(s)}"${directoryRt.filterSala === s ? ' selected' : ''}>${escapeHtml(s)}</option>`
    )
    .join('');
  const statusSelected = (value) => (directoryRt.filterStatus === value ? ' selected' : '');
  const activitySelected = (value) => (directoryRt.filterActivity === value ? ' selected' : '');
  return `
    <div class="clinical-directory-toolbar">
      <label class="clinical-directory-search-wrap">
        <span class="visually-hidden">Buscar usuario</span>
        <input type="search" id="clinical-directory-search" class="profile-input clinical-directory-search" placeholder="Buscar @usuario o nombre…" value="${escapeAttr(directoryRt.filterQuery)}" autocomplete="off">
      </label>
      <label class="clinical-directory-filter">
        <span class="clinical-directory-filter-label">Actividad</span>
        <select id="clinical-directory-activity-filter" class="profile-input">
          <option value="all"${activitySelected('all')}>Todas</option>
          <option value="active"${activitySelected('active')}>Activos (24 h)</option>
          <option value="inactive"${activitySelected('inactive')}>Inactivos</option>
        </select>
      </label>
      <label class="clinical-directory-filter">
        <span class="clinical-directory-filter-label">Equipo</span>
        <select id="clinical-directory-status-filter" class="profile-input">
          <option value="all"${statusSelected('all')}>Todos</option>
          <option value="unassigned"${statusSelected('unassigned')}>Sin equipo</option>
          <option value="assigned"${statusSelected('assigned')}>Con equipo</option>
        </select>
      </label>
      <label class="clinical-directory-filter">
        <span class="clinical-directory-filter-label">Sala</span>
        <select id="clinical-directory-sala-filter" class="profile-input">
          <option value=""${directoryRt.filterSala ? '' : ' selected'}>Todas</option>
          ${salaOptions}
        </select>
      </label>
      <span class="clinical-directory-match-count" aria-live="polite"></span>
    </div>`;
}

/** @param {HTMLElement} host */
export function applyDirectoryFilters(host) {
  const searchEl = host.querySelector('#clinical-directory-search');
  const statusEl = host.querySelector('#clinical-directory-status-filter');
  const salaEl = host.querySelector('#clinical-directory-sala-filter');
  const activityEl = host.querySelector('#clinical-directory-activity-filter');
  const countEl = host.querySelector('.clinical-directory-match-count');

  if (searchEl instanceof HTMLInputElement) directoryRt.filterQuery = searchEl.value;
  if (statusEl instanceof HTMLSelectElement) directoryRt.filterStatus = statusEl.value;
  if (salaEl instanceof HTMLSelectElement) directoryRt.filterSala = salaEl.value;
  if (activityEl instanceof HTMLSelectElement) directoryRt.filterActivity = activityEl.value;

  const filters = {
    query: directoryRt.filterQuery,
    status: directoryRt.filterStatus,
    sala: directoryRt.filterSala,
    activity: directoryRt.filterActivity,
  };

  let visible = 0;
  let total = 0;
  host.querySelectorAll('.clinical-lan-user-card').forEach((card) => {
    total += 1;
    const show = directoryUserMatchesFilters(
      {
        search: card.dataset.search || '',
        hasTeam: card.dataset.hasTeam === '1',
        sala: card.dataset.sala || '',
        activityTier: card.dataset.activityTier || 'unknown',
      },
      filters
    );
    card.hidden = !show;
    card.classList.toggle('clinical-lan-user-card--filtered-out', !show);
    if (show) visible += 1;
  });

  host.querySelectorAll('.clinical-directory-rank-group').forEach((group) => {
    const cards = group.querySelectorAll('.clinical-lan-user-card');
    let visibleInGroup = 0;
    for (const card of cards) {
      if (!card.hidden) visibleInGroup += 1;
    }
    const groupCountEl = group.querySelector('.clinical-directory-rank-group-count');
    const totalInGroup = cards.length;
    if (groupCountEl) {
      groupCountEl.textContent =
        visibleInGroup === totalInGroup ? String(totalInGroup) : `${visibleInGroup}/${totalInGroup}`;
    }
    const anyVisible = visibleInGroup > 0;
    group.hidden = !anyVisible;
    group.classList.toggle('clinical-directory-rank-group--filtered-out', !anyVisible);
  });

  if (countEl) {
    countEl.textContent =
      visible === total ? `${total} usuarios` : `Mostrando ${visible} de ${total}`;
  }
}

function runDirectoryFiltersFromUi() {
  const host = directoryUsersModalBodyEl();
  if (host?.querySelector('.clinical-directory-rank-groups')) applyDirectoryFilters(host);
}

/** Re-bind filter controls after each directory render (innerHTML replaces nodes). */
export function bindDirectoryFilterControls(host) {
  if (!host) return;
  if (host._lanDirFilterAbort) host._lanDirFilterAbort.abort();
  const ac = new AbortController();
  host._lanDirFilterAbort = ac;
  const { signal } = ac;
  const apply = () => applyDirectoryFilters(host);

  const searchEl = host.querySelector('#clinical-directory-search');
  if (searchEl instanceof HTMLInputElement) {
    searchEl.addEventListener('input', apply, { signal });
    searchEl.addEventListener('search', apply, { signal });
  }
  for (const id of LAN_DIRECTORY_FILTER_SELECT_IDS) {
    const el = host.querySelector(`#${id}`);
    if (el instanceof HTMLSelectElement) el.addEventListener('change', apply, { signal });
  }
}

/** One-time delegation on modal backdrop (survives panel-body innerHTML swaps). */
export function ensureDirectoryFilterDelegation() {
  const bd = directoryUsersModalBackdropEl();
  if (!bd || bd._rpcDirectoryFilterDelegated) return;
  bd._rpcDirectoryFilterDelegated = true;
  bd.addEventListener('input', (ev) => {
    if (!(ev.target instanceof HTMLInputElement)) return;
    if (ev.target.id !== 'clinical-directory-search') return;
    runDirectoryFiltersFromUi();
  });
  bd.addEventListener('change', (ev) => {
    if (!(ev.target instanceof HTMLSelectElement)) return;
    if (!LAN_DIRECTORY_FILTER_SELECT_IDS.has(ev.target.id)) return;
    runDirectoryFiltersFromUi();
  });
}

