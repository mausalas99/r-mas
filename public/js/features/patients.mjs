// Patient list, ronda navigation, pin/archive, add/save modal, delete — extracted from app.js
import { CLINICAL_SALA_VALUES } from '../../../lib/clinical-salas.mjs';
import { storage } from '../storage.js';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  medPharmProfileByPatient,
  listadoProblemas,
  vpoByPatient,
  saveState,
  flushSaveState,
} from '../app-state.mjs';
import { stashMedInputForPatient } from './medications.mjs';
import { stashMedPharmPasteForPatient } from './med-pharm-profile-panel.mjs';
import { stashVpoForPatient } from './vpo.mjs';
import { flushRecetaHuDraftIfMountedFor } from './receta-hu.mjs';
import { validatePatientForSave, buildExpedienteAdvice } from '../patient-validation.mjs';
import { stampPatientRegistrationMeta } from '../patient-registration-meta.mjs';
import { shakePatientFieldsForError } from '../ui-motion.mjs';
import {
  isModeSala,
  getDefaultServicio,
  getDefaultCuarto,
  getDefaultCama,
} from '../mode-features.mjs';
import {
  ensureTeamAssignedPatientsOnDevice,
  renderGuardiaCensusGrid,
  syncGuardiaCensusPanelVisibility,
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../clinical-access-runtime.mjs';
import {
  evaluateClinicalScope,
  patientMatchesTeam,
  teamForMemberCycle,
  stampPatientClinicalSala,
  resolvePatientTeamIdFromAssignments,
  patientHasExplicitTeamAssignment,
} from '../clinico-access.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { isMobileWeb } from '../mobile-web.mjs';
import {
  filterPatientsForGuardiaCensus as filterPatientsForGuardiaCensusCore,
  patientForScopeEvaluate,
} from './patients-clinical-filter.mjs';
import { elevatedPatientFilters } from './clinical-census-filters-state.mjs';
import {
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
  resolveElevatedTeamFilterId,
  resolveActiveTeamFilterId,
  writeElevatedTeamFilterPreference,
  isTeamIdInCensusCatalog,
  CENSUS_TEAM_FILTER_UNASSIGNED,
  filterTeamsForCensusSala,
  reconcileCensusTeamFilterForSala,
} from './clinical-census-filters-ui.mjs';
import { syncClinicalContextBarVisibility } from './clinical-context-bar.mjs';
import { getTourDemoAdmitDefaults } from '../tour-demo-patient.mjs';
import { isManejoSectionHidden, migrateGranularInner } from '../expediente-tabs.mjs';
import { applyProfileToNoteIfEmpty } from './notes-indicaciones.mjs';
import { applyNotaFormatScaffoldIfEmpty } from '../profile-templates.mjs';
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { ensureParsedLabHistoryCached } from '../lab-history-set.mjs';
import { t, getUiDensity, isGuardiaMode, isPaseMode } from './chrome.mjs';
import {
  removePatientLocally,
  rememberPatientDeleteTombstone,
  getActiveLiveSyncRoomId,
  lanSyncPatientArchivedFlag,
  isLanSessionConfiguredForRest,
  purgeLanPatientFromHost,
} from './lan-sync.mjs';
import { stagePatientDelete } from '../patient-delete-sync.mjs';
import { ensureMonitoreo } from './estado-actual-data.mjs';
import { filterPatientsForPitchTour } from '../tour-pitch-demo-seed.mjs';
import {
  buildPatientListZones,
  buildRondaNavIds,
  trySilentPatientListPatch,
  updatePatientListDomIncremental,
} from '../patient-list-incremental.mjs';

import {
  adoptTourPatientOnCommit,
  DEMO_PATIENT_ID,
  DEMO_REGISTRO,
  findTourDemoPatientByRegistro,
  shouldSelectTourPrimaryAfterLabCommit,
  shouldTourStayOnLabAfterLabCommit,
} from '../tour-demo-patient.mjs';
import {
  assignPatientToTeamClinical,
  readPatientRegistrationTeamId,
  syncPatientRegistrationTeamSelect,
} from '../patient-team-assign-ui.mjs';
import {
  confirmTeamlessPatientSave,
  maybePromptTeamOnboardingForRegistration,
  shouldWarnTeamlessPatientSave,
  syncPatientRegistrationTeamPolicyUi,
} from '../patient-teamless-policy.mjs';

function patientsVisibleInSidebar() {
  const base = filterPatientsForPitchTour(patients);
  return filterPatientsForGuardiaCensus(base);
}

/** First sidebar-visible patient, or keep current selection when still visible. */
export function pickDefaultVisiblePatientId() {
  const visible = patientsVisibleInSidebar();
  if (!visible.length) return null;
  const activeId = rt.getActiveId();
  if (
    activeId != null &&
    visible.some(function (p) {
      return String(p.id) === String(activeId);
    })
  ) {
    return activeId;
  }
  return visible[0].id;
}

/** Boot / filter changes: active chart must belong to the visible equipo/censo list. */
export function ensureActivePatientInSidebarScope() {
  const nextId = pickDefaultVisiblePatientId();
  if (nextId != null) {
    selectPatient(nextId);
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

function reselectIfActivePatientHidden(visiblePatients) {
  const activeId = rt.getActiveId();
  if (activeId == null) return false;
  const stillVisible = visiblePatients.some(function (p) {
    return String(p.id) === String(activeId);
  });
  if (stillVisible) return false;
  ensureActivePatientInSidebarScope();
  return true;
}

/** Same scope + Filtros censo rules as the sidebar, for Guardia board census. */
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

function syncClinicalCensusFiltersBar() {
  const user = clinicalSessionContext.user;
  const elevated = user && hasElevatedTeamPrivileges(user);
  const filtersMount = document.getElementById('clinical-census-filters-mount');
  let bar = document.getElementById('clinical-census-filters');
  if (!elevated) {
    if (bar) bar.remove();
    if (filtersMount) {
      filtersMount.hidden = true;
      filtersMount.setAttribute('aria-hidden', 'true');
    }
    syncClinicalContextBarVisibility();
    return;
  }
  if (!filtersMount) return;
  try {
    const storedSala = localStorage.getItem('clinical.censusFilterSala');
    if (storedSala) {
      elevatedPatientFilters.sala = storedSala;
      localStorage.removeItem('clinical.censusFilterSala');
    }
  } catch (_e) {}
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'clinical-census-filters';
    bar.className = 'clinical-census-filters clinical-census-filters--toolbar';
    bar.innerHTML =
      '<button type="button" id="btn-clinical-census-filters-toggle" class="clinical-census-filters-toggle" aria-expanded="true" aria-controls="clinical-census-filters-body">' +
      '<span class="clinical-census-filters-toggle-label">Filtros censo</span>' +
      '<span class="clinical-census-filters-chevron" aria-hidden="true"></span></button>' +
      '<div id="clinical-census-filters-body" class="clinical-census-filters-body">' +
      '<label class="clinical-census-filter"><span>Sala</span>' +
      '<select id="clinical-filter-sala" class="profile-input">' +
      '<option value="__all__">Todas</option>' +
      CLINICAL_SALA_VALUES.map((s) => `<option value="${s}">${s}</option>`).join('') +
      '</select></label>' +
      '<label class="clinical-census-filter"><span>Equipo</span>' +
      '<select id="clinical-filter-team" class="profile-input">' +
      '<option value="">Todos los equipos</option>' +
      '<option value="__unassigned__">Sin equipo asignado</option>' +
      '</select></label>' +
      '<label class="clinical-census-filter"><span>Servicio</span>' +
      '<input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar…" autocomplete="off">' +
      '</label></div>';
    filtersMount.appendChild(bar);
    filtersMount.hidden = false;
    filtersMount.setAttribute('aria-hidden', 'false');

    const applyCensusFiltersCollapsedUi = (collapsed) => {
      const toggleBtn = document.getElementById('btn-clinical-census-filters-toggle');
      const body = document.getElementById('clinical-census-filters-body');
      if (!toggleBtn || !body) return;
      toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      body.hidden = collapsed;
      bar.classList.toggle('is-collapsed', collapsed);
    };

    applyCensusFiltersCollapsedUi(readCensusFiltersCollapsed());

    const toggleBtn = bar.querySelector('#btn-clinical-census-filters-toggle');
    if (toggleBtn && !toggleBtn._rpcCensusToggleWired) {
      toggleBtn._rpcCensusToggleWired = true;
      toggleBtn.addEventListener('click', () => {
        const next = !readCensusFiltersCollapsed();
        writeCensusFiltersCollapsed(next);
        applyCensusFiltersCollapsedUi(next);
      });
    }

    const salaSel = bar.querySelector('#clinical-filter-sala');
    const teamSel = bar.querySelector('#clinical-filter-team');
    const serviceInp = bar.querySelector('#clinical-filter-service');
    const refreshCensusViews = () => {
      void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 5000 }).then(() => {
        renderPatientList();
        if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
      });
    };
    if (salaSel) {
      salaSel.addEventListener('change', () => {
        elevatedPatientFilters.sala = String(salaSel.value || '__all__');
        refreshCensusViews();
      });
    }
    if (teamSel) {
      teamSel.addEventListener('change', () => {
        elevatedPatientFilters.teamId = String(teamSel.value || '');
        writeElevatedTeamFilterPreference(elevatedPatientFilters.teamId);
        refreshCensusViews();
      });
    }
    if (serviceInp) {
      serviceInp.addEventListener('input', () => {
        elevatedPatientFilters.service = String(serviceInp.value || '').trim();
        refreshCensusViews();
      });
    }
  }
  const salaSel = document.getElementById('clinical-filter-sala');
  const teamSel = document.getElementById('clinical-filter-team');
  const serviceInp = document.getElementById('clinical-filter-service');
  if (salaSel && salaSel.value !== elevatedPatientFilters.sala) {
    salaSel.value = elevatedPatientFilters.sala;
  }
  if (teamSel) {
    const teams = clinicalSessionContext.teams || [];
    const salaFilter = String(elevatedPatientFilters.sala || '__all__');
    const teamsForSala = filterTeamsForCensusSala(teams, salaFilter);
    const priorTeamId = String(elevatedPatientFilters.teamId ?? '');
    let teamFilterId = priorTeamId || resolveElevatedTeamFilterId(user, teamsForSala);
    teamFilterId = reconcileCensusTeamFilterForSala(teamFilterId, teamsForSala);
    if (teamFilterId !== priorTeamId) {
      writeElevatedTeamFilterPreference(teamFilterId);
    }
    elevatedPatientFilters.teamId = teamFilterId;
    teamSel.innerHTML =
      '<option value="">Todos los equipos</option>' +
      `<option value="${CENSUS_TEAM_FILTER_UNASSIGNED}">Sin equipo asignado</option>` +
      teamsForSala
        .map((t) => {
          const id = String(t.team_id || '');
          const label = String(t.name || id).slice(0, 40);
          return `<option value="${id}">${label}</option>`;
        })
        .join('');
    teamSel.value = teamFilterId;
  }
  if (serviceInp && serviceInp.value !== elevatedPatientFilters.service) {
    serviceInp.value = elevatedPatientFilters.service;
  }
  syncClinicalContextBarVisibility();
}

