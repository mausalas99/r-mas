/**
 * Interconsulta mode chrome (design handoff screen 10b, corrected 2026-08-25
 * navigation model).
 *
 * Reuses the same Resumen patient summary as Sala — this file paints the
 * frame around it (top bar + consult-info band), AND owns the interconsulta
 * navigation: in IC mode the sidebar is hidden entirely and the 4-team board
 * fills the main window as the default view; clicking a patient card drills
 * into that patient's full-window Resumen; the bar's "← Tablero" back
 * button (or Esc) returns to the board.
 *
 * The bar's layout is deliberately NOT `wb-mode-frame` (band 1 used by
 * Guardia): the design spec calls for a 3-column CSS grid
 * (`200px minmax(0,1fr) auto`) at 52px, versus wb-mode-frame's flex layout
 * at ~44px. Buttons still reuse the shared `.wb-btn*` classes from
 * workbench-kit.css for visual parity.
 *
 * "Generar nota" stays a real .docx-generation call (`window.generateWord`,
 * see notes-indicaciones.mjs) but is demoted from a primary action into an
 * overflow menu item here, per the 10b spec ("existe pero no ocupa lugar
 * visual").
 */
import { escHtml } from '../dom-escape.mjs';
import { isModeSala } from '../mode-features.mjs';
import { isGuardiaMode } from './chrome.mjs';
import { settingsRef } from './profile-runtime.mjs';
import { getPatients, persistClinicalState } from '../app-state.mjs';
import { getConsultInfo, setConsultInfo, renderConsultBandHtml } from './patient-dashboard/consult-band.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import { getClinicalScopeContextForEvaluate } from '../clinical-access-runtime.mjs';
import { resolvePatientCensusTeamId } from './patients-clinical-filter.mjs';
import { patientsVisibleInSidebar } from './patients-scope.mjs';
import { mountInterconsultaTeamBoard } from './interconsulta-team-board.mjs';
import { openServicePickerModal } from './patient-dashboard/ic-modal.mjs';
import { openAddModal } from './patients-modal.mjs';
import { renderPatientCardHtml } from './patients-card-html.mjs';
import { patientCardIdFromEvent, shouldHandleTouchPointerUp } from './patients-list-click.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { isInterconsultaDemoActive } from './interconsulta-demo-state.mjs';
import {
  ensureInterconsultaDemoInScope,
  recordInterconsultaDemoPatientAssignment,
} from './interconsulta-demo-toggle.mjs';
import { isInterconsultaDemoTeamId } from '../../../lib/clinical-scope/interconsulta-demo-seed.mjs';
import { normalizeServiceKey } from '../../../lib/clinical-scope/shared.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import {
  assignableTeamsForUser,
  shouldGroupAssignableTeamsBySala,
  activePatientTeamId,
  assignPatientToTeamClinical,
} from '../patient-team-assign-ui.mjs';

var rt = {
  getActiveId() {
    return null;
  },
  renderPatientList() {},
  showToast() {},
};

export function registerInterconsultaChromeRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

/** True when the app should show the 10b interconsulta frame (not Guardia). */
export function isInterconsultaModeActive() {
  return !isModeSala(settingsRef()) && !isGuardiaMode();
}

/** "Solo guardia de hoy" board filter — narrows the team board to just the
 * on-call team's Preop/Nuevas-hoy bucket. Read by mountInterconsultaBoardView
 * below; reset on module reload (session-only, not persisted). */
var _guardiaOnlyFilter = false;

export function isInterconsultaGuardiaOnlyFilterActive() {
  return _guardiaOnlyFilter;
}

function syncGuardiaOnlyFilterButton(container) {
  var btn = container && container.querySelector('[data-wb-ic-guardia-filter]');
  if (!btn) return;
  btn.setAttribute('aria-pressed', _guardiaOnlyFilter ? 'true' : 'false');
  btn.classList.toggle('wb-btn-toggle--on', _guardiaOnlyFilter);
}

/** "Ocultar post-guardia" board toggle — display-only, hides the
 * postguardia lane without touching data or rollover logic. Session-only,
 * not persisted, reset on module reload. */
var _hidePostguardia = false;

export function isInterconsultaPostguardiaHidden() {
  return _hidePostguardia;
}

