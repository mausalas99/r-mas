import { CLINICAL_SALA_VALUES } from '../../../lib/clinical-salas.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { buildTeamSelectOptions } from './clinical-teams/team-select-options.mjs';
import { censusFiltersAreActive, elevatedPatientFilters } from './clinical-census-filters-state.mjs';
import {
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
  resolveCensusTeamFilterId,
  writeElevatedTeamFilterPreference,
  CENSUS_TEAM_FILTER_UNASSIGNED,
  reconcileCensusTeamFilterForSala,
  censusTeamCatalogForFilters,
  censusFiltersUseFullTeamCatalog,
} from './clinical-census-filters-ui.mjs';

const FILTERS_MOUNT_HOME_SELECTOR = '#patient-sidebar .sidebar-header';
let patientFiltersChromeWired = false;

function censusFiltersBarEl() {
  return document.getElementById('clinical-census-filters');
}

function filtersMountHomeEl() {
  return document.querySelector(FILTERS_MOUNT_HOME_SELECTOR);
}

function densitySpacePx() {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--density-space');
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}

function positionFiltersPopover(mount) {
  const home = filtersMountHomeEl();
  if (!home || !mount) return;
  const rect = home.getBoundingClientRect();
  const pad = 16 * densitySpacePx();
  mount.style.position = 'fixed';
  mount.style.top = `${Math.round(rect.bottom + 4)}px`;
  mount.style.left = `${Math.round(rect.left + pad)}px`;
  mount.style.width = `${Math.max(0, Math.round(rect.width - pad * 2))}px`;
  mount.style.right = 'auto';
  mount.style.zIndex = '520';
}

function clearFiltersPopoverPosition(mount) {
  if (!mount) return;
  mount.style.position = '';
  mount.style.top = '';
  mount.style.left = '';
  mount.style.width = '';
  mount.style.right = '';
  mount.style.zIndex = '';
}

function attachFiltersMount(mount, open) {
  const home = filtersMountHomeEl();
  if (!mount || !home) return;
  if (open) {
    if (mount.parentElement !== document.body) document.body.appendChild(mount);
    positionFiltersPopover(mount);
    mount.classList.add('clinical-census-filters-mount--floating');
    return;
  }
  mount.classList.remove('clinical-census-filters-mount--floating');
  clearFiltersPopoverPosition(mount);
  if (mount.parentElement !== home) home.appendChild(mount);
}

function applyCensusFiltersCollapsed(collapsed) {
  const bar = censusFiltersBarEl();
  if (!bar) return;
  writeCensusFiltersCollapsed(collapsed);
  syncPatientFiltersTriggerUi(bar, collapsed);
}

/** Toggle sidebar census filter popover (window handler + tests). */
export function togglePatientCensusFiltersCollapsed() {
  const bar = censusFiltersBarEl();
  if (!bar) return false;
  const willOpen = bar.classList.contains('is-collapsed');
  applyCensusFiltersCollapsed(!willOpen);
  return !willOpen;
}

export function initPatientFiltersChrome() {
  if (patientFiltersChromeWired) return;
  patientFiltersChromeWired = true;

  document.addEventListener('click', (event) => {
    const target = /** @type {Element|null} */ (event.target);
    if (target?.closest?.('#btn-patient-filters')) return;
    const bar = censusFiltersBarEl();
    if (!bar || bar.classList.contains('is-collapsed')) return;
    const anchor = document.getElementById('patient-filters-anchor');
    const mount = document.getElementById('clinical-census-filters-sidebar-mount');
    if (!target) return;
    if (anchor?.contains(target) || mount?.contains(target) || bar.contains(target)) return;
    applyCensusFiltersCollapsed(true);
  });

  document.addEventListener('keydown', (event) => {
    const bar = censusFiltersBarEl();
    if (event.key === 'Escape' && bar && !bar.classList.contains('is-collapsed')) {
      applyCensusFiltersCollapsed(true);
    }
  });
}

function buildCensusFiltersBodyHtml(user, mobileSidebar) {
  const showSalaFilter = !mobileSidebar || censusFiltersUseFullTeamCatalog(user);
  const salaBlock = showSalaFilter
    ? '<label class="clinical-census-filter"><span>Sala</span>' +
      '<select id="clinical-filter-sala" class="profile-input">' +
      '<option value="__all__">Todas</option>' +
      CLINICAL_SALA_VALUES.map((s) => `<option value="${s}">${s}</option>`).join('') +
      '</select></label>'
    : '';
  return (
    '<div id="clinical-census-filters-body" class="clinical-census-filters-body">' +
    salaBlock +
    '<label class="clinical-census-filter"><span>Equipo</span>' +
    '<select id="clinical-filter-team" class="profile-input">' +
    '<option value="">Todos los equipos</option>' +
    '<option value="__unassigned__">Sin equipo asignado</option>' +
    '</select></label>' +
    '<label class="clinical-census-filter"><span>Servicio</span>' +
    '<input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar…" autocomplete="off">' +
    '</label></div>'
  );
}