let rt = {
  getActiveId() {
    return null;
  },
  setActiveId() {},
  getActiveAppTab() {
    return 'lab';
  },
  getActiveInner() {
    return 'todo';
  },
  setActiveInner() {},
  getSettings() {
    return {};
  },
  consumeActiveLab() {
    return null;
  },
  restoreActiveLab() {},
  clearLabOutputUi() {},
  switchAppTab() {},
  showToast() {},
  renderInnerTabs() {},
  refreshExpedienteAfterPatientSelect() {},
  invalidateInnerTabRenderCache() {},
  renderEstadoActualButton() {},
  renderNoteForm() {},
  renderPatientDataPane() {},
  renderIndicaForm() {},
  renderListadoForm() {},
  refreshTendenciasOrCultivosPanel() {},
  renderLabHistoryPanel() {},
  renderMedRecetaPanel() {},
  switchInnerTab() {},
  syncInnerTabVisualOnly() {},
  renderTodoForm() {},
  limpiarReporte() {},
  setLabHistoryPanelCollapsed() {},
  syncLabHistoryCollapseUI() {},
  syncWorkContextChrome() {},
  rpcPrefersReducedMotion() {
    return false;
  },
  renderProcedureAgendaPanel() {},
  refreshAllTodoUIs() {},
  renderManejo() {},
  renderRecetaHu() {},
  renderPaseBoard() {},
  pushUndoSnapshot() {},
  addAuditEntry() {},
  applyDefaultsToNewPatient() {},
  applyDefaultsToNewIndicaciones() {},
  enviarLabsANota() {},
  ensureParsedLabHistory() {
    return [];
  },
  primaryTipoForLabSet() {
    return 'labs';
  },
};

export function registerPatientsRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(rt, ctx);
}

export function applyDefaultsToNewPatient(patientId) {
  if (!notes[patientId]) return;
  applyProfileToNoteIfEmpty(notes[patientId]);
  applyNotaFormatScaffoldIfEmpty(notes[patientId], rt.getSettings() || {});
}

export function applyDefaultsToNewIndicaciones(patientId) {
  if (!indicaciones[patientId]) return;
  var st = rt.getSettings() || {};
  if (st.defaultDieta && !indicaciones[patientId].dieta) indicaciones[patientId].dieta = st.defaultDieta;
  if (st.defaultCuidados && !indicaciones[patientId].cuidados) {
    indicaciones[patientId].cuidados = st.defaultCuidados;
  }
  if (st.defaultMedicamentos && !indicaciones[patientId].medicamentos) {
    indicaciones[patientId].medicamentos = st.defaultMedicamentos;
  }
  if (st.defaultIndicacionesEstudios && !indicaciones[patientId].estudios) {
    indicaciones[patientId].estudios = st.defaultIndicacionesEstudios;
  }
  if (st.defaultIndicacionesInterconsultas && !indicaciones[patientId].interconsultas) {
    indicaciones[patientId].interconsultas = st.defaultIndicacionesInterconsultas;
  }
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

var patientSearchFilter = '';
var _lastRondaNavIds = [];
var _roundOverviewMode = true;
var ARCHIVED_SECTION_COLLAPSED_LS = 'rpc-archived-section-collapsed';
var SIDEBAR_AUTO_HIDE_LS = 'rpc-sidebar-auto-hide';
var _patientListSortables = [];
var ROUND_SEEN_LS = 'rpc-round-seen';

export function getRoundOverviewMode() {
  return _roundOverviewMode;
}

export function setRoundOverviewMode(v) {
  _roundOverviewMode = !!v;
}

export function onPatientSearchInput(val) {
  patientSearchFilter = (val || '').trim().toLowerCase();
  renderPatientList();
}

function patientMatchesSearch(p) {
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

function ensurePatientUiState() {
  var changed = false;
  for (var i = 0; i < patients.length; i++) {
    var p = patients[i];
    if (!p) continue;
    if (typeof p.archived !== 'boolean') {
      p.archived = false;
      changed = true;
    }
    if (typeof p.pinned !== 'boolean') {
      p.pinned = false;
      changed = true;
    }
  }
  if (changed) saveState();
}

function isArchivedSectionCollapsed() {
  try {
    return localStorage.getItem(ARCHIVED_SECTION_COLLAPSED_LS) === '1';
  } catch (_e) {
    return false;
  }
}

function setArchivedSectionCollapsed(v) {
  try {
    localStorage.setItem(ARCHIVED_SECTION_COLLAPSED_LS, v ? '1' : '0');
  } catch (_e) {}
}

export function toggleArchivedSection(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  setArchivedSectionCollapsed(!isArchivedSectionCollapsed());
  renderPatientList();
}

function patientSectionKey(p) {
  if (p && p.archived) return 'archived';
  if (p && p.pinned) return 'pinned';
  return 'active';
}

function movePatientBefore(targetId, beforeId) {
  if (!targetId || !beforeId || targetId === beforeId) return;
  var from = patients.findIndex(function (p) {
    return p.id === targetId;
  });
  var to = patients.findIndex(function (p) {
    return p.id === beforeId;
  });
  if (from < 0 || to < 0 || from === to) return;
  var moved = patients.splice(from, 1)[0];
  if (from < to) to -= 1;
  patients.splice(to, 0, moved);
}

export function movePatientByOffset(ev, id, dir) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = patients.find(function (x) {
    return x.id === id;
  });
  if (!p) return;
  var sec = patientSectionKey(p);
  var ids = patients
    .filter(function (x) {
      return patientSectionKey(x) === sec;
    })
    .map(function (x) {
      return x.id;
    });
  var idx = ids.indexOf(id);
  if (idx < 0) return;
  var next = idx + dir;
  if (next < 0 || next >= ids.length) return;
  movePatientBefore(id, ids[next]);
  saveState();
  renderPatientList();
}

export function togglePatientPinned(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = patients.find(function (x) {
    return x.id === id;
  });
  if (!p) return;
  p.pinned = !p.pinned;
  if (p.pinned) p.archived = false;
  saveState();
  renderPatientList();
}

export function togglePatientArchived(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = patients.find(function (x) {
    return x.id === id;
  });
  if (!p) return;
  p.archived = !p.archived;
  if (p.archived) p.pinned = false;
  if (!p.archived) setArchivedSectionCollapsed(false);
  saveState();
  renderPatientList();
  if (isLanSessionConfiguredForRest()) {
    lanSyncPatientArchivedFlag(p).catch(function () {
      rt.showToast('No se pudo sincronizar archivo con el host LAN.', 'error');
    });
  }
}

function readSidebarAutoHide() {
  try {
    return localStorage.getItem(SIDEBAR_AUTO_HIDE_LS) === '1';
  } catch (_e) {
    return false;
  }
}

function writeSidebarAutoHide(on) {
  try {
    localStorage.setItem(SIDEBAR_AUTO_HIDE_LS, on ? '1' : '0');
  } catch (_e) {}
}

function applySidebarAutoHideUi() {
  var on = readSidebarAutoHide();
  document.documentElement.classList.toggle('sidebar-auto-hide', on);
  if (!on) document.documentElement.classList.remove('sidebar-reveal');
  var btn = document.getElementById('btn-sidebar-auto-hide');
  if (btn) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on
      ? 'Mostrar barra de pacientes fija'
      : 'Ocultar barra de pacientes (reaparece al acercar el mouse)';
  }
}

