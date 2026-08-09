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
  const badge = document.getElementById('btn-patient-filters-badge');
  if (badge) badge.hidden = !censusFiltersAreActive();
}

function wirePatientFiltersPopover(bar) {
  const applyCollapsed = (collapsed) => {
    writeCensusFiltersCollapsed(collapsed);
    syncPatientFiltersTriggerUi(bar, collapsed);
  };

  applyCollapsed(readCensusFiltersCollapsed());

  const triggerBtn = document.getElementById('btn-patient-filters');
  if (triggerBtn && !triggerBtn._rpcPatientFiltersWired) {
    triggerBtn._rpcPatientFiltersWired = true;
    triggerBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const next = !bar.classList.contains('is-collapsed');
      applyCollapsed(next);
    });
  }

  if (!bar._rpcPatientFiltersOutsideWired) {
    bar._rpcPatientFiltersOutsideWired = true;
    document.addEventListener('click', (event) => {
      if (bar.classList.contains('is-collapsed')) return;
      const target = /** @type {Node|null} */ (event.target);
      const anchor = document.getElementById('patient-filters-anchor');
      const mount = document.getElementById('clinical-census-filters-sidebar-mount');
      if (!target) return;
      if (anchor?.contains(target) || mount?.contains(target) || bar.contains(target)) return;
      applyCollapsed(true);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !bar.classList.contains('is-collapsed')) {
        applyCollapsed(true);
      }
    });
  }
}

/** @param {HTMLElement} bar @param {() => void} refreshCensusViews */
export function wireCensusFilterInputs(bar, refreshCensusViews) {
  wirePatientFiltersPopover(bar);
  const salaSel = bar.querySelector('#clinical-filter-sala');
  const teamSel = bar.querySelector('#clinical-filter-team');
  const serviceInp = bar.querySelector('#clinical-filter-service');
  const onFilterChange = () => {
    syncPatientFiltersTriggerUi(bar, bar.classList.contains('is-collapsed'));
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
  filtersMount.hidden = readCensusFiltersCollapsed();
  filtersMount.setAttribute('aria-hidden', readCensusFiltersCollapsed() ? 'true' : 'false');
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
