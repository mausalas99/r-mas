import { getPatients, persistClinicalState } from '../app-state.mjs';
import { cloudPullProgress } from '../clinical-session-context.mjs';
import {
  renderGuardiaCensusGrid,
  syncGuardiaCensusPanelVisibility,
  isClinicalScopeReadyForPatientApply,
} from '../clinical-access-runtime.mjs';
import { shouldEnforceTeamPatientMirror } from '../clinical-privileges.mjs';
import { isCloudMobileClient } from './cloud-mobile/origin.mjs';
import { isMobileWeb } from '../mobile-web.mjs';
import { isPatientBulkSelectMode } from './patients-bulk-select.mjs';
import {
  buildPatientListZones,
  buildRondaNavIds,
  messagePatientListState,
  nextPatientListState,
  patientListCardCount,
  reorderPatientsByIds,
  withActivePatient,
} from './patients-list-model.mjs';
import { buildPatientCardEnv } from './patients-card-env.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { openCompleteAdmissionModal } from './patients-modal.mjs';
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import {
  patientsVisibleInSidebar,
  patientMatchesSearch,
  reselectIfActivePatientHidden,
  getPatientSearchFilter,
  syncClinicalCensusFiltersBar,
  syncCensusFilterSalaState,
} from './patients-scope.mjs';
import { syncPatientListIndicator } from '../patient-list-indicator.mjs';
import { setLastRondaNavIds } from './patients-round.mjs';
import { patientCardIdFromEvent, shouldHandleTouchPointerUp } from './patients-list-click.mjs';
import { syncSalaView } from './sala-view-variants.mjs';

var ARCHIVED_SECTION_COLLAPSED_LS = 'rpc-archived-section-collapsed';

function ensurePatientUiState() {
  for (var i = 0; i < getPatients().length; i++) {
    var p = getPatients()[i];
    if (!p) continue;
    if (typeof p.archived !== 'boolean') p.archived = false;
    if (typeof p.pinned !== 'boolean') p.pinned = false;
  }
}

function isArchivedSectionCollapsed() {
  try {
    return localStorage.getItem(ARCHIVED_SECTION_COLLAPSED_LS) === '1';
  } catch {
    return false;
  }
}

export function setArchivedSectionCollapsed(v) {
  try {
    localStorage.setItem(ARCHIVED_SECTION_COLLAPSED_LS, v ? '1' : '0');
  } catch (e) { console.warn('[patients-list] failed to write ' + ARCHIVED_SECTION_COLLAPSED_LS, e); }
}

export { isArchivedSectionCollapsed };

// ── The view ───────────────────────────────────────────────────────────────
// Preact (patients-list-view.jsx, loaded on first use) owns everything inside #patient-list.
// This file gathers the live inputs, turns them into a state (patients-list-model.mjs) and sets
// it on the view's store. Nothing here edits a card by hand.

/** @type {{ store: object, destroy: () => void }|null} */
var _mounted = null;
var _mountedHost = null;
var _viewMod = null;
var _viewLoading = null;
var _pendingPaint = null;
var _resizeObserver = null;
var _scrollRaf = 0;
var _scrollTop = 0;

/** Zone height: the room left in the sidebar (never under ~5 cards), so a long list scrolls inside its own box. */
function virtualZoneHeight(list, zone) {
  var listRect = list.getBoundingClientRect();
  var zoneRect = zone.getBoundingClientRect();
  var bottomPad = 12;
  // Floor is ~5 cards tall, not just "not zero": when filters/pinned patients eat most of the visible
  // sidebar, the remaining room can be tiny, and clamping to that squeezes this box to 1-2 visible
  // cards. The outer #patient-list is already overflow-y:auto, so letting this box run past the
  // fold is fine — the outer scrollbar picks up the rest.
  var minH = 68 * 5;
  return Math.max(minH, Math.floor(listRect.bottom - zoneRect.top - bottomPad));
}

/** Tell the view how tall the windowed zone is (it draws only the cards that fit). */
function syncVirtualWindow(list) {
  if (!_mounted) return;
  var zone = list.querySelector('.patient-sort-zone--virtual-active');
  if (!zone) return;
  var height = virtualZoneHeight(list, zone);
  if (_mounted.store.get().win.height === height) return;
  _mounted.store.set(function (s) {
    return { ...s, win: { ...s.win, height: height } };
  });
}