export function toggleSidebarAutoHide() {
  writeSidebarAutoHide(!readSidebarAutoHide());
  applySidebarAutoHideUi();
}

export function initSidebarAutoHide() {
  var strip = document.getElementById('sidebar-hover-strip');
  var aside = document.getElementById('patient-sidebar');
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('rpc-mobile-web')) {
    writeSidebarAutoHide(false);
  }
  applySidebarAutoHideUi();
  if (!strip || !aside) return;
  function reveal() {
    if (readSidebarAutoHide()) document.documentElement.classList.add('sidebar-reveal');
  }
  function hide() {
    document.documentElement.classList.remove('sidebar-reveal');
  }
  strip.addEventListener('mouseenter', reveal);
  aside.addEventListener('mouseenter', reveal);
  aside.addEventListener('mouseleave', hide);
  strip.addEventListener('mouseleave', function (e) {
    var rel = e.relatedTarget;
    if (rel && (aside === rel || aside.contains(rel))) return;
    hide();
  });
}

function destroyPatientListSortables() {
  _patientListSortables.forEach(function (s) {
    try {
      if (s && typeof s.destroy === 'function') s.destroy();
    } catch (_e) {}
  });
  _patientListSortables = [];
}

function handlePatientSortZoneEnd(evt) {
  if (evt.oldIndex === evt.newIndex || evt.from !== evt.to) return;
  syncPatientsOrderFromDom();
  saveState();
}

function mountPatientListSortables() {
  destroyPatientListSortables();
  if (isMobileWeb()) return;
  var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== 'function') return;
  var listRoot = document.getElementById('patient-list');
  if (!listRoot || patientSearchFilter) return;
  listRoot.querySelectorAll('.patient-sort-zone').forEach(function (zone) {
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      draggable: '.patient-card',
      filter: 'button, a[href], input, textarea, select',
      preventOnFilter: true,
      delay: 0,
      delayOnTouchOnly: true,
      direction: 'vertical',
      forceFallback: true,
      fallbackClass: 'patient-drag-hovercard',
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: listRoot,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: handlePatientSortZoneEnd,
    });
    _patientListSortables.push(sortable);
  });
}

