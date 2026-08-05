import {
  syncClinicalContextBarVisibility
} from "/mobile/js/chunks/chunk-LBCUQ32L.js";
import {
  rt
} from "/mobile/js/chunks/chunk-LSPMPOB5.js";
import {
  CENSUS_TEAM_FILTER_UNASSIGNED,
  censusFiltersUseFullTeamCatalog,
  censusTeamCatalogForFilters,
  elevatedPatientFilters,
  ensureTeamAssignedPatientsOnDevice,
  filterPatientsForGuardiaCensus,
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForLanPatientApply,
  patientsBridge,
  readCensusFiltersCollapsed,
  reconcileCensusTeamFilterForSala,
  renderGuardiaCensusGrid,
  resolveCensusTeamFilterId,
  writeCensusFiltersCollapsed,
  writeElevatedTeamFilterPreference
} from "/mobile/js/chunks/chunk-GQ4IO4LN.js";
import {
  shouldEnforceTeamPatientMirror,
  shouldShowClinicalCensusFilters
} from "/mobile/js/chunks/chunk-N73GQSRB.js";
import {
  filterPatientsForPitchTour,
  isGuardiaMode
} from "/mobile/js/chunks/chunk-4FTQ7XEU.js";
import {
  patients
} from "/mobile/js/chunks/chunk-CLJUGM4X.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-64JY3O3H.js";
import {
  CLINICAL_SALA_VALUES
} from "/mobile/js/chunks/chunk-CRJYUJ23.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TSLGFHIE.js";