function onWindowScroll(top) {
  _scrollTop = top;
  if (_scrollRaf) return;
  _scrollRaf = requestAnimationFrame(function () {
    _scrollRaf = 0;
    if (!_mounted) return;
    _mounted.store.set(function (s) {
      return { ...s, win: { ...s.win, scrollTop: _scrollTop } };
    });
  });
}

function mountListView(list) {
  if (_mounted && _mountedHost === list && list.isConnected) return _mounted;
  if (_mounted) _mounted.destroy();
  if (_resizeObserver) _resizeObserver.disconnect();
  destroyPatientListSortables();
  _mountedHost = list;
  _mounted = _viewMod.mountPatientListView(list, { onScroll: onWindowScroll });
  if (typeof ResizeObserver !== 'undefined') {
    _resizeObserver = new ResizeObserver(function () {
      syncVirtualWindow(list);
    });
    _resizeObserver.observe(list);
  }
  return _mounted;
}

/**
 * Run `paint(view)` now when the view is loaded, else after it loads (the newest request wins:
 * each caller reads the live inputs when its paint runs).
 */
function withListView(paint) {
  if (_viewMod) {
    var list = document.getElementById('patient-list');
    if (list) paint(mountListView(list), list);
    return;
  }
  _pendingPaint = paint;
  if (_viewLoading) return;
  _viewLoading = import('./patients-list-view.jsx').then(
    function (mod) {
      _viewMod = mod;
      var run = _pendingPaint;
      _pendingPaint = null;
      if (run) withListView(run);
    },
    function (err) {
      _viewLoading = null;
      console.warn('[patients-list] could not load the list view', err);
    }
  );
}

/** Put a state on screen; `silent` keeps the scroll place, a normal render starts from the top. */
function paintList(opts, makeState, after) {
  withListView(function (view, list) {
    var scrollTop = opts.silent ? list.scrollTop : 0;
    view.store.set(function (prev) {
      var next = makeState(prev);
      if (opts.silent) return next;
      return { ...next, win: { ...next.win, scrollTop: 0 } };
    });
    if (!opts.silent) {
      var zone = list.querySelector('.patient-sort-zone--virtual-active');
      if (zone) zone.scrollTop = 0;
    }
    syncVirtualWindow(list);
    if (scrollTop > 0) list.scrollTop = scrollTop;
    else if (!opts.silent) list.scrollTop = 0;
    if (after) after(list);
  });
}

// ── Dragging ───────────────────────────────────────────────────────────────
var _patientListSortables = [];
var _sortableZones = [];

function destroyPatientListSortables() {
  _patientListSortables.forEach(function (s) {
    try {
      if (s && typeof s.destroy === 'function') s.destroy();
    } catch (_e) { void _e; }
  });
  _patientListSortables = [];
  _sortableZones = [];
}

/** Card ids in the order the cards now sit in the page (what the user sees after the drop). */
function cardIdsInDomOrder(list) {
  var ids = [];
  list.querySelectorAll('.patient-card[data-patient-id]').forEach(function (el) {
    var pid = el.getAttribute('data-patient-id');
    if (pid) ids.push(pid);
  });
  return ids;
}

/** Sortable moved the card in the page; Preact owns the page, so the card goes back and Preact redraws from the new order. */
function putDraggedCardBack(evt) {
  var zone = evt.from;
  var item = evt.item;
  if (!zone || !item) return;
  var others = Array.prototype.filter.call(zone.children, function (el) {
    return el !== item;
  });
  zone.insertBefore(item, others[evt.oldIndex] || null);
}

function navIds(zones, archivedCollapsed) {
  return buildRondaNavIds(archivedCollapsed ? { ...zones, archived: [] } : zones);
}

function handlePatientSortZoneEnd(evt) {
  if (evt.oldIndex === evt.newIndex || evt.from !== evt.to) return;
  var list = document.getElementById('patient-list');
  if (!list) return;
  var order = cardIdsInDomOrder(list);
  putDraggedCardBack(evt);
  reorderPatientsByIds(getPatients(), order);
  persistClinicalState();
  var filtered = patientsVisibleInSidebar().filter(patientMatchesSearch);
  var zones = buildPatientListZones(filtered, { sortByBed: isMobileWeb() });
  setLastRondaNavIds(navIds(zones, isArchivedSectionCollapsed()));
  paintCards({ silent: true }, filtered);
}