function syncPatientsOrderFromDom() {
  var list = document.getElementById('patient-list');
  if (!list) return;
  var cards = list.querySelectorAll('.patient-card[data-patient-id]');
  if (!cards || !cards.length) return;
  var order = [];
  for (var i = 0; i < cards.length; i++) {
    var pid = cards[i].getAttribute('data-patient-id');
    if (pid) order.push(pid);
  }
  if (!order.length) return;
  var rank = Object.create(null);
  for (var j = 0; j < order.length; j++) rank[order[j]] = j;
  var missingBase = order.length + 1000;
  patients.sort(function (a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.id) ? rank[a.id] : missingBase;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.id) ? rank[b.id] : missingBase;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

function todayLocalYMD() {
  var d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function getRoundSeenSet() {
  try {
    var raw = localStorage.getItem(ROUND_SEEN_LS);
    var o = raw ? JSON.parse(raw) : {};
    var today = todayLocalYMD();
    if (o.day !== today) return { day: today, ids: [] };
    return { day: today, ids: Array.isArray(o.ids) ? o.ids.map(String) : [] };
  } catch (_e) {
    return { day: todayLocalYMD(), ids: [] };
  }
}

function persistRoundSeenSet(s) {
  try {
    localStorage.setItem(ROUND_SEEN_LS, JSON.stringify(s));
  } catch (_e) {}
}

function isPatientRoundSeen(patientId) {
  var s = getRoundSeenSet();
  return s.ids.indexOf(String(patientId)) >= 0;
}

export function togglePatientRoundSeen(ev, patientId) {
  if (ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  var s = getRoundSeenSet();
  var id = String(patientId);
  var idx = s.ids.indexOf(id);
  if (idx >= 0) s.ids.splice(idx, 1);
  else s.ids.push(id);
  persistRoundSeenSet(s);
  renderPatientList();
}

function buildRondaRecentLabsBlockHtml(patientId) {
  if (!patientId) {
    return '<p class="ronda-panel-empty">Sin datos.</p>';
  }
  var hist = sortLabHistoryChronological(ensureParsedLabHistoryCached(patientId));
  if (hist.length) {
    var newest = hist[0];
    var parts = [];
    parts.push('<div class="ronda-labs-meta">');
    var rawFe =
      newest.fecha === 'Anterior'
        ? ''
        : normalizeFechaForRonda(newest.fecha) || String(newest.fecha || '').trim() || '';
    if (newest.id === 'migrated-anterior') {
      parts.push('<span class="ronda-labs-date">' + esc(rawFe ? 'Anterior · ' + rawFe : 'Anterior') + '</span>');
    } else {
      parts.push('<span class="ronda-labs-date">' + esc(rawFe || '—') + '</span>');
    }
    if (newest.hora && String(newest.hora).trim()) {
      parts.push('<span>' + esc(String(newest.hora).trim().slice(0, 8)) + '</span>');
    }
    var tipo = rt.primaryTipoForLabSet(newest.resLabs);
    if (tipo && tipo !== 'labs') {
      parts.push(
        '<span>' +
          esc(tipo === 'mixed' ? 'Mixto' : tipo === 'cultivo' ? 'Cultivo' : tipo) +
          '</span>'
      );
    }
    parts.push('</div>');
    if (newest.resLabs && newest.resLabs.length) {
      parts.push('<ul class="ronda-labs-lines">');
      newest.resLabs.forEach(function (L) {
        var line = String(L || '').trim();
        if (!line) return;
        parts.push('<li>' + esc(line) + '</li>');
      });
      parts.push('</ul>');
      return parts.join('');
    }
  }
  var n = notes[patientId];
  if (n && n.estudios && String(n.estudios).trim()) {
    var lines = String(n.estudios)
      .split('\n')
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    var skip = { laboratorio: 1, cultivos: 1 };
    var body = [];
    lines.forEach(function (L) {
      if (skip[L.toLowerCase()]) return;
      if (/^fecha|^----/i.test(L)) return;
      body.push('<li>' + esc(L) + '</li>');
    });
    if (body.length) {
      return (
        '<p class="ronda-labs-fallback-label">Desde nota · estudios auxiliares</p>' +
        '<ul class="ronda-labs-lines">' +
          body.join('') +
          '</ul>'
      );
    }
  }
  return (
    '<p class="ronda-panel-empty">Sin laboratorios recientes. ' +
    'Puedes cargar o enviar resultados desde la pestaña Laboratorio.</p>'
  );
}

/** Lightweight fecha normalizer for ronda banner (delegates to app when available). */
function normalizeFechaForRonda(fecha) {
  if (typeof rt.normalizeFechaLabHistory === 'function') {
    return rt.normalizeFechaLabHistory(fecha);
  }
  return String(fecha || '').trim();
}

export function syncRoundExpedienteLayout() {
  var overview = document.getElementById('patient-ronda-overview');
  var classic = document.getElementById('patient-expediente-classic');
  var fullbar = document.getElementById('patient-ronda-fullbar');
  if (!overview || !classic) return;

  if (!isPaseMode()) {
    overview.style.display = 'none';
    classic.style.display = 'flex';
    if (fullbar) {
      fullbar.classList.remove('is-visible');
      fullbar.setAttribute('aria-hidden', 'true');
    }
    var rm = document.getElementById('patient-ronda-todos-mount');
    if (rm) {
      while (rm.firstChild) rm.removeChild(rm.firstChild);
    }
    rt.syncWorkContextChrome();
    return;
  }

  var showOverview =
    !!rt.getActiveId() && rt.getActiveAppTab() === 'nota' && _roundOverviewMode;
  overview.style.display = showOverview ? 'flex' : 'none';
  classic.style.display = showOverview ? 'none' : 'flex';
  if (fullbar) {
    var showBar = !!(rt.getActiveId() && rt.getActiveAppTab() === 'nota' && !showOverview);
    fullbar.classList.toggle('is-visible', showBar);
    fullbar.setAttribute('aria-hidden', showBar ? 'false' : 'true');
  }
  if (showOverview) renderRoundOverviewPanels();
  rt.syncWorkContextChrome();
}

export function renderRoundOverviewPanels() {
  if (!isPaseMode() || !_roundOverviewMode || rt.getActiveAppTab() !== 'nota' || !rt.getActiveId()) return;
  var titleEl = document.getElementById('patient-ronda-patient-label');
  var metaEl = document.getElementById('patient-ronda-patient-meta');
  var aid = rt.getActiveId();
  var p = patients.find(function (x) {
    return String(x.id) === String(aid);
  });
  if (titleEl) titleEl.textContent = p ? p.nombre || 'Paciente' : 'Paciente';
  if (metaEl) {
    if (!p) metaEl.textContent = '';
    else {
      metaEl.textContent =
        'Cto. ' +
        (p.cuarto || '—') +
        ' · Cama ' +
        (p.cama || '—') +
        ' · ' +
        (p.servicio || '—') +
        (p.registro ? ' · Reg. ' + String(p.registro) : '');
    }
  }
  var labsBody = document.getElementById('patient-ronda-labs-body');
  if (labsBody) labsBody.innerHTML = buildRondaRecentLabsBlockHtml(aid);
  rt.refreshAllTodoUIs();
  var gala = isModeSala(rt.getSettings());
  var qDatos = document.getElementById('ronda-quick-datos');
  if (qDatos) qDatos.style.display = gala ? '' : 'none';
  var qList = document.getElementById('ronda-quick-listado');
  if (qList) qList.style.display = gala ? '' : 'none';
}

export function closeRondaQuickMoreMenu() {
  document.querySelectorAll(".ronda-quick-more[open]").forEach(function (d) {
    d.removeAttribute("open");
  });
}

export function returnToRoundOverview() {
  if (!isPaseMode()) return;
  _roundOverviewMode = true;
  syncRoundExpedienteLayout();
}

export function openFullExpedienteFromRound(tab) {
  if (!isPaseMode()) return;
  var tname = tab;
  var sala = isModeSala(rt.getSettings());
  if (sala) {
    if (tname === 'notas' || tname === 'indica') tname = 'tend';
    if (!tname) tname = 'tend';
  } else {
    if (!tname) tname = 'notas';
  }
  rt.switchInnerTab(tname);
}

export function advanceRondaPatient(delta) {
  if (!isPaseMode()) return;
  if (!_lastRondaNavIds.length) return;
  var cur = rt.getActiveId() != null ? String(rt.getActiveId()) : '';
  var idx = _lastRondaNavIds.indexOf(cur);
  if (idx < 0) {
    selectPatient(_lastRondaNavIds[delta > 0 ? 0 : _lastRondaNavIds.length - 1]);
    return;
  }
  var next = idx + delta;
  if (next < 0) next = _lastRondaNavIds.length - 1;
  if (next >= _lastRondaNavIds.length) next = 0;
  selectPatient(_lastRondaNavIds[next]);
}

export function scrollActiveRondaCardIntoView() {
  if (!rt.getActiveId()) return;
  var list = document.getElementById('patient-list');
  if (!list) return;
  var cards = list.querySelectorAll('.patient-card[data-patient-id]');
  var want = String(rt.getActiveId());
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute('data-patient-id') === want) {
      try {
        cards[i].scrollIntoView({
          block: 'nearest',
          behavior: rt.rpcPrefersReducedMotion() ? 'auto' : 'smooth',
        });
      } catch (_e) {
        cards[i].scrollIntoView(true);
      }
      break;
    }
  }
}

function renderPatientRoundRowHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var seen = isPatientRoundSeen(p.id);
  var pinTitle = pinOn ? 'Quitar de Pinned' : 'Mover a Pinned';
  var archTitle = archOn ? 'Restaurar del archivo' : 'Archivar paciente';
  var archiveIcon = archOn
    ? '↩'
    : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>';
  var seenTitle = typeof t === 'function' ? t('roundMode.seenTitle') : 'Visto en ronda';
  var aid = rt.getActiveId();
  return (
    '<div class="patient-card patient-card--roundrow ' +
    (p.id === aid ? 'active' : '') +
    (seen ? ' patient-card--roundrow-seen' : '') +
    '" data-patient-id="' +
    p.id +
    '" role="button" tabindex="0">' +
    '<div class="patient-card-toolbar">' +
    '<div class="patient-card-toolbar-left">' +
    '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon btn-archive-clean" title="' +
    archTitle +
    '" aria-label="' +
    archTitle +
    '" onclick="togglePatientArchived(event,\'' +
    p.id +
    '\')">' +
    archiveIcon +
    '</button>' +
    '<button type="button" class="patient-toolbar-chip btn-pinned-text" title="' +
    pinTitle +
    '" aria-label="' +
    pinTitle +
    '" onclick="togglePatientPinned(event,\'' +
    p.id +
    '\')">Pinned</button>' +
    '</div>' +
    '<button type="button" class="btn-delete-card" onclick="deletePatient(event,\'' +
    p.id +
    '\')" aria-label="Eliminar">×</button>' +
    '</div>' +
    '<div class="roundrow-main">' +
    '<div class="roundrow-text">' +
    '<div class="p-name">' +
    esc(p.nombre || 'Sin nombre') +
    '</div>' +
    '<div class="p-meta"><span>Cto. ' +
    esc(p.cuarto || '-') +
    '</span><span>Cama ' +
    esc(p.cama || '-') +
    '</span><span>' +
    esc(p.servicio || '-') +
    '</span></div></div>' +
    '<button type="button" class="btn-round-seen" title="' +
    esc(seenTitle) +
    '" aria-label="' +
    esc(seenTitle) +
    '" aria-pressed="' +
    (seen ? 'true' : 'false') +
    '" onclick="togglePatientRoundSeen(event,\'' +
    p.id +
    '\')">' +
    (seen ? '✓' : '○') +
    '</button>' +
    '</div></div>'
  );
}

function renderPatientCardHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var pinTitle = pinOn ? 'Quitar de Pinned' : 'Mover a Pinned';
  var archTitle = archOn ? 'Restaurar del archivo' : 'Archivar paciente';
  var archiveIcon = archOn
    ? '↩'
    : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>';
  var aid = rt.getActiveId();
  return (
    '<div class="patient-card ' +
      (p.id === aid ? 'active' : '') +
      '" data-patient-id="' +
      p.id +
      '" role="button" tabindex="0">' +
      '<div class="patient-card-toolbar">' +
      '<div class="patient-card-toolbar-left">' +
      '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon btn-archive-clean" title="' +
      archTitle +
      '" aria-label="' +
      archTitle +
      '" onclick="togglePatientArchived(event,\'' +
      p.id +
      '\')">' +
      archiveIcon +
      '</button>' +
      '<button type="button" class="patient-toolbar-chip btn-pinned-text" title="' +
      pinTitle +
      '" aria-label="' +
      pinTitle +
      '" onclick="togglePatientPinned(event,\'' +
      p.id +
      '\')">Pinned</button>' +
      '</div>' +
      '<button type="button" class="btn-delete-card" onclick="deletePatient(event,\'' +
      p.id +
      '\')" aria-label="Eliminar">×</button>' +
      '</div>' +
      '<div class="p-name">' +
      esc(p.nombre || 'Sin nombre') +
      '</div>' +
      '<div class="p-meta"><span>Cto. ' +
      esc(p.cuarto || '-') +
      '</span><span>Cama ' +
      esc(p.cama || '-') +
      '</span><span>' +
      esc(p.servicio || '-') +
      '</span></div></div>'
  );
}

var _patientListRenderQueued = false;
var _patientListSilentTimer = null;
var PATIENT_LIST_SILENT_DEBOUNCE_MS = 220;

/** @param {{ silent?: boolean }|undefined} [opts] */
function normalizePatientListRenderOpts(opts) {
  return opts && typeof opts === 'object' ? opts : {};
}

/** Solo actualiza .active en tarjetas visibles (evita innerHTML al cambiar paciente). */
function patchPatientListActiveHighlight(nextId) {
  var list = document.getElementById('patient-list');
  if (!list) return false;
  var cards = list.querySelectorAll('.patient-card[data-patient-id]');
  if (!cards.length) return false;
  var filtered = patients.filter(patientMatchesSearch);
  if (filtered.length !== cards.length) return false;
  cards.forEach(function (el) {
    var pid = el.getAttribute('data-patient-id');
    el.classList.toggle('active', String(pid) === String(nextId));
  });
  return true;
}

