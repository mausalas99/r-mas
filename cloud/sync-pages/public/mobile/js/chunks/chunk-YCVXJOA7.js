import {
  getPatientsForDisplay
} from "/mobile/js/chunks/chunk-QEMMR6VK.js";
import {
  syncClinicalContextBarVisibility
} from "/mobile/js/chunks/chunk-JWTFWW4O.js";
import {
  isEaRegistroFormOpenForPatient
} from "/mobile/js/chunks/chunk-HVYKQKG5.js";
import {
  finalizeBulkLabPaste
} from "/mobile/js/chunks/chunk-UWLXNLAN.js";
import {
  openLabBulkPreviewModal
} from "/mobile/js/chunks/chunk-T7RIOEVR.js";
import {
  registerLabPanelRuntime,
  rt as rt2
} from "/mobile/js/chunks/chunk-RMUFSCXL.js";
import {
  rt
} from "/mobile/js/chunks/chunk-SOQEY2U2.js";
import {
  patientsBridge
} from "/mobile/js/chunks/chunk-IUWKNPSX.js";
import {
  CENSUS_TEAM_FILTER_UNASSIGNED,
  buildTeamSelectOptions,
  censusFiltersAreActive,
  censusFiltersUseFullTeamCatalog,
  censusTeamCatalogForFilters,
  elevatedPatientFilters,
  ensureTeamAssignedPatientsOnDevice,
  filterPatientsForGuardiaCensus,
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
  readCensusFiltersCollapsed,
  reconcileCensusTeamFilterForSala,
  renderGuardiaCensusGrid,
  resolveCensusSalaFilterId,
  resolveCensusTeamFilterId,
  shouldEnforceTeamPatientMirror,
  shouldShowClinicalCensusFilters,
  writeCensusFiltersCollapsed,
  writeCensusSalaFilterPreference,
  writeElevatedTeamFilterPreference
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-JNMJGW22.js";
import {
  buildBulkLabPreview
} from "/mobile/js/chunks/chunk-WEOKZTSW.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";
import {
  CLINICAL_SALA_VALUES
} from "/mobile/js/chunks/chunk-K5SBVD6P.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/patients-default-id.mjs
var LAST_PATIENT_LS = "rpc-last-patient-id";
function readLastSelectedPatientId() {
  try {
    return String(localStorage.getItem(LAST_PATIENT_LS) || "").trim();
  } catch {
    return "";
  }
}
function writeLastSelectedPatientId(id) {
  var pid = id == null ? "" : String(id).trim();
  try {
    if (!pid || pid.indexOf("demo-") === 0) {
      localStorage.removeItem(LAST_PATIENT_LS);
      return;
    }
    localStorage.setItem(LAST_PATIENT_LS, pid);
  } catch (_e) {
    void _e;
  }
}
function pickDefaultPatientId(visible, activeId, lastId) {
  if (!Array.isArray(visible) || !visible.length) return null;
  if (idInVisible(visible, activeId)) return activeId;
  if (lastId && idInVisible(visible, lastId)) return lastId;
  var pinned = visible.find(function(p) {
    return p && p.pinned && !p.archived;
  });
  if (pinned) return pinned.id;
  var live = visible.find(function(p) {
    return p && !p.archived;
  });
  return (live || visible[0]).id;
}
function idInVisible(visible, id) {
  if (id == null || id === "") return false;
  var want = String(id);
  return visible.some(function(p) {
    return p && String(p.id) === want;
  });
}

// public/js/features/patients-scope-filters-bar.mjs
var FILTERS_MOUNT_HOME_SELECTOR = "#patient-sidebar .sidebar-header";
var patientFiltersChromeWired = false;
function censusFiltersBarEl() {
  return document.getElementById("clinical-census-filters");
}
function filtersMountHomeEl() {
  return document.querySelector(FILTERS_MOUNT_HOME_SELECTOR);
}
function densitySpacePx() {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--density-space");
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}
function positionFiltersPopover(mount) {
  const home = filtersMountHomeEl();
  if (!home || !mount) return;
  const search = document.querySelector("#patient-sidebar .patient-search-wrap");
  const anchor = search || home;
  const rect = anchor.getBoundingClientRect();
  const pad = 16 * densitySpacePx();
  mount.style.position = "fixed";
  mount.style.top = `${Math.round(rect.bottom + 4)}px`;
  mount.style.left = `${Math.round(rect.left + pad)}px`;
  mount.style.width = `${Math.max(0, Math.round(rect.width - pad * 2))}px`;
  mount.style.right = "auto";
  mount.style.zIndex = "520";
}
function clearFiltersPopoverPosition(mount) {
  if (!mount) return;
  mount.style.position = "";
  mount.style.top = "";
  mount.style.left = "";
  mount.style.width = "";
  mount.style.right = "";
  mount.style.zIndex = "";
}
function attachFiltersMount(mount, open) {
  const home = filtersMountHomeEl();
  if (!mount || !home) return;
  if (open) {
    if (mount.parentElement !== document.body) document.body.appendChild(mount);
    positionFiltersPopover(mount);
    mount.classList.add("clinical-census-filters-mount--floating");
    return;
  }
  mount.classList.remove("clinical-census-filters-mount--floating");
  clearFiltersPopoverPosition(mount);
  if (mount.parentElement !== home) home.appendChild(mount);
}
function applyCensusFiltersCollapsed(collapsed) {
  const bar = censusFiltersBarEl();
  if (!bar) return;
  writeCensusFiltersCollapsed(collapsed);
  syncPatientFiltersTriggerUi(bar, collapsed);
}
function togglePatientCensusFiltersCollapsed() {
  const bar = censusFiltersBarEl();
  if (!bar) return false;
  const willOpen = bar.classList.contains("is-collapsed");
  applyCensusFiltersCollapsed(!willOpen);
  return !willOpen;
}
function initPatientFiltersChrome() {
  if (patientFiltersChromeWired) return;
  patientFiltersChromeWired = true;
  document.addEventListener("click", (event) => {
    const target = (
      /** @type {Element|null} */
      event.target
    );
    if (target?.closest?.("#btn-patient-filters")) return;
    const bar = censusFiltersBarEl();
    if (!bar || bar.classList.contains("is-collapsed")) return;
    const anchor = document.getElementById("patient-filters-anchor");
    const mount = document.getElementById("clinical-census-filters-sidebar-mount");
    if (!target) return;
    if (anchor?.contains(target) || mount?.contains(target) || bar.contains(target)) return;
    applyCensusFiltersCollapsed(true);
  });
  document.addEventListener("keydown", (event) => {
    const bar = censusFiltersBarEl();
    if (event.key === "Escape" && bar && !bar.classList.contains("is-collapsed")) {
      applyCensusFiltersCollapsed(true);
    }
  });
}
function buildCensusFiltersBodyHtml(user, mobileSidebar) {
  const showSalaFilter = !mobileSidebar || censusFiltersUseFullTeamCatalog(user);
  const salaBlock = showSalaFilter ? '<label class="clinical-census-filter"><span>Sala</span><select id="clinical-filter-sala" class="profile-input"><option value="__all__">Todas</option>' + CLINICAL_SALA_VALUES.map((s) => `<option value="${s}">${s}</option>`).join("") + "</select></label>" : "";
  return '<div id="clinical-census-filters-body" class="clinical-census-filters-body">' + salaBlock + '<label class="clinical-census-filter"><span>Equipo</span><select id="clinical-filter-team" class="profile-input"><option value="">Todos los equipos</option><option value="__unassigned__">Sin equipo asignado</option></select></label><label class="clinical-census-filter"><span>Servicio</span><input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar\u2026" autocomplete="off"></label></div>';
}
function syncPatientFiltersTriggerUi(bar, collapsed) {
  const triggerBtn = document.getElementById("btn-patient-filters");
  const mount = document.getElementById("clinical-census-filters-sidebar-mount");
  const body = document.getElementById("clinical-census-filters-body");
  if (!triggerBtn || !mount || !body) return;
  triggerBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  triggerBtn.classList.toggle("btn-patient-filters--open", !collapsed);
  triggerBtn.classList.toggle("btn-patient-filters--active", censusFiltersAreActive());
  mount.hidden = collapsed;
  mount.setAttribute("aria-hidden", collapsed ? "true" : "false");
  body.hidden = collapsed;
  bar.classList.toggle("is-collapsed", collapsed);
  attachFiltersMount(mount, !collapsed);
  const badge = document.getElementById("btn-patient-filters-badge");
  if (badge) badge.hidden = !censusFiltersAreActive();
}
function wirePatientFiltersPopover() {
  initPatientFiltersChrome();
  applyCensusFiltersCollapsed(readCensusFiltersCollapsed());
}
function detachPatientFiltersPopover() {
  const mount = document.getElementById("clinical-census-filters-sidebar-mount");
  if (!mount) return;
  attachFiltersMount(mount, false);
  mount.hidden = true;
  mount.setAttribute("aria-hidden", "true");
}
function wireCensusFilterInputs(bar, refreshCensusViews) {
  wirePatientFiltersPopover();
  const salaSel = bar.querySelector("#clinical-filter-sala");
  const teamSel = bar.querySelector("#clinical-filter-team");
  const serviceInp = bar.querySelector("#clinical-filter-service");
  const onFilterChange = () => {
    const currentBar = censusFiltersBarEl();
    if (currentBar) {
      syncPatientFiltersTriggerUi(currentBar, currentBar.classList.contains("is-collapsed"));
    }
    refreshCensusViews();
  };
  if (salaSel) {
    salaSel.addEventListener("change", () => {
      elevatedPatientFilters.sala = String(salaSel.value || "__all__");
      writeCensusSalaFilterPreference(elevatedPatientFilters.sala);
      syncCensusTeamFilterSelect(clinicalSessionContext.user);
      onFilterChange();
    });
  }
  if (teamSel) {
    teamSel.addEventListener("change", () => {
      elevatedPatientFilters.teamId = String(teamSel.value || "");
      writeElevatedTeamFilterPreference(elevatedPatientFilters.teamId);
      onFilterChange();
    });
  }
  if (serviceInp) {
    serviceInp.addEventListener("input", () => {
      elevatedPatientFilters.service = String(serviceInp.value || "").trim();
      onFilterChange();
    });
  }
}
function createCensusFiltersBar(user, filtersMount, mobileSidebar) {
  const bar = document.createElement("div");
  bar.id = "clinical-census-filters";
  bar.className = "clinical-census-filters clinical-census-filters--popover" + (mobileSidebar ? " clinical-census-filters--mobile-sidebar" : "");
  bar.innerHTML = buildCensusFiltersBodyHtml(user, mobileSidebar);
  if (bar.parentElement && bar.parentElement !== filtersMount) {
    bar.remove();
  }
  filtersMount.appendChild(bar);
  const collapsed = readCensusFiltersCollapsed();
  bar.classList.toggle("is-collapsed", collapsed);
  filtersMount.hidden = collapsed;
  filtersMount.setAttribute("aria-hidden", collapsed ? "true" : "false");
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
  const groupBySala = censusFiltersUseFullTeamCatalog(user) && (!salaFilter || salaFilter === "__all__");
  teamSel.innerHTML = '<option value="">Todos los equipos</option>' + unassignedOpt + buildTeamSelectOptions(teamsForCatalog, teamFilterId, { groupBySala });
  teamSel.value = teamFilterId;
}
function syncCensusScalarFilterInputs(user) {
  const salaSel = document.getElementById("clinical-filter-sala");
  const serviceInp = document.getElementById("clinical-filter-service");
  const salaFilterId = resolveCensusSalaFilterId(user);
  if (elevatedPatientFilters.sala !== salaFilterId) {
    elevatedPatientFilters.sala = salaFilterId;
  }
  if (salaSel && salaSel.value !== elevatedPatientFilters.sala) {
    salaSel.value = elevatedPatientFilters.sala;
  }
  syncCensusTeamFilterSelect(user);
  if (serviceInp && serviceInp.value !== elevatedPatientFilters.service) {
    serviceInp.value = elevatedPatientFilters.service;
  }
  const bar = document.getElementById("clinical-census-filters");
  if (bar) {
    syncPatientFiltersTriggerUi(bar, bar.classList.contains("is-collapsed"));
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
  const base = getPatientsForDisplay(() => getPatients());
  if (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    return [];
  }
  return filterPatientsForGuardiaCensus2(base);
}
function pickDefaultVisiblePatientId() {
  return pickDefaultPatientId(
    patientsVisibleInSidebar(),
    rt.getActiveId(),
    readLastSelectedPatientId()
  );
}
function patientViewIsOpen() {
  var pv = document.getElementById("patient-view");
  if (!pv) return false;
  return pv.style.display !== "none";
}
function ensureActivePatientInSidebarScope() {
  const nextId = pickDefaultVisiblePatientId();
  if (nextId != null) {
    var already = String(rt.getActiveId()) === String(nextId) && patientViewIsOpen();
    if (!already) patientsBridge.selectPatient(nextId);
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
  if (isEaRegistroFormOpenForPatient(activeId)) return false;
  var activePatient = getPatients().find(function(p) {
    return String(p.id) === String(activeId);
  });
  if (activePatient && activePatient.isDemo) return false;
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
function togglePatientCensusFilters(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  syncClinicalCensusFiltersBar();
  togglePatientCensusFiltersCollapsed();
}
function refreshCensusViewsAfterFilterChange() {
  const user = clinicalSessionContext.user;
  if (user) syncCensusScalarFilterInputs(user);
  patientsBridge.renderPatientList({ force: true });
  if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  if (shouldEnforceTeamPatientMirror()) return;
  void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 5e3 }).then(() => {
    patientsBridge.renderPatientList({ silent: true });
    if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  });
}
function censusFiltersMountEl() {
  return document.getElementById("clinical-census-filters-sidebar-mount");
}
function syncPatientFiltersButton(show) {
  const btn = document.getElementById("btn-patient-filters");
  const badge = document.getElementById("btn-patient-filters-badge");
  if (!btn) return;
  btn.hidden = !show;
  btn.setAttribute("aria-hidden", show ? "false" : "true");
  if (!show) {
    btn.classList.remove("btn-patient-filters--open", "btn-patient-filters--active");
    btn.setAttribute("aria-expanded", "false");
    if (badge) badge.hidden = true;
    return;
  }
  const active = censusFiltersAreActive();
  btn.classList.toggle("btn-patient-filters--active", active);
  if (badge) badge.hidden = !active;
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
  if (!showFilters || shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    if (bar) bar.remove();
    detachPatientFiltersPopover();
    hideCensusFiltersMounts();
    syncPatientFiltersButton(false);
    syncClinicalContextBarVisibility();
    return;
  }
  if (!filtersMount) return;
  try {
    const storedSala = localStorage.getItem("clinical.censusFilterSala");
    if (storedSala) {
      elevatedPatientFilters.sala = storedSala;
      localStorage.removeItem("clinical.censusFilterSala");
    } else {
      elevatedPatientFilters.sala = resolveCensusSalaFilterId(user);
    }
  } catch (_e) {
    void _e;
  }
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

// public/js/features/lab-repo-import-gate.mjs
function buildLabRepoBulkText(studies) {
  return (studies || []).map(function(s) {
    return String(s.text || "").trim();
  }).filter(Boolean).join("\n\n");
}
function shouldSilentImportLabRepo(ctx) {
  if (ctx.fetchErrors && ctx.fetchErrors.length) {
    return { silent: false, reason: "fetch-errors" };
  }
  if (!ctx.blocks.length) {
    return { silent: false, reason: "no-blocks" };
  }
  var bad = ctx.blocks.filter(function(b) {
    return b.status !== "ok" || !b.canProcess || !b.okReportCount;
  });
  if (bad.length) {
    return { silent: false, reason: "block-issues" };
  }
  if (ctx.activePatientId && ctx.activePatientRegistro && ctx.requestedRegistro && ctx.activePatientRegistro.trim() !== ctx.requestedRegistro.trim()) {
    return { silent: false, reason: "registro-mismatch" };
  }
  return { silent: true, reason: "ok" };
}
function buildLabRepoPreviewBlocks(studies, findPatientByRegistro) {
  var text = buildLabRepoBulkText(studies);
  return buildBulkLabPreview(text, { findPatientByRegistro });
}
function isLabRepoConnectionError(message) {
  return /lab-repo-http-|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(
    String(message || "")
  );
}
function resolveLabRepoFetchUserMessage(studies, errors) {
  if (studies && studies.length) return null;
  var list = errors || [];
  if (!list.length) {
    return {
      toast: "Sin estudios en el rango seleccionado",
      type: "info"
    };
  }
  var first = list[0] || {};
  var code = String(first.message || "");
  if (isLabRepoConnectionError(code)) {
    return {
      toast: "No se pudo conectar al repositorio de laboratorio (revisa red hospital)",
      type: "error"
    };
  }
  if (code === "no-search-results") {
    return {
      toast: "No hay estudios para ese registro en el portal",
      type: "info"
    };
  }
  if (code === "no-rows-in-range") {
    var total = first.totalRows;
    if (typeof total === "number" && total > 0) {
      return {
        toast: "Hay " + total + " estudio" + (total === 1 ? "" : "s") + " para ese registro pero ninguno en el rango de fechas. Ampl\xEDa Desde/Hasta.",
        type: "info"
      };
    }
    return {
      toast: "Sin estudios en el rango seleccionado",
      type: "info"
    };
  }
  if (list.every(function(e) {
    return e.folio;
  })) {
    return {
      toast: "No se pudieron descargar los reportes (" + list.length + " fallos)",
      type: "error"
    };
  }
  return {
    toast: "Error al consultar el repositorio: " + code,
    type: "error"
  };
}

// public/js/features/lab-repo-import.mjs
function labRepoDefaultDateRange() {
  var hasta = /* @__PURE__ */ new Date();
  hasta.setHours(0, 0, 0, 0);
  var desde = new Date(hasta);
  desde.setDate(desde.getDate() - 2);
  return { desde, hasta };
}
function labRepoToDateInputValue(d) {
  var pad = function(n) {
    return String(n).padStart(2, "0");
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function syncLabRepoDateField(input) {
  if (!input) return;
  input.dispatchEvent(new Event("rpc-date-refresh"));
}
function parseDateInputDay(isoDay) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDay || "").trim());
  if (!m) return null;
  var y = Number(m[1]);
  var mo = Number(m[2]) - 1;
  var day = Number(m[3]);
  var dt = new Date(y, mo, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day) return null;
  return dt;
}
function labRepoFetchRangeFromDateInputs(desdeDay, hastaDay) {
  var desde = parseDateInputDay(desdeDay);
  var hasta = parseDateInputDay(hastaDay);
  if (!desde || !hasta) return null;
  desde.setHours(0, 0, 0, 0);
  hasta.setHours(23, 59, 59, 999);
  if (desde.getTime() > hasta.getTime()) return null;
  return { desde, hasta };
}
function getActivePatient() {
  return typeof rt2.getActivePatient === "function" ? rt2.getActivePatient() : null;
}
function readLabRepoImportFields() {
  var registroEl = document.getElementById("lab-repo-registro");
  var desdeEl = document.getElementById("lab-repo-desde");
  var hastaEl = document.getElementById("lab-repo-hasta");
  if (!registroEl || !desdeEl || !hastaEl) return null;
  return {
    registro: String(registroEl.value || "").trim(),
    desde: String(desdeEl.value || "").trim(),
    hasta: String(hastaEl.value || "").trim()
  };
}
function validateLabRepoImportFields(fields) {
  if (!fields) return false;
  if (!fields.registro) {
    rt2.showToast("Indica el registro", "error");
    return false;
  }
  if (!fields.desde || !fields.hasta) {
    rt2.showToast("Indica el rango de fechas", "error");
    return false;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt2.showToast("Importaci\xF3n del repositorio solo en la app de escritorio", "warn");
    return false;
  }
  return true;
}
function setLabRepoImportBusy(busy) {
  var btnImport = document.getElementById("lab-repo-import-confirm");
  if (!btnImport) return;
  btnImport.disabled = busy;
  btnImport.setAttribute("aria-disabled", busy ? "true" : "false");
}
function toastLabRepoFetchOutcome(studies, errors) {
  var msg = resolveLabRepoFetchUserMessage(studies, errors);
  if (!msg) return true;
  rt2.showToast(msg.toast, msg.type);
  return false;
}
function finishLabRepoImport(studies, registro, errors) {
  var blocks = buildLabRepoPreviewBlocks(studies, rt2.findPatientByRegistro);
  var active = getActivePatient();
  var gate = shouldSilentImportLabRepo({
    blocks,
    fetchErrors: errors || [],
    requestedRegistro: registro,
    activePatientRegistro: active && active.registro ? String(active.registro) : "",
    activePatientId: rt2.getActiveId ? rt2.getActiveId() : null
  });
  var text = buildLabRepoBulkText(studies);
  var totalOk = blocks.reduce(function(n, b) {
    return n + (b.okReportCount || 0);
  }, 0);
  closeLabRepoImportModal();
  if (gate.silent) {
    finalizeBulkLabPaste(text, blocks, totalOk, { replaceOnMatch: true });
    return;
  }
  openLabBulkPreviewModal({
    blocks,
    sourceText: text,
    onConfirm: function() {
      finalizeBulkLabPaste(text, blocks, totalOk, { replaceOnMatch: true });
    }
  });
}
function registerLabRepoImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}
function openLabRepoImportModal() {
  if (typeof window !== "undefined" && typeof window.openLabRepoBatchModal === "function") {
    window.openLabRepoBatchModal();
    return;
  }
  rt2.showToast("Usa Actualizar labs en Laboratorio", "info");
}
function closeLabRepoImportModal() {
  var modal = document.getElementById("lab-repo-import-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
}
async function confirmLabRepoImport() {
  var fields = readLabRepoImportFields();
  if (!validateLabRepoImportFields(fields)) return;
  var range = labRepoFetchRangeFromDateInputs(fields.desde, fields.hasta);
  if (!range) {
    rt2.showToast("Revisa el rango de fechas (Desde no puede ser posterior a Hasta)", "error");
    return;
  }
  setLabRepoImportBusy(true);
  rt2.showToast("Consultando repositorio\u2026", "info");
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: fields.registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var errors = res && res.errors || [];
    if (!toastLabRepoFetchOutcome(studies, errors)) return;
    finishLabRepoImport(studies, fields.registro, errors);
  } catch (_unused) {
    void _unused;
    rt2.showToast("Error al consultar el repositorio", "error");
  } finally {
    setLabRepoImportBusy(false);
  }
}

export {
  writeLastSelectedPatientId,
  getPatientSearchFilter,
  setPatientSearchFilter,
  patientMatchesSearch,
  patientsVisibleInSidebar,
  pickDefaultVisiblePatientId,
  ensureActivePatientInSidebarScope,
  reselectIfActivePatientHidden,
  filterPatientsForGuardiaCensus2 as filterPatientsForGuardiaCensus,
  syncClinicalCensusFiltersChrome,
  togglePatientCensusFilters,
  syncClinicalCensusFiltersBar,
  buildLabRepoBulkText,
  shouldSilentImportLabRepo,
  buildLabRepoPreviewBlocks,
  labRepoDefaultDateRange,
  labRepoToDateInputValue,
  syncLabRepoDateField,
  labRepoFetchRangeFromDateInputs,
  registerLabRepoImportRuntime,
  openLabRepoImportModal,
  closeLabRepoImportModal,
  confirmLabRepoImport
};
//# sourceMappingURL=/js/chunks/chunk-YCVXJOA7.js.map