/** Zones that can be dragged: not while searching, in bulk-select, on a phone, or in the windowed zone. */
function ensurePatientListSortables(list) {
  var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
  var wanted =
    !isMobileWeb() &&
    !isPatientBulkSelectMode() &&
    !getPatientSearchFilter() &&
    SortableCtor &&
    typeof SortableCtor.create === 'function';
  var zones = wanted
    ? Array.prototype.slice.call(list.querySelectorAll('.patient-sort-zone:not(.patient-sort-zone--virtual-active)'))
    : [];
  var same =
    zones.length === _sortableZones.length &&
    zones.every(function (z, i) {
      return z === _sortableZones[i];
    });
  if (same) return;
  destroyPatientListSortables();
  zones.forEach(function (zone) {
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      draggable: '.patient-card',
      // .patient-card-open covers the whole card, so it must still start a drag.
      filter: 'button:not(.patient-card-open), a[href], input, textarea, select',
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
      scroll: list,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: handlePatientSortZoneEnd,
    });
    _patientListSortables.push(sortable);
  });
  _sortableZones = zones;
}

// ── Rendering ──────────────────────────────────────────────────────────────
var _patientListRenderQueued = false;
var _patientListSilentTimer = null;
var _censusFiltersBarSyncQueued = false;
var PATIENT_LIST_SILENT_DEBOUNCE_MS = 220;