/** @param {{ silent?: boolean }|undefined} [opts] — silent: LAN/incremental (no list flash) */
export function renderPatientList(opts) {
  opts = normalizePatientListRenderOpts(opts);
  if (opts.silent) {
    if (_patientListSilentTimer) clearTimeout(_patientListSilentTimer);
    _patientListSilentTimer = setTimeout(function () {
      _patientListSilentTimer = null;
      renderPatientListNow({ silent: true });
    }, PATIENT_LIST_SILENT_DEBOUNCE_MS);
    return;
  }
  if (_patientListSilentTimer) {
    clearTimeout(_patientListSilentTimer);
    _patientListSilentTimer = null;
  }
  if (_patientListRenderQueued) return;
  _patientListRenderQueued = true;
  requestAnimationFrame(function () {
    _patientListRenderQueued = false;
    renderPatientListNow();
  });
}

/** @param {{ silent?: boolean }|undefined} [opts] */
function renderPatientListNow(opts) {
  opts = normalizePatientListRenderOpts(opts);
  ensurePatientUiState();
  ensurePatientListClickDelegation();
  if (!opts.silent) syncClinicalCensusFiltersBar();
  var list = document.getElementById('patient-list');
  if (!list) return;
  var isRonda = isPaseMode();
  var visiblePatients = patientsVisibleInSidebar();
  if (reselectIfActivePatientHidden(visiblePatients)) return;
  if (!visiblePatients.length) {
    destroyPatientListSortables();
    var emptyScrollTop = opts.silent ? list.scrollTop : 0;
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Sin pacientes aún</div>';
    if (opts.silent && emptyScrollTop > 0) list.scrollTop = emptyScrollTop;
    _lastRondaNavIds = [];
    if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
    syncGuardiaCensusPanelVisibility(rt.getSettings());
    if (!opts.silent) renderGuardiaCensusGrid(rt.getSettings());
    return;
  }
  var filtered = visiblePatients.filter(patientMatchesSearch);
  if (!filtered.length) {
    destroyPatientListSortables();
    var searchScrollTop = opts.silent ? list.scrollTop : 0;
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Ningún paciente coincide con la búsqueda</div>';
    if (opts.silent && searchScrollTop > 0) list.scrollTop = searchScrollTop;
    _lastRondaNavIds = [];
    if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
    if (!opts.silent) {
      syncGuardiaCensusPanelVisibility(rt.getSettings());
      renderGuardiaCensusGrid(rt.getSettings());
    }
    return;
  }
  var zones = buildPatientListZones(filtered);
  var cardHtml = isRonda ? renderPatientRoundRowHtml : renderPatientCardHtml;
  var archivedCollapsed = isArchivedSectionCollapsed();
  var listCtx = {
    activeId: rt.getActiveId(),
    isRonda: isRonda,
    isRoundSeen: isPatientRoundSeen,
  };
  var incrementalOpts = {
    zones: zones,
    archivedCollapsed: archivedCollapsed,
    patientSearchFilter: patientSearchFilter,
    renderCard: cardHtml,
    ctx: listCtx,
    onRondaNav: function (z) {
      _lastRondaNavIds = buildRondaNavIds(z);
    },
  };

  if (opts.silent) {
    var silentScrollTop = list.scrollTop;
    if (
      trySilentPatientListPatch(list, incrementalOpts) ||
      updatePatientListDomIncremental(list, {
        zones: zones,
        archivedCollapsed: archivedCollapsed,
        isRonda: isRonda,
        renderCard: cardHtml,
        ctx: listCtx,
        renderPinnedLabel: function () {
          return (
            '<div class="patient-list-section-label patient-list-section-label--pinned" role="group" aria-label="Pacientes fijados">' +
            '<svg class="patient-list-pin-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 1 0-6 0v3.76z"/></svg>' +
            '<span class="patient-list-section-count">' +
            zones.pinned.length +
            '</span></div>'
          );
        },
        renderActiveLabel: function () {
          return (
            '<div class="patient-list-section-label" role="group" aria-label="Lista de pacientes">Pacientes <span class="patient-list-section-count">' +
            zones.active.length +
            '</span></div>'
          );
        },
        renderArchivedToggle: function (collapsed, count) {
          return (
            '<button type="button" class="patient-list-section-toggle" onclick="toggleArchivedSection(event)" aria-expanded="' +
            (!collapsed ? 'true' : 'false') +
            '">Archivados <span>(' +
            count +
            ')</span> <span>' +
            (collapsed ? '▶' : '▼') +
            '</span></button>'
          );
        },
        onRondaNav: incrementalOpts.onRondaNav,
      })
    ) {
      list.classList.toggle('patient-list--ronda', isRonda);
      if (silentScrollTop > 0) list.scrollTop = silentScrollTop;
      return;
    }
  }

  destroyPatientListSortables();
  list.classList.toggle('patient-list--ronda', isRonda);
  var pinned = zones.pinned;
  var active = zones.active;
  var archived = zones.archived;
  var parts = [];
  var rondaNav = [];

  if (pinned.length) {
    parts.push(
      '<div class="patient-list-section-label patient-list-section-label--pinned" role="group" aria-label="Pacientes fijados">' +
        '<svg class="patient-list-pin-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 1 0-6 0v3.76z"/></svg>' +
        '<span class="patient-list-section-count">' +
        pinned.length +
        '</span></div>'
    );
    parts.push('<div class="patient-sort-zone" data-patient-zone="pinned">');
    pinned.forEach(function (p) {
      rondaNav.push(String(p.id));
    });
    parts.push(pinned.map(cardHtml).join(''));
    parts.push('</div>');
  }
  if (active.length) {
    parts.push(
      '<div class="patient-list-section-label" role="group" aria-label="Lista de pacientes">Pacientes <span class="patient-list-section-count">' +
        active.length +
        '</span></div>'
    );
    parts.push('<div class="patient-sort-zone" data-patient-zone="active">');
    active.forEach(function (p) {
      rondaNav.push(String(p.id));
    });
    parts.push(active.map(cardHtml).join(''));
    parts.push('</div>');
  }
  if (archived.length) {
    parts.push(
      '<button type="button" class="patient-list-section-toggle" onclick="toggleArchivedSection(event)" aria-expanded="' +
        (!archivedCollapsed ? 'true' : 'false') +
        '">Archivados <span>(' +
        archived.length +
        ')</span> <span>' +
        (archivedCollapsed ? '▶' : '▼') +
        '</span></button>'
    );
    if (!archivedCollapsed) {
      parts.push('<div class="patient-sort-zone" data-patient-zone="archived">');
      archived.forEach(function (p) {
        rondaNav.push(String(p.id));
      });
      parts.push(archived.map(cardHtml).join(''));
      parts.push('</div>');
    }
  }
  _lastRondaNavIds = rondaNav;
  var savedScrollTop = opts.silent ? list.scrollTop : 0;
  list.innerHTML = parts.join('');
  if (opts.silent && savedScrollTop > 0) list.scrollTop = savedScrollTop;
  mountPatientListSortables();
  if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
  if (!opts.silent) {
    syncGuardiaCensusPanelVisibility(rt.getSettings());
    renderGuardiaCensusGrid(rt.getSettings());
  }
}

/** @param {string} iso */
function formatIncomingEffectiveLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '');
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * @param {string|number} id
 * @returns {boolean} true when chart open should be blocked
 */
function blockIncomingPreviewChartOpen(id) {
  if (!clinicalSessionContext.user) return false;
  const patient = patients.find((p) => p && String(p.id) === String(id));
  const mapped = patient
    ? {
        id: String(patient.id),
        service: String(patient.servicio || patient.area || ''),
        sub_area: String(patient.area || ''),
        interconsult_type: patient.interconsult_type,
      }
    : { id: String(id) };
  const guardia = clinicalSessionContext.guardiasMap.get(String(id)) || null;
  const scope = evaluateClinicalScope(
    clinicalSessionContext.user,
    mapped,
    guardia,
    getClinicalScopeContextForEvaluate()
  );
  if (!scope.writable && scope.incomingPreview) {
    const assignment = (getClinicalScopeContextForEvaluate().assignments || []).find(
      (a) => String(a.patient_id) === String(id)
    );
    const when = formatIncomingEffectiveLabel(
      String(assignment?.effective_at || '')
    );
    rt.showToast(`Disponible el ${when}`, 'info');
    return true;
  }
  return false;
}

export function selectPatient(id) {
  if (id == null || id === '') return;
  try {
    if (blockIncomingPreviewChartOpen(id)) return;
    selectPatientCore(id);
  } catch (err) {
    console.error('[R+] selectPatient:', err && err.message ? err.message : err);
  }
}