// public/js/features/patients-scope-filters-bar.mjs
function buildCensusFiltersBarHtml(user, mobileSidebar) {
  const showSalaFilter = !mobileSidebar || censusFiltersUseFullTeamCatalog(user);
  const salaBlock = showSalaFilter ? '<label class="clinical-census-filter"><span>Sala</span><select id="clinical-filter-sala" class="profile-input"><option value="__all__">Todas</option>' + CLINICAL_SALA_VALUES.map((s) => `<option value="${s}">${s}</option>`).join("") + "</select></label>" : "";
  return '<button type="button" id="btn-clinical-census-filters-toggle" class="clinical-census-filters-toggle" aria-expanded="true" aria-controls="clinical-census-filters-body"><span class="clinical-census-filters-toggle-label">Filtros censo</span><span class="clinical-census-filters-chevron" aria-hidden="true"></span></button><div id="clinical-census-filters-body" class="clinical-census-filters-body">' + salaBlock + '<label class="clinical-census-filter"><span>Equipo</span><select id="clinical-filter-team" class="profile-input"><option value="">Todos los equipos</option><option value="__unassigned__">Sin equipo asignado</option></select></label><label class="clinical-census-filter"><span>Servicio</span><input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar\u2026" autocomplete="off"></label></div>';
}
function wireCensusFiltersCollapse(bar) {
  const applyCensusFiltersCollapsedUi = (collapsed) => {
    const toggleBtn2 = document.getElementById("btn-clinical-census-filters-toggle");
    const body = document.getElementById("clinical-census-filters-body");
    if (!toggleBtn2 || !body) return;
    toggleBtn2.setAttribute("aria-expanded", collapsed ? "false" : "true");
    body.hidden = collapsed;
    bar.classList.toggle("is-collapsed", collapsed);
  };
  applyCensusFiltersCollapsedUi(readCensusFiltersCollapsed());
  const toggleBtn = bar.querySelector("#btn-clinical-census-filters-toggle");
  if (toggleBtn && !toggleBtn._rpcCensusToggleWired) {
    toggleBtn._rpcCensusToggleWired = true;
    toggleBtn.addEventListener("click", () => {
      const next = !bar.classList.contains("is-collapsed");
      writeCensusFiltersCollapsed(next);
      applyCensusFiltersCollapsedUi(next);
    });
  }
}
function wireCensusFilterInputs(bar, refreshCensusViews) {
  wireCensusFiltersCollapse(bar);
  const salaSel = bar.querySelector("#clinical-filter-sala");
  const teamSel = bar.querySelector("#clinical-filter-team");
  const serviceInp = bar.querySelector("#clinical-filter-service");
  if (salaSel) {
    salaSel.addEventListener("change", () => {
      elevatedPatientFilters.sala = String(salaSel.value || "__all__");
      syncCensusTeamFilterSelect(clinicalSessionContext.user);
      refreshCensusViews();
    });
  }
  if (teamSel) {
    teamSel.addEventListener("change", () => {
      elevatedPatientFilters.teamId = String(teamSel.value || "");
      writeElevatedTeamFilterPreference(elevatedPatientFilters.teamId);
      refreshCensusViews();
    });
  }
  if (serviceInp) {
    serviceInp.addEventListener("input", () => {
      elevatedPatientFilters.service = String(serviceInp.value || "").trim();
      refreshCensusViews();
    });
  }
}
function createCensusFiltersBar(user, filtersMount, mobileSidebar) {
  const bar = document.createElement("div");
  bar.id = "clinical-census-filters";
  bar.className = "clinical-census-filters clinical-census-filters--toolbar" + (mobileSidebar ? " clinical-census-filters--mobile-sidebar" : "");
  bar.innerHTML = buildCensusFiltersBarHtml(user, mobileSidebar);
  if (bar.parentElement && bar.parentElement !== filtersMount) {
    bar.remove();
  }
  filtersMount.appendChild(bar);
  filtersMount.hidden = false;
  filtersMount.setAttribute("aria-hidden", "false");
  return bar;
}
function syncCensusTeamFilterSelect(user) {
  const teamSel = document.getElementById("clinical-filter-team");
  if (!teamSel) return;
  const teams = clinicalSessionContext.teams || [];
  const salaFilter = String(elevatedPatientFilters.sala || "__all__");
  const teamsForCatalog = censusTeamCatalogForFilters(user, teams, salaFilter);
  const priorTeamId = String(elevatedPatientFilters.teamId ?? "");
  let teamFilterId = resolveCensusTeamFilterId(user, teamsForCatalog, priorTeamId);
  teamFilterId = reconcileCensusTeamFilterForSala(teamFilterId, teamsForCatalog);
  if (teamFilterId !== priorTeamId) {
    writeElevatedTeamFilterPreference(teamFilterId);
  }
  elevatedPatientFilters.teamId = teamFilterId;
  const unassignedOpt = censusFiltersUseFullTeamCatalog(user) ? `<option value="${CENSUS_TEAM_FILTER_UNASSIGNED}">Sin equipo asignado</option>` : "";
  teamSel.innerHTML = '<option value="">Todos los equipos</option>' + unassignedOpt + teamsForCatalog.map((t) => {
    const id = String(t.team_id || "");
    const label = String(t.name || id).slice(0, 40);
    return `<option value="${id}">${label}</option>`;
  }).join("");
  teamSel.value = teamFilterId;
}
function syncCensusScalarFilterInputs(user) {
  const salaSel = document.getElementById("clinical-filter-sala");
  const serviceInp = document.getElementById("clinical-filter-service");
  if (salaSel && salaSel.value !== elevatedPatientFilters.sala) {
    salaSel.value = elevatedPatientFilters.sala;
  }
  syncCensusTeamFilterSelect(user);
  if (serviceInp && serviceInp.value !== elevatedPatientFilters.service) {
    serviceInp.value = elevatedPatientFilters.service;
  }
}