function syncPostguardiaFilterButton(container) {
  var btn = container && container.querySelector('[data-wb-ic-hide-postguardia]');
  if (!btn) return;
  btn.setAttribute('aria-pressed', _hidePostguardia ? 'true' : 'false');
  btn.classList.toggle('wb-btn-toggle--on', _hidePostguardia);
}

/** Board ↔ patient drill-down state — 'board' is the IC mode default view. */
var _icView = 'board';
var _wasInterconsultaActive = false;
var _icArchivedCollapsed = true;

function isIcPatientViewOpen() {
  return _icView === 'patient';
}

function syncBackButtonVisibility(container) {
  var root = container || document.getElementById('interconsulta-mode-frame');
  var btn = root && root.querySelector('[data-wb-ic-back]');
  if (btn) btn.hidden = !isIcPatientViewOpen();
}

export function buildInterconsultaBarHtml() {
  return (
    '<div class="wb-ic-bar">' +
    '<div class="wb-ic-bar-name">' +
    '<button type="button" class="wb-btn wb-btn-secondary wb-ic-back-btn" data-wb-ic-back hidden title="Volver al tablero de equipos">← Tablero</button>' +
    '<span class="wb-mode-frame-name">Interconsulta</span></div>' +
    '<div class="wb-ic-bar-mid"></div>' +
    '<div class="wb-ic-bar-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary wb-btn-toggle" data-wb-ic-guardia-filter aria-pressed="false" title="Mostrar solo Preop / Nuevas hoy del equipo de guardia">' +
    'Solo guardia de hoy' +
    '</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary wb-btn-toggle" data-wb-ic-hide-postguardia aria-pressed="false" title="Oculta la calle de post-guardia del tablero (no cambia los datos)">' +
    'Ocultar post-guardia' +
    '</button>' +
    '<details class="wb-menu" data-wb-ic-menu>' +
    '<summary class="wb-btn wb-btn-secondary" aria-haspopup="menu" title="Más acciones">⋯</summary>' +
    '<div class="wb-menu-panel" role="menu">' +
    '<button type="button" class="wb-menu-item" role="menuitem" data-wb-ic-generar-nota>' +
    escHtml('Generar nota (.docx)') +
    '</button>' +
    '</div></details>' +
    '<button type="button" class="wb-btn wb-btn-secondary wb-btn-shortcut" data-wb-shortcut>⌘/</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-wb-ic-primary>Actualizar pacientes</button>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {{ onPrimary?: () => void, onGenerarNota?: () => void, onShortcut?: () => void, onBack?: () => void }} opts
 */
export function mountInterconsultaBar(container, opts) {
  if (!container) return undefined;
  container.innerHTML = buildInterconsultaBarHtml();
  var o = opts || {};

  var guardiaFilterBtn = container.querySelector('[data-wb-ic-guardia-filter]');
  if (guardiaFilterBtn) {
    syncGuardiaOnlyFilterButton(container);
    guardiaFilterBtn.addEventListener('click', function () {
      _guardiaOnlyFilter = !_guardiaOnlyFilter;
      syncGuardiaOnlyFilterButton(container);
      renderInterconsultaBoardView();
    });
  }

  var hidePostguardiaBtn = container.querySelector('[data-wb-ic-hide-postguardia]');
  if (hidePostguardiaBtn) {
    syncPostguardiaFilterButton(container);
    hidePostguardiaBtn.addEventListener('click', function () {
      _hidePostguardia = !_hidePostguardia;
      syncPostguardiaFilterButton(container);
      renderInterconsultaBoardView();
    });
  }

  var backBtn = container.querySelector('[data-wb-ic-back]');
  if (backBtn) {
    syncBackButtonVisibility(container);
    backBtn.addEventListener('click', function () {
      if (typeof o.onBack === 'function') o.onBack();
      showInterconsultaBoardView();
    });
  }

  var menu = container.querySelector('[data-wb-ic-menu]');
  var generarBtn = container.querySelector('[data-wb-ic-generar-nota]');
  if (generarBtn) {
    generarBtn.addEventListener('click', function () {
      if (menu) menu.open = false;
      if (typeof o.onGenerarNota === 'function') o.onGenerarNota();
    });
  }
  if (menu) {
    document.addEventListener('click', function (ev) {
      if (menu.open && !menu.contains(ev.target)) menu.open = false;
    });
  }

  var shortcutBtn = container.querySelector('[data-wb-shortcut]');
  if (shortcutBtn && typeof o.onShortcut === 'function') {
    shortcutBtn.addEventListener('click', o.onShortcut);
  }

  var primaryBtn = container.querySelector('[data-wb-ic-primary]');
  if (primaryBtn && typeof o.onPrimary === 'function') {
    primaryBtn.addEventListener('click', o.onPrimary);
  }

  return container;
}

function activeInterconsultaPatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(id);
    }) || null
  );
}