function selectPatientCore(id) {
  var prevId = rt.getActiveId();
  var wasOnLab = rt.getActiveAppTab() === 'lab';
  var appTab = rt.getActiveAppTab();
  var patientChanged = prevId != null && String(prevId) !== String(id);
  if (patientChanged) {
    flushRecetaHuDraftIfMountedFor(prevId);
    stashMedInputForPatient(prevId);
    stashMedPharmPasteForPatient(prevId);
    stashVpoForPatient(prevId);
    flushSaveState();
  }
  rt.setActiveId(id);
  if (patientChanged) rt.invalidateInnerTabRenderCache();
  if (!patientChanged || !patchPatientListActiveHighlight(id)) {
    renderPatientList();
  }
  var emptyState = document.getElementById('empty-state');
  var patientView = document.getElementById('patient-view');
  if (emptyState) emptyState.style.display = 'none';
  if (patientView) patientView.style.display = 'flex';
  rt.renderEstadoActualButton();
  var settings = rt.getSettings();
  var inner = rt.getActiveInner();
  if (patientChanged) {
    var migrated = migrateGranularInner(inner || 'todo', settings);
    if (migrated !== inner) {
      inner = migrated;
      rt.setActiveInner(migrated);
    }
  } else {
    if (isModeSala(settings) && (inner === 'notas' || inner === 'indica' || !inner)) {
      if (getUiDensity() === 'normal') {
        rt.setActiveInner('todo');
        rt.syncInnerTabVisualOnly();
      } else {
        rt.switchInnerTab('todo');
      }
    } else if (!isModeSala(settings) && inner === 'listado') {
      if (getUiDensity() === 'normal') {
        rt.setActiveInner('todo');
        rt.syncInnerTabVisualOnly();
      } else {
        rt.switchInnerTab('todo');
      }
    }
    if (isPaseMode() && rt.getActiveAppTab() === 'nota') {
      if (inner === 'todo' || !inner) {
        _roundOverviewMode = true;
      } else {
        _roundOverviewMode = false;
      }
    }
  }
  rt.syncInnerTabVisualOnly();
  rt.refreshExpedienteAfterPatientSelect({ patientChanged: patientChanged });
  if (appTab === 'lab') rt.renderLabHistoryPanel();
  if (appTab === 'med') rt.renderMedRecetaPanel();
  if (wasOnLab && patientChanged) {
    rt.limpiarReporte();
    rt.renderLabHistoryPanel();
    if (isPaseMode()) {
      rt.syncWorkContextChrome();
    } else {
      rt.switchAppTab('lab');
      var labOutput = document.getElementById('lab-output-section');
      if (labOutput && labOutput.style.display !== 'none') {
        window.setTimeout(function () {
          try {
            labOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (_e) {
            labOutput.scrollIntoView(true);
          }
        }, 0);
      }
    }
  } else {
    rt.syncWorkContextChrome();
  }
  syncRoundExpedienteLayout();
  rt.refreshTendenciasOrCultivosPanel();
  if (isPaseMode()) rt.renderPaseBoard();
  if (rt.getActiveId()) {
    requestAnimationFrame(function () {
      scrollActiveRondaCardIntoView();
    });
  }
}

var _patientListClickWired = false;

/** Clic en tarjeta sin depender solo de onclick inline (módulos ES). */
function ensurePatientListClickDelegation() {
  if (_patientListClickWired) return;
  var root = document.getElementById('patient-list');
  if (!root) return;
  _patientListClickWired = true;
  root.addEventListener('click', function (ev) {
    var card = ev.target && ev.target.closest ? ev.target.closest('.patient-card[data-patient-id]') : null;
    if (!card) return;
    if (ev.target.closest('button, a[href], input, textarea, select')) return;
    var pid = card.getAttribute('data-patient-id');
    if (pid) selectPatient(pid);
  });
}

export function deletePatient(e, id) {
  e.stopPropagation();
  var target = patients.find(function (p) {
    return p.id === id;
  });
  if (!target || !target.archived) {
    if (!confirm('¿Eliminar este paciente y sus notas?')) return;
  }
  var label = target ? 'Eliminar ' + (target.nombre || 'paciente') : 'Eliminar paciente';
  if (typeof rt.pushUndoSnapshot === 'function') rt.pushUndoSnapshot(label);
  if (!removePatientLocally(id)) return;
  var snap = target || { id: id, registro: '' };
  if (getActiveLiveSyncRoomId()) {
    rememberPatientDeleteTombstone(snap);
    void purgeLanPatientFromHost(id);
    stagePatientDelete(id, snap, function () {
      import('../lan-mutation-registry.mjs').then(function (m) {
        m.lanMutationRegistry.dispatchLanMutation('patient-fields', id);
      });
    });
  }
  saveState({ immediate: true });
  rt.addAuditEntry('patient-delete', 'ok', 1, target ? target.registro || target.nombre || '' : '');
  renderPatientList();
  if (rt.getActiveId()) selectPatient(rt.getActiveId());
  else {
    var pv = document.getElementById('patient-view');
    var es = document.getElementById('empty-state');
    if (pv) pv.style.display = 'none';
    if (es) es.style.display = 'flex';
    rt.syncWorkContextChrome();
  }
}

function _prefillServicioForSala() {
  var srv = document.getElementById('m-servicio');
  if (srv && isModeSala(rt.getSettings()) && !srv.value) srv.value = getDefaultServicio(rt.getSettings());
}

function _lastAdmissionLocationFromPatients() {
  for (var i = patients.length - 1; i >= 0; i--) {
    var p = patients[i];
    if (!p || p.isDemo) continue;
    var cuarto = String(p.cuarto || '').trim();
    var cama = String(p.cama || '').trim();
    if (cuarto && cama) return { cuarto: cuarto, cama: cama };
  }
  return { cuarto: '', cama: '' };
}

function _resolveAdmissionLocationDefaults(registro) {
  var tour = getTourDemoAdmitDefaults(registro);
  if (tour && tour.cuarto && tour.cama) return tour;
  var st = rt.getSettings();
  var cuarto = getDefaultCuarto(st);
  var cama = getDefaultCama(st);
  if (cuarto && cama) return { cuarto: cuarto, cama: cama };
  return _lastAdmissionLocationFromPatients();
}

function _prefillCuartoCamaForSala(registro) {
  if (!isModeSala(rt.getSettings())) return;
  var loc = _resolveAdmissionLocationDefaults(registro);
  var cuartoEl = document.getElementById('m-cuarto');
  var camaEl = document.getElementById('m-cama');
  if (cuartoEl && !String(cuartoEl.value || '').trim() && loc.cuarto) cuartoEl.value = loc.cuarto;
  if (camaEl && !String(camaEl.value || '').trim() && loc.cama) camaEl.value = loc.cama;
}

function _rememberAdmissionLocation(cuarto, cama) {
  if (!isModeSala(rt.getSettings())) return;
  var st = rt.getSettings();
  if (!st) return;
  st.defaultCuarto = cuarto;
  st.defaultCama = cama;
  try {
    storage.saveSettings(st);
  } catch (e) {
    console.error('_rememberAdmissionLocation:', e && e.message);
  }
}

function _focusPatientAdmissionField(isFromLab) {
  var fieldIds = isFromLab
    ? ['m-servicio', 'm-cuarto', 'm-cama']
    : ['m-nombre-manual', 'm-registro-manual', 'm-servicio', 'm-cuarto', 'm-cama'];
  for (var i = 0; i < fieldIds.length; i++) {
    var el = document.getElementById(fieldIds[i]);
    if (!el) continue;
    if (el.closest && el.closest('[style*="display: none"]')) continue;
    if (!String(el.value || '').trim()) {
      try {
        el.focus();
      } catch (e) {}
      return;
    }
  }
  var cama = document.getElementById('m-cama');
  if (cama) {
    try {
      cama.focus();
    } catch (e2) {}
  }
}

function _syncPatientModalModeFields() {
  var sala = isModeSala(rt.getSettings());
  var areaGroup = document.getElementById('m-area-group');
  var servicioLabel = document.getElementById('m-servicio-label');
  var servicioInput = document.getElementById('m-servicio');
  if (areaGroup) areaGroup.style.display = sala ? 'none' : '';
  if (servicioLabel) servicioLabel.textContent = sala ? 'Área / Servicio *' : 'Servicio *';
  if (servicioInput) servicioInput.placeholder = 'ej. CIRUGÍA GENERAL';
}

export function openAddModal() {
  document.getElementById('modal-title').textContent = 'Nuevo Paciente';
  document.getElementById('modal-prefilled').style.display = 'none';
  document.getElementById('modal-manual-full').style.display = 'block';
  ['nombre-manual', 'registro-manual', 'area', 'servicio', 'cuarto', 'cama'].forEach(function (f) {
    var el = document.getElementById('m-' + f);
    if (el) el.value = '';
  });
  var edadNumManual = document.getElementById('m-edad-num-manual');
  var edadUnitManual = document.getElementById('m-edad-unit-manual');
  if (edadNumManual) edadNumManual.value = '';
  if (edadUnitManual) edadUnitManual.value = 'años';
  document.getElementById('m-sexo').value = 'F';
  _syncPatientModalModeFields();
  _prefillServicioForSala();
  _prefillCuartoCamaForSala();
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationTeamPolicyUi();
  maybePromptTeamOnboardingForRegistration();
  document.getElementById('modal').classList.add('open');
  setTimeout(function () {
    _focusPatientAdmissionField(false);
  }, 120);
}

var pendingAddPatientSavedCallback = null;
var pendingAddPatientFromBulkPreview = false;

function isAddPatientModalOpenForRegistro(registro) {
  var modal = document.getElementById('modal');
  if (!modal || !modal.classList.contains('open')) return false;
  var prefilled = document.getElementById('modal-prefilled');
  if (!prefilled || prefilled.style.display === 'none') return false;
  var regEl = document.getElementById('m-registro');
  return String(regEl && regEl.value ? regEl.value : '').trim() === String(registro || '').trim();
}

function openAddModalFromLabPatientData(p, opts) {
  if (!p) {
    openAddModal();
    return;
  }
  var registro = String(p.expediente || p.registro || '').trim();
  if (registro && isAddPatientModalOpenForRegistro(registro)) {
    if (opts && typeof opts.onSaved === 'function') {
      pendingAddPatientSavedCallback = opts.onSaved;
    }
    if (opts && opts.fromBulkPreview) pendingAddPatientFromBulkPreview = true;
    return;
  }
  pendingAddPatientSavedCallback =
    opts && typeof opts.onSaved === 'function' ? opts.onSaved : null;
  pendingAddPatientFromBulkPreview = !!(opts && opts.fromBulkPreview);
  document.getElementById('modal-title').textContent = 'Agregar Paciente del Lab';
  document.getElementById('modal-prefilled').style.display = 'block';
  document.getElementById('modal-manual-full').style.display = 'none';
  document.getElementById('m-nombre').value = p.name || '';
  document.getElementById('m-registro').value = p.expediente || '';
  var edadNum = document.getElementById('m-edad-num');
  var edadUnit = document.getElementById('m-edad-unit');
  if (edadNum) {
    var ageNum = parseInt(p.edad, 10);
    edadNum.value = isNaN(ageNum) ? '' : String(ageNum);
  }
  if (edadUnit) edadUnit.value = 'años';
  document.getElementById('m-sexo-ro').value = p.sexo === 'M' ? 'M' : 'F';
  ['area', 'servicio', 'cuarto', 'cama'].forEach(function (f) {
    document.getElementById('m-' + f).value = '';
  });
  _syncPatientModalModeFields();
  var tourAdmit = getTourDemoAdmitDefaults(p.expediente || p.registro || '');
  if (tourAdmit && tourAdmit.servicio) {
    var srvEl = document.getElementById('m-servicio');
    if (srvEl) srvEl.value = tourAdmit.servicio;
  } else {
    _prefillServicioForSala();
  }
  _prefillCuartoCamaForSala(p.expediente || p.registro || '');
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationTeamPolicyUi();
  maybePromptTeamOnboardingForRegistration();
  document.getElementById('modal').classList.add('open');
  setTimeout(function () {
    _focusPatientAdmissionField(true);
  }, 120);
}

export function openAddModalFromLab() {
  var lab = rt.getActiveLab && rt.getActiveLab();
  if (!lab) {
    openAddModal();
    return;
  }
  openAddModalFromLabPatientData(lab.patient);
}

/** Alta desde datos SOME explícitos (p. ej. fila de vista previa masiva). */
export function openAddModalFromLabPatient(patient, opts) {
  openAddModalFromLabPatientData(patient, opts);
}

export function closeModal() {
  pendingAddPatientSavedCallback = null;
  pendingAddPatientFromBulkPreview = false;
  document.getElementById('modal').classList.remove('open');
}

export function confirmCloseAddPatientModal() {
  var hasData = ['m-area', 'm-servicio', 'm-cuarto', 'm-cama'].some(function (id) {
    var el = document.getElementById(id);
    return el && el.value.trim();
  });
  if (hasData && !confirm('¿Cerrar sin guardar?')) return false;
  return true;
}

function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return patients.find(function (p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}

function showDuplicateWarning(existing, onConfirm) {
  var fecha = notes[existing.id] ? notes[existing.id].fecha : '';
  var body = '<strong>' + esc(existing.nombre) + '</strong>';
  body += '<br>Cto. ' + esc(existing.cuarto || '—') + ' Cama ' + esc(existing.cama || '—');
  if (existing.registro) body += '<br>Registro: ' + esc(existing.registro);
  if (fecha) body += '<br>Ingreso: ' + esc(fecha);
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'dup-confirm-backdrop';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal">' +
    '<h3>Paciente similar encontrado</h3>' +
    '<p>' +
    body +
    '</p>' +
    '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
    '<button onclick="document.getElementById(\'dup-confirm-backdrop\').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;">Cancelar</button>' +
    '<button id="dup-confirm-btn" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Agregar de todas formas</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  document.getElementById('dup-confirm-btn').onclick = function () {
    document.getElementById('dup-confirm-backdrop').remove();
    onConfirm();
  };
}

export function savePatient() {
  var isFromLab = document.getElementById('modal-prefilled').style.display !== 'none';
  var nombre, registro, edadNum, edadUnit, sexo;
  if (isFromLab) {
    nombre = (document.getElementById('m-nombre').value || '').trim().toUpperCase();
    registro = (document.getElementById('m-registro').value || '').trim();
    edadNum = (document.getElementById('m-edad-num').value || '').trim();
    edadUnit = document.getElementById('m-edad-unit').value || 'años';
    sexo = document.getElementById('m-sexo-ro').value || 'F';
  } else {
    nombre = (document.getElementById('m-nombre-manual').value || '').trim().toUpperCase();
    registro = (document.getElementById('m-registro-manual').value || '').trim();
    edadNum = (document.getElementById('m-edad-num-manual').value || '').trim();
    edadUnit = document.getElementById('m-edad-unit-manual').value || 'años';
    sexo = document.getElementById('m-sexo').value;
  }

  var v = validatePatientForSave({ nombre: nombre, registro: registro, edadNum: edadNum, edadUnit: edadUnit });
  if (!v.ok) {
    rt.showToast(v.error, 'error');
    shakePatientFieldsForError(v.error, isFromLab);
    return;
  }

  if (!edadNum) {
    rt.showToast('Ingresa la edad', 'error');
    shakePatientFieldsForError('Ingresa la edad', isFromLab);
    return;
  }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    rt.showToast('Edad inválida', 'error');
    shakePatientFieldsForError('Edad inválida', isFromLab);
    return;
  }
  var edad = String(ageInt) + (edadUnit && edadUnit !== 'años' ? ' ' + edadUnit : '');
  var salaMode = isModeSala(rt.getSettings());
  var servicio = (document.getElementById('m-servicio').value || '').trim().toUpperCase();
  var area = salaMode ? servicio : (document.getElementById('m-area').value || '').trim().toUpperCase();
  var cuarto = (document.getElementById('m-cuarto').value || '').trim();
  var cama = (document.getElementById('m-cama').value || '').trim();
  if (!servicio) {
    rt.showToast(salaMode ? 'Ingresa Área / Servicio' : 'Ingresa servicio', 'error');
    shakePatientFieldsForError(salaMode ? 'Ingresa Área / Servicio' : 'Ingresa servicio', isFromLab);
    return;
  }
  if (!salaMode && !area) {
    rt.showToast('Ingresa área / departamento', 'error');
    shakePatientFieldsForError('Ingresa área / departamento', isFromLab);
    return;
  }
  if (!cuarto || !cama) {
    rt.showToast('Ingresa cuarto y cama', 'error');
    shakePatientFieldsForError('Ingresa cuarto y cama', isFromLab);
    return;
  }
  _rememberAdmissionLocation(cuarto, cama);

  var commit = function () {
    var dup = findDuplicatePatient(nombre, registro);
    if (dup) {
      showDuplicateWarning(dup, function () {
        commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
      });
      return;
    }
    commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
  };

  var finalize = function () {
    if (shouldWarnTeamlessPatientSave()) {
      confirmTeamlessPatientSave(commit);
      return;
    }
    commit();
  };

  if (v.warning === 'missing_expediente' && !isFromLab) {
    showExpedienteAdvice(finalize);
    return;
  }
  finalize();
}

