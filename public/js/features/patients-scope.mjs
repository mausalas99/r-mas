import { getPatients } from '../app-state.mjs';
import {
  pickDefaultPatientId,
  readLastSelectedPatientId,
} from './patients-default-id.mjs';
import {
  ensureTeamAssignedPatientsOnDevice,
  renderGuardiaCensusGrid,
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
} from '../clinical-access-runtime.mjs';
import { shouldEnforceTeamPatientMirror, shouldShowClinicalCensusFilters } from '../clinical-privileges.mjs';
import {
  filterPatientsForGuardiaCensus as filterPatientsForGuardiaCensusCore,
} from './patients-clinical-filter.mjs';
import { censusFiltersAreActive, elevatedPatientFilters } from './clinical-census-filters-state.mjs';
import { resolveCensusSalaFilterId } from './clinical-census-filters-ui.mjs';
import { syncClinicalContextBarVisibility } from './clinical-context-bar.mjs';
import {
  createCensusFiltersBar,
  detachPatientFiltersPopover,
  initPatientFiltersChrome,
  syncCensusScalarFilterInputs,
  togglePatientCensusFiltersCollapsed,
  wireCensusFilterInputs,
} from './patients-scope-filters-bar.mjs';
import { getPatientsForDisplay } from '../clinical-read-model-demo.mjs';
import { isGuardiaMode } from './chrome.mjs';
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { isEaRegistroFormOpenForPatient } from './estado-actual-panel-core.mjs';

let patientSearchFilter = '';

export function getPatientSearchFilter() {
  return patientSearchFilter;
}

export function setPatientSearchFilter(val) {
  patientSearchFilter = (val || '').trim().toLowerCase();
}

export function patientMatchesSearch(p) {
  if (!patientSearchFilter) return true;
  var q = patientSearchFilter;
  return (
    String(p.nombre || '')
      .toLowerCase()
      .indexOf(q) !== -1 ||
    String(p.registro || '')
      .toLowerCase()
      .indexOf(q) !== -1 ||
    String(p.cuarto || '')
      .toLowerCase()
      .indexOf(q) !== -1 ||
    String(p.cama || '')
      .toLowerCase()
      .indexOf(q) !== -1 ||
    String(p.servicio || '')
      .toLowerCase()
      .indexOf(q) !== -1 ||
    String(p.area || '')
      .toLowerCase()
      .indexOf(q) !== -1
  );
}

export function patientsVisibleInSidebar() {
  const base = getPatientsForDisplay(() => getPatients());
  if (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    return [];
  }
  return filterPatientsForGuardiaCensus(base);
}

export function pickDefaultVisiblePatientId() {
  return pickDefaultPatientId(
    patientsVisibleInSidebar(),
    rt.getActiveId(),
    readLastSelectedPatientId()
  );
}

function patientViewIsOpen() {
  var pv = document.getElementById('patient-view');
  if (!pv) return false;
  return pv.style.display !== 'none';
}

export function ensureActivePatientInSidebarScope() {
  const nextId = pickDefaultVisiblePatientId();
  if (nextId != null) {
    var already =
      String(rt.getActiveId()) === String(nextId) && patientViewIsOpen();
    if (!already) patientsBridge.selectPatient(nextId);
    return true;
  }
  if (rt.getActiveId() == null) return false;
  rt.setActiveId(null);
  const pv = document.getElementById('patient-view');
  const es = document.getElementById('empty-state');
  if (pv) pv.style.display = 'none';
  if (es) es.style.display = 'flex';
  rt.syncWorkContextChrome();
  return false;
}

export function reselectIfActivePatientHidden(visiblePatients) {
  const activeId = rt.getActiveId();
  if (activeId == null) return false;
  const stillVisible = visiblePatients.some(function (p) {
    return String(p.id) === String(activeId);
  });
  if (stillVisible) return false;
  // Don't yank the active patient out from under an open "estado actual"
  // registro form (e.g. a background cloud-sync render that recomputes the
  // visible list). The form keeps saving to the patient it was opened for.
  if (isEaRegistroFormOpenForPatient(activeId)) return false;
  ensureActivePatientInSidebarScope();
  return true;
}

export function filterPatientsForGuardiaCensus(basePatients) {
  return filterPatientsForGuardiaCensusCore(
    basePatients,
    clinicalSessionContext.user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap,
    elevatedPatientFilters
  );
}

export function syncClinicalCensusFiltersChrome() {
  syncClinicalCensusFiltersBar();
}

/** Embudo censo — ensure bar exists, then toggle popover. */
export function togglePatientCensusFilters(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  syncClinicalCensusFiltersBar();
  togglePatientCensusFiltersCollapsed();
}

/** Filtros censo — apply toolbar state immediately, then optional LAN census pull. */
export function refreshCensusViewsAfterFilterChange() {
  const user = clinicalSessionContext.user;
  if (user) syncCensusScalarFilterInputs(user);
  // Force flush so coalesced rAF renders cannot drop Equipo/Sala/Servicio changes under load.
  patientsBridge.renderPatientList({ force: true });
  if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  if (shouldEnforceTeamPatientMirror()) return;
  void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 5000 }).then(() => {
    patientsBridge.renderPatientList({ silent: true });
    if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  });
}

function censusFiltersMountEl() {
  return document.getElementById('clinical-census-filters-sidebar-mount');
}

function syncPatientFiltersButton(show) {
  const btn = document.getElementById('btn-patient-filters');
  const badge = document.getElementById('btn-patient-filters-badge');
  if (!btn) return;
  btn.hidden = !show;
  btn.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (!show) {
    btn.classList.remove('btn-patient-filters--open', 'btn-patient-filters--active');
    btn.setAttribute('aria-expanded', 'false');
    if (badge) badge.hidden = true;
    return;
  }
  const active = censusFiltersAreActive();
  btn.classList.toggle('btn-patient-filters--active', active);
  if (badge) badge.hidden = !active;
}

function hideCensusFiltersMounts() {
  ['clinical-census-filters-mount', 'clinical-census-filters-sidebar-mount'].forEach(function (id) {
    const mount = document.getElementById(id);
    if (!mount) return;
    mount.hidden = true;
    mount.setAttribute('aria-hidden', 'true');
  });
}

export function syncClinicalCensusFiltersBar() {
  const user = clinicalSessionContext.user;
  const showFilters = user && shouldShowClinicalCensusFilters(user);
  const filtersMount = censusFiltersMountEl();
  let bar = document.getElementById('clinical-census-filters');
  if (
    !showFilters ||
    (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply())
  ) {
    if (bar) bar.remove();
    detachPatientFiltersPopover();
    hideCensusFiltersMounts();
    syncPatientFiltersButton(false);
    syncClinicalContextBarVisibility();
    return;
  }
  if (!filtersMount) return;
  try {
    const storedSala = localStorage.getItem('clinical.censusFilterSala');
    if (storedSala) {
      elevatedPatientFilters.sala = storedSala;
      localStorage.removeItem('clinical.censusFilterSala');
    } else {
      elevatedPatientFilters.sala = resolveCensusSalaFilterId(user);
    }
  } catch (_e) { void _e; }
  if (!bar) {
    bar = createCensusFiltersBar(user, filtersMount, true);
    wireCensusFilterInputs(bar, refreshCensusViewsAfterFilterChange);
  } else {
    initPatientFiltersChrome();
  }
  syncCensusScalarFilterInputs(user);
  syncPatientFiltersButton(true);
  syncClinicalContextBarVisibility();
}