/** Interconsultas-service teams the current user can assign a patient to —
 * demo teams while the demo is active (assignableTeamsForUser() only returns
 * teams the signed-in user actually joined, which never includes in-memory
 * demo teams), the user's real joined Interconsultas teams otherwise. */
function interconsultaAssignableTeams() {
  if (isInterconsultaDemoActive()) {
    return (clinicalSessionContext.teams || []).filter((t) => isInterconsultaDemoTeamId(t && t.team_id));
  }
  return assignableTeamsForUser(clinicalSessionContext.user).filter((t) =>
    normalizeServiceKey(t && t.service).includes('interconsult')
  );
}

function consultBandTeamCtx(patient) {
  return {
    teams: interconsultaAssignableTeams(),
    currentTeamId: activePatientTeamId(patient.id),
    groupBySala: shouldGroupAssignableTeamsBySala(clinicalSessionContext.user),
  };
}

function consultBandHost() {
  return document.querySelector('#patient-dashboard-mount .idrow .id-name-row');
}

/** Removes the consult-band fields from the Resumen dashboard, if present. */
function removeConsultBandRow() {
  var row = document.querySelector('.ic-consult-band');
  if (row) row.remove();
}

/** Repaints the consult-info fields inline beside the patient name (inside
 * .idrow .id-name-row, right after the name button) — no card/box, just the
 * fields sitting next to "Diana Rios" the way the rest of .id-name-row's
 * content (diagnosis chips) does. No-op (removes) with no active patient;
 * visibility while off-screen (board view, non-IC mode) is the caller's job,
 * same as before. */
export function renderConsultBandForActivePatient() {
  var host = consultBandHost();
  var patient = activeInterconsultaPatient();
  if (!host || !patient) {
    removeConsultBandRow();
    return;
  }
  var html = renderConsultBandHtml(getConsultInfo(patient), consultBandTeamCtx(patient));
  var existing = host.querySelector('.ic-consult-band');
  if (existing) {
    existing.outerHTML = html;
  } else {
    host.insertAdjacentHTML('beforeend', html);
  }
  ensureConsultBandDelegation(host.querySelector('.ic-consult-band'));
}

/** Removes the "← Tablero" back-to-board row from the Resumen dashboard, if present. */
function removeBackToBoardRow() {
  var row = document.querySelector('[data-ic-back-to-board]');
  if (row) row.remove();
}

/** Renders a "← Tablero" button as the very first row of the Resumen
 * dashboard, right above the patient name — the only way back to the team
 * board now that the old horizontal frame bar is retired (see
 * syncInterconsultaModeChrome). No-op (removes) outside the drilled-in
 * patient view. */
function renderBackToBoardButton() {
  var dash = document.querySelector('#patient-dashboard-mount .dash');
  var patient = activeInterconsultaPatient();
  if (!dash || !patient) {
    removeBackToBoardRow();
    return;
  }
  if (dash.querySelector('[data-ic-back-to-board]')) return;
  dash.insertAdjacentHTML(
    'afterbegin',
    '<button type="button" class="wb-btn wb-btn-secondary wb-ic-back-btn" ' +
      'data-ic-back-to-board title="Volver al tablero de equipos">← Tablero</button>'
  );
  dash.querySelector('[data-ic-back-to-board]').addEventListener('click', function () {
    showInterconsultaBoardView();
  });
}

/** Servicio solicitante / Motivo / Seguimiento — the only place a user can set
 * these, since consultInfo has no other editing UI in the app. */
function handleConsultBandChange(ev) {
  if (ev.target.hasAttribute && ev.target.hasAttribute('data-consult-team-select')) {
    handleConsultTeamChange(ev);
    return;
  }
  var field = ev.target.getAttribute && ev.target.getAttribute('data-consult-field');
  if (!field) return;
  var patient = activeInterconsultaPatient();
  if (!patient) return;
  var patch = {};
  patch[field] = ev.target.value;
  setConsultInfo(patient, patch);
  patient.lanUpdatedAt = new Date().toISOString();
  persistClinicalState();
  scheduleCloudSyncPush();
  if (field === 'followUpStatus') renderConsultBandForActivePatient();
}