function escTxtSafe(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showExpedienteAdvice(onConfirm) {
  var prev = document.getElementById('exp-advice-backdrop');
  if (prev) prev.remove();
  var advice = buildExpedienteAdvice();
  var b = document.createElement('div');
  b.className = 'lab-conflict-backdrop';
  b.id = 'exp-advice-backdrop';
  b.innerHTML =
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="exp-advice-title">' +
    '<h3 id="exp-advice-title">' +
    escTxtSafe(advice.title) +
    '</h3>' +
    '<p>' +
    escTxtSafe(advice.body) +
    '</p>' +
    '<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">' +
    '<button type="button" class="btn-cancel" id="exp-advice-cancel">' +
    escTxtSafe(advice.cancelLabel) +
    '</button>' +
    '<button type="button" class="btn-conflict-primary" id="exp-advice-confirm">' +
    escTxtSafe(advice.confirmLabel) +
    '</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(b);
  var close = function () {
    var x = document.getElementById('exp-advice-backdrop');
    if (x) x.remove();
  };
  document.getElementById('exp-advice-cancel').onclick = function () {
    close();
    var input = document.getElementById('m-registro-manual') || document.getElementById('m-registro');
    if (input) {
      try {
        input.focus();
      } catch (e) {}
    }
  };
  document.getElementById('exp-advice-confirm').onclick = function () {
    close();
    onConfirm();
  };
}

async function assignTeamFromRegistrationModal(patientId) {
  var teamId = readPatientRegistrationTeamId();
  if (!teamId) return;
  var res = await assignPatientToTeamClinical(patientId, teamId);
  if (!res.ok) {
    rt.showToast('Paciente guardado, pero no se pudo asignar al equipo', 'warn');
  }
}

function openExpedienteAfterBulkPreviewRegistration(patientId) {
  if (typeof rt.suspendLabBulkPreviewModal === 'function') {
    rt.suspendLabBulkPreviewModal();
  }
  rt.switchAppTab('nota');
  rt.switchInnerTab('datos');
  rt.showToast(
    'Paciente registrado. Revisa el expediente; vuelve a Lab para Procesar todo.',
    'success'
  );
}

function commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  var today = new Date();
  var fecha =
    String(today.getDate()).padStart(2, '0') +
    '/' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '/' +
    today.getFullYear();
  var hora =
    String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
  var patient = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    nombre: nombre,
    registro: registro,
    edad: edad,
    sexo: sexo,
    area: area,
    servicio: servicio,
    cuarto: cuarto,
    cama: cama,
    fromLab: !!isFromLab,
  };
  var adoptResult = adoptTourPatientOnCommit(patient, registro);
  patient = adoptResult.patient;
  if (patient.isDemo) {
    var existingDemo = patients.find(function (x) {
      return x && x.id === patient.id;
    });
    if (existingDemo) {
      var onSavedDup = pendingAddPatientSavedCallback;
      pendingAddPatientSavedCallback = null;
      closeModal();
      rt.showToast(existingDemo.nombre + ' ya está en el censo', 'info');
      if (onSavedDup) {
        try {
          onSavedDup(existingDemo);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
  }
  stampPatientClinicalSala(patient, clinicalSessionContext.user);
  stampPatientRegistrationMeta(patient, clinicalSessionContext.user);
  notes[patient.id] = {
    fecha: fecha,
    hora: hora,
    interrogatorio: '',
    evolucion: '',
    estudios: '',
    diagnosticos: [''],
    tratamiento: [''],
    ta: '',
    fr: '',
    fc: '',
    temp: '',
    peso: '',
    medico: '',
    profesor: '',
  };
  indicaciones[patient.id] = {
    fecha: fecha,
    hora: hora,
    medicos: '',
    dieta: '',
    cuidados: '',
    estudios: '',
    medicamentos: '',
    interconsultas: '',
    otros: [],
  };
  rt.applyDefaultsToNewPatient(patient.id);
  rt.applyDefaultsToNewIndicaciones(patient.id);
  patients.push(patient);

  saveState();
  var onSaved = pendingAddPatientSavedCallback;
  pendingAddPatientSavedCallback = null;
  var fromBulkPreview = pendingAddPatientFromBulkPreview;
  pendingAddPatientFromBulkPreview = false;
  closeModal();
  void assignTeamFromRegistrationModal(patient.id);
  var pendingLab = null;
  var stayOnLabForTour = isFromLab && shouldTourStayOnLabAfterLabCommit();
  if (isFromLab && !stayOnLabForTour && !fromBulkPreview) {
    pendingLab = rt.consumeActiveLab ? rt.consumeActiveLab() : null;
    if (rt.clearLabOutputUi) rt.clearLabOutputUi();
    rt.switchAppTab('nota');
  } else if (isFromLab && stayOnLabForTour) {
    pendingLab = null;
  }
  renderPatientList();
  var activeId = patient.id;
  if (shouldSelectTourPrimaryAfterLabCommit(patient.id, patients)) {
    var perez = findTourDemoPatientByRegistro(patients, DEMO_REGISTRO);
    if (perez) activeId = perez.id;
  }
  selectPatient(activeId);
  if (fromBulkPreview) {
    openExpedienteAfterBulkPreviewRegistration(activeId);
  } else {
    rt.showToast('Paciente agregado', 'success');
  }
  if (adoptResult.afterCommit) {
    try {
      adoptResult.afterCommit(patient);
    } catch (e) {
      console.error(e);
    }
  }
  if (onSaved) {
    try {
      onSaved(patient);
    } catch (e) {
      console.error(e);
    }
  }
  if (pendingLab) {
    rt.restoreActiveLab(pendingLab);
    rt.enviarLabsANota();
    rt.consumeActiveLab();
  }
}

export function generatePatientId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function buildPatientEntry(patientId) {
  var patient = patients.find(function (p) {
    return p.id === patientId;
  });
  if (!patient || patient.id === DEMO_PATIENT_ID) return null;
  var patientSnap = { ...patient };
  ensureMonitoreo(patientSnap);
  if (patient.monitoreo != null && typeof patient.monitoreo === 'object') {
    patientSnap.monitoreo = structuredClone(patient.monitoreo);
  }
  if (patientSnap.historiaClinica != null && typeof patientSnap.historiaClinica === 'object') {
    const hc = structuredClone(patientSnap.historiaClinica);
    delete hc.pendingLanSync;
    delete hc.lanSyncPending;
    patientSnap.historiaClinica = hc;
  }
  return {
    patient: patientSnap,
    note: notes[patientId] || {},
    indicaciones: indicaciones[patientId] || {},
    labHistory: Array.isArray(labHistory[patientId]) ? labHistory[patientId] : [],
    medReceta: medRecetaByPatient[patientId] || null,
    medPharmProfile: medPharmProfileByPatient[patientId] || null,
    vpo: vpoByPatient[patientId] || null,
    listadoProblemas: listadoProblemas[patientId] || null,
    todos: storage.getTodos(patientId),
  };
}

export function findPatientByRegistro(registro) {
  var r = String(registro || '').trim();
  if (!r) return null;
  return (
    patients.find(function (p) {
      return String(p.registro || '').trim() === r;
    }) || null
  );
}

export function ensureUniquePatientName(base) {
  var desired = String(base || '').trim() || 'PACIENTE SIN NOMBRE';
  var normalized = desired.toUpperCase();
  var has = patients.some(function (p) {
    return String(p.nombre || '').trim().toUpperCase() === normalized;
  });
  if (!has) return desired;
  var i = 2;
  while (i < 9999) {
    var candidate = desired + ' (' + i + ')';
    var exists = patients.some(function (p) {
      return String(p.nombre || '').trim().toUpperCase() === candidate.toUpperCase();
    });
    if (!exists) return candidate;
    i += 1;
  }
  return desired + ' (COPIA)';
}

export function focusPatientSearchInput() {
  var el = document.getElementById('patient-search');
  if (!el) return;
  try {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (_e) {
    try {
      el.focus();
    } catch (_e2) {}
  }
}

export function initPatientModalEnterSave() {
  var modal = document.getElementById('modal');
  if (!modal) return;
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') savePatient();
  });
}

export const windowHandlers = {
  onPatientSearchInput,
  focusPatientSearchInput,
  togglePatientPinned,
  togglePatientArchived,
  togglePatientRoundSeen,
  movePatientByOffset,
  toggleArchivedSection,
  toggleSidebarAutoHide,
  openAddModal,
  openAddModalFromLab,
  closeModal,
  savePatient,
  selectPatient,
  deletePatient,
  openFullExpedienteFromRound,
  returnToRoundOverview,
  closeRondaQuickMoreMenu,
};