// public/js/features/patients-scope.mjs
var patientSearchFilter = "";
function getPatientSearchFilter() {
  return patientSearchFilter;
}
function setPatientSearchFilter(val) {
  patientSearchFilter = (val || "").trim().toLowerCase();
}
function patientMatchesSearch(p) {
  if (!patientSearchFilter) return true;
  var q = patientSearchFilter;
  return String(p.nombre || "").toLowerCase().indexOf(q) !== -1 || String(p.registro || "").toLowerCase().indexOf(q) !== -1 || String(p.cuarto || "").toLowerCase().indexOf(q) !== -1 || String(p.cama || "").toLowerCase().indexOf(q) !== -1 || String(p.servicio || "").toLowerCase().indexOf(q) !== -1 || String(p.area || "").toLowerCase().indexOf(q) !== -1;
}
function patientsVisibleInSidebar() {
  const base = filterPatientsForPitchTour(patients);
  if (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForLanPatientApply()) {
    return [];
  }
  return filterPatientsForGuardiaCensus2(base);
}
function pickDefaultVisiblePatientId() {
  const visible = patientsVisibleInSidebar();
  if (!visible.length) return null;
  const activeId = rt.getActiveId();
  if (activeId != null && visible.some(function(p) {
    return String(p.id) === String(activeId);
  })) {
    return activeId;
  }
  return visible[0].id;
}
function ensureActivePatientInSidebarScope() {
  const nextId = pickDefaultVisiblePatientId();
  if (nextId != null) {
    patientsBridge.selectPatient(nextId);
    return true;
  }
  if (rt.getActiveId() == null) return false;
  rt.setActiveId(null);
  const pv = document.getElementById("patient-view");
  const es = document.getElementById("empty-state");
  if (pv) pv.style.display = "none";
  if (es) es.style.display = "flex";
  rt.syncWorkContextChrome();
  return false;
}
function reselectIfActivePatientHidden(visiblePatients) {
  const activeId = rt.getActiveId();
  if (activeId == null) return false;
  const stillVisible = visiblePatients.some(function(p) {
    return String(p.id) === String(activeId);
  });
  if (stillVisible) return false;
  ensureActivePatientInSidebarScope();
  return true;
}
function filterPatientsForGuardiaCensus2(basePatients) {
  return filterPatientsForGuardiaCensus(
    basePatients,
    clinicalSessionContext.user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap,
    elevatedPatientFilters
  );
}
function syncClinicalCensusFiltersChrome() {
  syncClinicalCensusFiltersBar();
}
function refreshCensusViewsAfterFilterChange() {
  const user = clinicalSessionContext.user;
  if (user) syncCensusScalarFilterInputs(user);
  patientsBridge.renderPatientList();
  if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  if (shouldEnforceTeamPatientMirror()) return;
  void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 5e3 }).then(() => {
    patientsBridge.renderPatientList({ silent: true });
    if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  });
}
function censusFiltersMountEl() {
  if (isMobileWeb()) {
    return document.getElementById("clinical-census-filters-sidebar-mount");
  }
  return document.getElementById("clinical-census-filters-mount");
}
function hideCensusFiltersMounts() {
  ["clinical-census-filters-mount", "clinical-census-filters-sidebar-mount"].forEach(function(id) {
    const mount = document.getElementById(id);
    if (!mount) return;
    mount.hidden = true;
    mount.setAttribute("aria-hidden", "true");
  });
}
function syncClinicalCensusFiltersBar() {
  const user = clinicalSessionContext.user;
  const showFilters = user && shouldShowClinicalCensusFilters(user);
  const filtersMount = censusFiltersMountEl();
  let bar = document.getElementById("clinical-census-filters");
  if (!showFilters || shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForLanPatientApply()) {
    if (bar) bar.remove();
    hideCensusFiltersMounts();
    syncClinicalContextBarVisibility();
    return;
  }
  if (!filtersMount) return;
  try {
    const storedSala = localStorage.getItem("clinical.censusFilterSala");
    if (storedSala) {
      elevatedPatientFilters.sala = storedSala;
      localStorage.removeItem("clinical.censusFilterSala");
    }
  } catch (_e) {
    void _e;
  }
  const mobileSidebar = isMobileWeb();
  if (!bar) {
    bar = createCensusFiltersBar(user, filtersMount, mobileSidebar);
    wireCensusFilterInputs(bar, refreshCensusViewsAfterFilterChange);
  }
  syncCensusScalarFilterInputs(user);
  syncClinicalContextBarVisibility();
}

export {
  getPatientSearchFilter,
  setPatientSearchFilter,
  patientMatchesSearch,
  patientsVisibleInSidebar,
  pickDefaultVisiblePatientId,
  ensureActivePatientInSidebarScope,
  reselectIfActivePatientHidden,
  filterPatientsForGuardiaCensus2 as filterPatientsForGuardiaCensus,
  syncClinicalCensusFiltersChrome,
  syncClinicalCensusFiltersBar
};
//# sourceMappingURL=/js/chunks/chunk-HXTMJLJE.js.map