/** Local-only reassignment for demo patients — they have no real DB row, so
 * the real IPC-backed assignPatientToTeamClinical would just fail for them. */
function assignDemoPatientTeamLocally(patient, teamId) {
  var scope = clinicalSessionContext.scopeContext;
  // scope.now is a frozen snapshot timestamp (see getClinicalScopeContextForEvaluate) —
  // resolvePatientTeamIdFromAssignments drops any row whose effective_at is after it, so
  // a fresh wall-clock stamp here would always read as "in the future" and get ignored.
  var now = (scope && scope.now) || new Date().toISOString();
  // Recorded on the demo module's durable snapshot (not just scopeContext directly) —
  // scopeContext gets wholesale-replaced by any real scope refresh (Nube pull, LAN
  // reconcile), which would otherwise silently drop this reassignment.
  recordInterconsultaDemoPatientAssignment(patient.id, teamId, now);
}

/** Shared by the consult-band team select and the board's drag/drop —
 * demo patients have no real DB row, so they reassign locally. */
function assignInterconsultaPatientTeam(patient, teamId) {
  if (patient.isDemo) {
    assignDemoPatientTeamLocally(patient, teamId);
    return Promise.resolve({ ok: true });
  }
  return assignPatientToTeamClinical(patient.id, teamId);
}

function handleConsultTeamChange(ev) {
  var patient = activeInterconsultaPatient();
  if (!patient) return;
  var teamId = String(ev.target.value || '');
  assignInterconsultaPatientTeam(patient, teamId).then(function (res) {
    if (res && res.ok) {
      renderConsultBandForActivePatient();
      renderInterconsultaBoardView();
      if (typeof rt.showToast === 'function') rt.showToast('Equipo actualizado', 'success');
    } else if (typeof rt.showToast === 'function') {
      rt.showToast('No se pudo cambiar el equipo', 'error');
    }
  });
}

/** mountInterconsultaTeamBoard's `opts.assignTeam` — dropping a card on a
 * lane reassigns that patient the same way the consult-band select does. */
function assignInterconsultaTeamViaBoardDrop(patientId, teamId) {
  var patient = getPatients().find(function (p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return Promise.resolve({ ok: false });
  return assignInterconsultaPatientTeam(patient, teamId).then(function (res) {
    if (res && res.ok) {
      if (typeof rt.showToast === 'function') rt.showToast('Equipo actualizado', 'success');
    } else if (typeof rt.showToast === 'function') {
      rt.showToast('No se pudo cambiar el equipo', 'error');
    }
    return res;
  });
}

/** Servicio solicitante opens the categorized catalog picker (same chip UX
 * as the sala interconsultantes picker) instead of free text. */
function handleConsultBandClick(ev) {
  var trigger = ev.target.closest && ev.target.closest('[data-ic-req-trigger]');
  if (!trigger) return;
  var patient = activeInterconsultaPatient();
  if (!patient) return;
  openServicePickerModal({
    current: getConsultInfo(patient).requestingService,
    trigger: trigger,
    onSelect: function (name) {
      setConsultInfo(patient, { requestingService: name });
      // Keep the card meta chip (patients-card-html.mjs's p.servicio) in
      // sync with the requesting specialty picked here.
      patient.servicio = name;
      patient.lanUpdatedAt = new Date().toISOString();
      persistClinicalState();
      scheduleCloudSyncPush();
      renderConsultBandForActivePatient();
      if (typeof rt.renderPatientList === 'function') rt.renderPatientList();
    },
  });
}

function ensureConsultBandDelegation(bandMount) {
  if (bandMount.dataset.icBandWired) return;
  bandMount.dataset.icBandWired = '1';
  bandMount.addEventListener('change', handleConsultBandChange);
  bandMount.addEventListener('click', handleConsultBandClick);
}

function refreshPatients() {
  if (typeof rt.renderPatientList === 'function') rt.renderPatientList();
  renderInterconsultaBoardView();
  if (typeof rt.showToast === 'function') rt.showToast('Pacientes actualizados', 'success');
}

function icArchivedToggleHtml(collapsed, count) {
  return (
    '<button type="button" class="patient-list-section-toggle" data-ic-archived-toggle aria-expanded="' +
    (!collapsed ? 'true' : 'false') +
    '">Archivados <span>(' +
    count +
    ')</span> <span>' +
    (collapsed ? '▶' : '▼') +
    '</span></button>'
  );
}

function renderIcArchivedSectionHtml(archivedPatients) {
  if (!archivedPatients.length) return '';
  var parts = [icArchivedToggleHtml(_icArchivedCollapsed, archivedPatients.length)];
  if (!_icArchivedCollapsed) {
    parts.push('<div class="patient-sort-zone" data-ic-archived-zone>');
    parts.push(archivedPatients.map(renderPatientCardHtml).join(''));
    parts.push('</div>');
  }
  return parts.join('');
}

function icBoardMount() {
  return document.getElementById('ic-board-mount');
}

function selectPatientFromIcBoardEvent(ev) {
  var pid = patientCardIdFromEvent(ev);
  if (!pid) return;
  patientsBridge.selectPatient(pid);
  showInterconsultaPatientView();
}

function ensureIcBoardClickDelegation(mount) {
  if (!mount || mount.dataset.icBoardWired) return;
  mount.dataset.icBoardWired = '1';
  mount.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-ic-archived-toggle]')) {
      _icArchivedCollapsed = !_icArchivedCollapsed;
      renderInterconsultaBoardView();
      return;
    }
    selectPatientFromIcBoardEvent(ev);
  });
  mount.addEventListener('pointerup', function (ev) {
    if (!shouldHandleTouchPointerUp(ev)) return;
    selectPatientFromIcBoardEvent(ev);
  });
}