function scheduleCensusFiltersBarSync() {
  syncCensusFilterSalaState();
  if (_censusFiltersBarSyncQueued) return;
  _censusFiltersBarSyncQueued = true;
  var run = function () {
    _censusFiltersBarSyncQueued = false;
    syncClinicalCensusFiltersBar();
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}

/** @param {{ silent?: boolean }|undefined} [opts] */
function normalizePatientListRenderOpts(opts) {
  return opts && typeof opts === 'object' ? opts : {};
}

/** Marks the open patient on the cards already drawn: only the card that lost it and the one that got it redraw. */
export function patchPatientListActiveHighlight(nextId) {
  var list = document.getElementById('patient-list');
  if (!list || !_mounted || _mountedHost !== list) return false;
  var state = _mounted.store.get();
  if (state.kind !== 'cards' || !patientListCardCount(state)) return false;
  // A windowed list holds every active card in its state. Otherwise the cards must match the
  // sidebar census filters + search, not the raw patients array — otherwise Equipo/Sala filters
  // make lengths diverge and every select forces a full remount.
  if (!state.virtual) {
    var filtered = patientsVisibleInSidebar().filter(patientMatchesSearch);
    if (filtered.length !== patientListCardCount(state)) return false;
  }
  _mounted.store.set(withActivePatient(state, nextId));
  syncPatientListIndicator(list, nextId);
  return true;
}

/**
 * First Nube pull in flight: swap an empty list's «Sin pacientes aún» for
 * «Descargando pacientes…» right now (renderPatientList's silent path is
 * debounced and would land after a fast pull). Never touches a non-empty list.
 */
export function showPatientListDownloadingIfEmpty() {
  var list = document.getElementById('patient-list');
  if (!list || patientsVisibleInSidebar().length) return;
  renderPatientListMessage('Descargando pacientes…', { silent: true });
}

/** Pull done (flag cleared): re-render so an empty result doesn't keep «Descargando pacientes…». */
export function settlePatientListAfterDownload() {
  renderPatientList({ silent: true });
}

/** @param {{ silent?: boolean, force?: boolean }|undefined} [opts] — silent: LAN/incremental; force: flush now (Filtros censo) */
export function renderPatientList(opts) {
  opts = normalizePatientListRenderOpts(opts);
  if (opts.silent && !opts.force) {
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
  if (opts.force) {
    _patientListRenderQueued = false;
    renderPatientListNow({ silent: !!opts.silent });
    return;
  }
  if (_patientListRenderQueued) return;
  _patientListRenderQueued = true;
  requestAnimationFrame(function () {
    _patientListRenderQueued = false;
    renderPatientListNow();
  });
}

/** Grey text in place of the list («Sin pacientes aún», …). `tone: 'slate'` is the lighter «Sincronizando equipo…» colour. */
function renderPatientListMessage(msg, opts, tone) {
  paintList(
    opts,
    function (prev) {
      return messagePatientListState(prev, msg, tone);
    },
    function () {
      destroyPatientListSortables();
      setLastRondaNavIds([]);
      if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
      if (!opts.silent) {
        syncGuardiaCensusPanelVisibility(rt.getSettings());
        renderGuardiaCensusGrid(rt.getSettings());
      }
    }
  );
}

/** The cards for `filtered` patients, drawn from the page's current inputs. */
function paintCards(opts, filtered, andThen) {
  paintList(
    opts,
    function (prev) {
      var zones = buildPatientListZones(filtered, { sortByBed: isMobileWeb() });
      var collapsed = isArchivedSectionCollapsed();
      setLastRondaNavIds(navIds(zones, collapsed));
      return nextPatientListState(prev, zones, buildPatientCardEnv(), collapsed);
    },
    function (list) {
      ensurePatientListSortables(list);
      if (andThen) andThen();
    }
  );
}

/** The IC board reads the same patients/scope: repaint it when the list refreshes (boot scope load, sync). */
function repaintIcBoard() {
  if (!document.getElementById('ic-team-board-mount')) return;
  import('./interconsulta-mode-chrome.mjs').then(function (mod) {
    mod.renderInterconsultaBoardView();
  }).catch(function () {});
}

/** @param {{ silent?: boolean }|undefined} [opts] */
function renderPatientListNow(opts) {
  opts = normalizePatientListRenderOpts(opts);
  queueMicrotask(syncSalaView);
  queueMicrotask(repaintIcBoard);
  if (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    renderPatientListMessage(
      isCloudMobileClient()
        ? 'Censo vacío en la nube. Deja R+ abierto en el Mac del turno unos segundos y recarga.'
        : 'Sincronizando equipo…',
      { silent: true },
      'slate'
    );
    return;
  }
  ensurePatientUiState();
  ensurePatientListClickDelegation();
  if (opts.silent) scheduleCensusFiltersBarSync();
  else syncClinicalCensusFiltersBar();
  var list = document.getElementById('patient-list');
  if (!list) return;
  var visiblePatients = patientsVisibleInSidebar();
  if (!visiblePatients.length) {
    if (cloudPullProgress.freshInFlight) {
      renderPatientListMessage('Descargando pacientes…', opts);
    } else if (isCloudMobileClient()) {
      renderPatientListMessage(
        'Sin pacientes en la nube. En el Mac del turno deja R+ abierto ~20 s y recarga esta página.',
        opts
      );
    } else {
      renderPatientListMessage('Sin pacientes aún', opts);
    }
    // Reselect after paint so a thrown patient-view remount cannot skip the empty state.
    reselectIfActivePatientHidden(visiblePatients);
    return;
  }
  var filtered = visiblePatients.filter(patientMatchesSearch);
  if (!filtered.length) {
    renderPatientListMessage('Ningún paciente coincide con la búsqueda', opts);
    reselectIfActivePatientHidden(visiblePatients);
    return;
  }
  paintCards(opts, filtered, function () {
    if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
    if (!opts.silent) {
      syncGuardiaCensusPanelVisibility(rt.getSettings());
      renderGuardiaCensusGrid(rt.getSettings());
    }
    // After the filtered cards are on screen — never before (selectPatient can remount Tendencias).
    reselectIfActivePatientHidden(visiblePatients);
  });
}

var _patientListClickWired = false;

var _lastPatientListSelect = { pid: '', at: 0 };

function selectPatientFromListEvent(ev) {
  var pid = patientCardIdFromEvent(ev);
  if (!pid) return;
  var now = Date.now();
  if (pid === _lastPatientListSelect.pid && now - _lastPatientListSelect.at < 400) return;
  _lastPatientListSelect = { pid: pid, at: now };
  var patient = getPatients().find(function (p) {
    return p && String(p.id) === String(pid);
  });
  patientsBridge.selectPatient(pid);
  if (patient && isPatientAdmissionIncomplete(patient, rt.getSettings())) {
    window.setTimeout(function () {
      openCompleteAdmissionModal(pid);
    }, 0);
  }
}

/** Clic en tarjeta sin depender solo de onclick inline (módulos ES). */
function ensurePatientListClickDelegation() {
  if (_patientListClickWired) return;
  var root = document.getElementById('patient-list');
  if (!root) return;
  _patientListClickWired = true;
  root.addEventListener('click', selectPatientFromListEvent);
  root.addEventListener('pointerup', function (ev) {
    if (!shouldHandleTouchPointerUp(ev)) return;
    selectPatientFromListEvent(ev);
  });
}