function syncPatientFiltersTriggerUi(bar, collapsed) {
  const triggerBtn = document.getElementById('btn-patient-filters');
  const mount = document.getElementById('clinical-census-filters-sidebar-mount');
  const body = document.getElementById('clinical-census-filters-body');
  if (!triggerBtn || !mount || !body) return;
  triggerBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  triggerBtn.classList.toggle('btn-patient-filters--open', !collapsed);
  triggerBtn.classList.toggle('btn-patient-filters--active', censusFiltersAreActive());
  mount.hidden = collapsed;
  mount.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
  body.hidden = collapsed;
  bar.classList.toggle('is-collapsed', collapsed);
  attachFiltersMount(mount, !collapsed);
  const badge = document.getElementById('btn-patient-filters-badge');
  if (badge) badge.hidden = !censusFiltersAreActive();
}

function wirePatientFiltersPopover() {
  initPatientFiltersChrome();
  applyCensusFiltersCollapsed(readCensusFiltersCollapsed());
}

/** Return popover mount to the sidebar when filters chrome is torn down. */
export function detachPatientFiltersPopover() {
  const mount = document.getElementById('clinical-census-filters-sidebar-mount');
  if (!mount) return;
  attachFiltersMount(mount, false);
  mount.hidden = true;
  mount.setAttribute('aria-hidden', 'true');
}

/** @param {HTMLElement} bar @param {() => void} refreshCensusViews */
export function wireCensusFilterInputs(bar, refreshCensusViews) {
  wirePatientFiltersPopover();
  const salaSel = bar.querySelector('#clinical-filter-sala');
  const teamSel = bar.querySelector('#clinical-filter-team');
  const serviceInp = bar.querySelector('#clinical-filter-service');
  const onFilterChange = () => {
    const currentBar = censusFiltersBarEl();
    if (currentBar) {
      syncPatientFiltersTriggerUi(currentBar, currentBar.classList.contains('is-collapsed'));
    }
    refreshCensusViews();
  };
  if (salaSel) {
    salaSel.addEventListener('change', () => {
      elevatedPatientFilters.sala = String(salaSel.value || '__all__');
      syncCensusTeamFilterSelect(clinicalSessionContext.user);
      onFilterChange();
    });
  }
  if (teamSel) {
    teamSel.addEventListener('change', () => {
      elevatedPatientFilters.teamId = String(teamSel.value || '');
      writeElevatedTeamFilterPreference(elevatedPatientFilters.teamId);
      onFilterChange();
    });
  }
  if (serviceInp) {
    serviceInp.addEventListener('input', () => {
      elevatedPatientFilters.service = String(serviceInp.value || '').trim();
      onFilterChange();
    });
  }
}

/** @param {object} user @param {HTMLElement} filtersMount @param {boolean} mobileSidebar */
export function createCensusFiltersBar(user, filtersMount, mobileSidebar) {
  const bar = document.createElement('div');
  bar.id = 'clinical-census-filters';
  bar.className =
    'clinical-census-filters clinical-census-filters--popover' +
    (mobileSidebar ? ' clinical-census-filters--mobile-sidebar' : '');
  bar.innerHTML = buildCensusFiltersBodyHtml(user, mobileSidebar);
  if (bar.parentElement && bar.parentElement !== filtersMount) {
    bar.remove();
  }
  filtersMount.appendChild(bar);
  const collapsed = readCensusFiltersCollapsed();
  bar.classList.toggle('is-collapsed', collapsed);
  filtersMount.hidden = collapsed;
  filtersMount.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
  return bar;
}

/** @param {object} user */
export function syncCensusTeamFilterSelect(user) {
  const teamSel = document.getElementById('clinical-filter-team');
  if (!teamSel) return;
  const teams = clinicalSessionContext.teams || [];
  const salaFilter = String(elevatedPatientFilters.sala || '__all__');
  const teamsForCatalog = censusTeamCatalogForFilters(user, teams, salaFilter);
  const priorTeamId = String(elevatedPatientFilters.teamId ?? '');
  let teamFilterId = resolveCensusTeamFilterId(user, teamsForCatalog, priorTeamId);
  teamFilterId = reconcileCensusTeamFilterForSala(teamFilterId, teamsForCatalog);
  if (teamFilterId !== priorTeamId) {
    writeElevatedTeamFilterPreference(teamFilterId);
  }
  elevatedPatientFilters.teamId = teamFilterId;
  const unassignedOpt = censusFiltersUseFullTeamCatalog(user)
    ? `<option value="${CENSUS_TEAM_FILTER_UNASSIGNED}">Sin equipo asignado</option>`
    : '';
  const groupBySala =
    censusFiltersUseFullTeamCatalog(user) &&
    (!salaFilter || salaFilter === '__all__');
  teamSel.innerHTML =
    '<option value="">Todos los equipos</option>' +
    unassignedOpt +
    buildTeamSelectOptions(teamsForCatalog, teamFilterId, { groupBySala });
  teamSel.value = teamFilterId;
}

/** @param {object} user */
export function syncCensusScalarFilterInputs(user) {
  const salaSel = document.getElementById('clinical-filter-sala');
  const serviceInp = document.getElementById('clinical-filter-service');
  if (salaSel && salaSel.value !== elevatedPatientFilters.sala) {
    salaSel.value = elevatedPatientFilters.sala;
  }
  syncCensusTeamFilterSelect(user);
  if (serviceInp && serviceInp.value !== elevatedPatientFilters.service) {
    serviceInp.value = elevatedPatientFilters.service;
  }
  const bar = document.getElementById('clinical-census-filters');
  if (bar) {
    syncPatientFiltersTriggerUi(bar, bar.classList.contains('is-collapsed'));
  }
}