/** Paints the 4-lane team board + Archivados into the main-window mount. No-op outside IC mode. */
export function renderInterconsultaBoardView() {
  var mount = icBoardMount();
  if (!mount || !isInterconsultaModeActive()) return;
  ensureIcBoardClickDelegation(mount);
  // A background scope refresh (Nube pull, LAN reconcile) since the last render may
  // have wholesale-replaced scopeContext and dropped the demo teams/assignments — heal it.
  ensureInterconsultaDemoInScope();

  var ctx = getClinicalScopeContextForEvaluate() || {};
  var teams = ctx.teams || [];
  var assignments = ctx.assignments || [];
  var now = ctx.now || new Date().toISOString();
  var demoOnly = isInterconsultaDemoActive();
  if (demoOnly) teams = teams.filter((t) => isInterconsultaDemoTeamId(t && t.team_id));
  // Demo mode bypasses patientsVisibleInSidebar()'s Equipo/Sala Filtros —
  // a real pinned team/sala preference would otherwise zero out every demo
  // patient (none of them match a real team or sala id).
  var visible = demoOnly ? getPatients().filter((p) => !!p.isDemo) : patientsVisibleInSidebar();
  var archived = visible.filter(function (p) {
    return !!p.archived || p.interconsult_status === 'Resolved';
  });
  var active = visible
    .filter(function (p) {
      return !p.archived && p.interconsult_status !== 'Resolved';
    })
    .map(function (p) {
      return Object.assign({}, p, {
        censusTeamId: resolvePatientCensusTeamId(p, teams, assignments, now),
      });
    });

  mount.innerHTML =
    '<div class="ic-board-header">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-ic-board-add>+ Agregar</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-ic-board-refresh>Actualizar pacientes</button>' +
    '</div>' +
    '<div id="ic-team-board-mount"></div><div id="ic-archived-mount"></div>';
  mount.querySelector('[data-ic-board-refresh]').addEventListener('click', refreshPatients);
  mount.querySelector('[data-ic-board-add]').addEventListener('click', openAddModal);
  mountInterconsultaTeamBoard(mount.querySelector('#ic-team-board-mount'), active, teams, {
    now: now,
    filterGuardiaOnly: isInterconsultaGuardiaOnlyFilterActive(),
    hidePostguardia: isInterconsultaPostguardiaHidden(),
    assignTeam: assignInterconsultaTeamViaBoardDrop,
    onAssignTeam: function () {
      renderInterconsultaBoardView();
    },
  });
  mount.querySelector('#ic-archived-mount').innerHTML = renderIcArchivedSectionHtml(archived);
}

/** Resumen (#empty-state/#patient-view) already manage their own inline
 * display style elsewhere (patients-select.mjs) — this only force-hides
 * them while the board is the active IC view; showing them back on drill-in
 * is left to that existing selection flow (already run by the time
 * showInterconsultaPatientView is called), not duplicated here. */
function forceHideResumenPanels() {
  var emptyState = document.getElementById('empty-state');
  var patientView = document.getElementById('patient-view');
  if (emptyState) emptyState.style.display = 'none';
  if (patientView) patientView.style.display = 'none';
}

function syncIcViewVisibility() {
  var boardMount = icBoardMount();
  var onBoard = _icView === 'board';
  if (boardMount) boardMount.hidden = !onBoard;
  if (onBoard) forceHideResumenPanels();
  // CSS backstop (layout.css) — belt-and-suspenders against any later code
  // (e.g. patients-select.mjs's own inline-style show/hide) re-showing
  // Resumen after forceHideResumenPanels already ran this render.
  document.documentElement.classList.toggle(
    'ic-board-view-open',
    onBoard && isInterconsultaModeActive()
  );
  var barMount = document.getElementById('interconsulta-mode-frame');
  syncBackButtonVisibility(barMount);
  // The per-patient consult-info band (SERVICIO SOLICITANTE / MOTIVO DE
  // CONSULTA / SEGUIMIENTO) has nothing to show on the board — only the
  // drilled-in Resumen has a patient to describe.
  if (!onBoard && isInterconsultaModeActive()) {
    renderConsultBandForActivePatient();
    renderBackToBoardButton();
  } else {
    removeConsultBandRow();
    removeBackToBoardRow();
  }
}

export function showInterconsultaBoardView() {
  _icView = 'board';
  renderInterconsultaBoardView();
  syncIcViewVisibility();
}

export function showInterconsultaPatientView() {
  _icView = 'patient';
  syncIcViewVisibility();
}

var _icEscHandlerWired = false;

function ensureIcEscHandler() {
  if (_icEscHandlerWired) return;
  _icEscHandlerWired = true;
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!isInterconsultaModeActive() || !isIcPatientViewOpen()) return;
    showInterconsultaBoardView();
  });
}

/** Shows/hides + (re)paints the 10b frame and band. Call on any mode or patient change. */
export function syncInterconsultaModeChrome() {
  var barMount = document.getElementById('interconsulta-mode-frame');
  var boardMount = icBoardMount();
  var active = isInterconsultaModeActive();
  if (barMount) barMount.hidden = true;
  document.documentElement.classList.toggle('ic-board-mode', active);
  if (!active) {
    document.documentElement.classList.remove('ic-board-view-open');
    if (boardMount) boardMount.hidden = true;
    removeConsultBandRow();
    removeBackToBoardRow();
    if (_wasInterconsultaActive) {
      // Undo forceHideResumenPanels()'s override — show exactly one of
      // empty-state/patient-view, matching the active-patient state.
      // #patient-view has no CSS display rule of its own (only inline style
      // controls it), so clearing to '' falls back to 'block' and shows both
      // panels at once — must set 'none'/'flex' explicitly (see patients-scope.mjs).
      var emptyState = document.getElementById('empty-state');
      var patientView = document.getElementById('patient-view');
      var hasActivePatient = rt.getActiveId() != null;
      if (emptyState) emptyState.style.display = hasActivePatient ? 'none' : 'flex';
      if (patientView) patientView.style.display = hasActivePatient ? 'flex' : 'none';
    }
    _wasInterconsultaActive = false;
    return;
  }
  if (barMount && !barMount.dataset.wbIcMounted) {
    mountInterconsultaBar(barMount, {
      onPrimary: refreshPatients,
      onGenerarNota: function () {
        if (typeof window !== 'undefined' && typeof window.generateWord === 'function') {
          window.generateWord();
        }
      },
    });
    barMount.dataset.wbIcMounted = '1';
  }
  ensureIcEscHandler();
  if (!_wasInterconsultaActive) {
    // Just entered interconsulta mode — always land on the board, never on
    // whatever patient happened to be active before switching modes.
    _wasInterconsultaActive = true;
    _icView = 'board';
  }
  renderInterconsultaBoardView();
  syncIcViewVisibility();
}
