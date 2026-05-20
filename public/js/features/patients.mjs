// Patient list, ronda navigation, pin/archive, add/save modal, delete — extracted from app.js
import { storage } from '../storage.js';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  listadoProblemas,
  saveState,
} from '../app-state.mjs';
import { validatePatientForSave, buildExpedienteAdvice } from '../patient-validation.mjs';
import { isModeSala, getDefaultServicio } from '../mode-features.mjs';
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { t, getUiDensity, isPaseMode } from './chrome.mjs';
import { emitLiveSyncPatientDelete, removePatientLocally } from './lan-sync.mjs';

const DEMO_PATIENT_ID = 'demo-onboarding';

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
  renderEstadoActualButton() {},
  renderNoteForm() {},
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

export function registerPatientsRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
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
  var hist = sortLabHistoryChronological(rt.ensureParsedLabHistory(patientId));
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

export function renderPatientList() {
  ensurePatientUiState();
  ensurePatientListClickDelegation();
  var list = document.getElementById('patient-list');
  if (!list) return;
  destroyPatientListSortables();
  var isRonda = isPaseMode();
  list.classList.toggle('patient-list--ronda', isRonda);

  if (!patients.length) {
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Sin pacientes aún</div>';
    _lastRondaNavIds = [];
    if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
    return;
  }
  var filtered = patients.filter(patientMatchesSearch);
  if (!filtered.length) {
    list.innerHTML =
      '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Ningún paciente coincide con la búsqueda</div>';
    _lastRondaNavIds = [];
    if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
    return;
  }
  var pinned = filtered.filter(function (p) {
    return p.pinned && !p.archived;
  });
  var active = filtered.filter(function (p) {
    return !p.pinned && !p.archived;
  });
  var archived = filtered.filter(function (p) {
    return !!p.archived;
  });
  var parts = [];
  var rondaNav = [];
  var cardHtml = isRonda ? renderPatientRoundRowHtml : renderPatientCardHtml;

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
    var collapsed = isArchivedSectionCollapsed();
    parts.push(
      '<button type="button" class="patient-list-section-toggle" onclick="toggleArchivedSection(event)" aria-expanded="' +
        (!collapsed ? 'true' : 'false') +
        '">Archivados <span>(' +
        archived.length +
        ')</span> <span>' +
        (collapsed ? '▶' : '▼') +
        '</span></button>'
    );
    if (!collapsed) {
      parts.push('<div class="patient-sort-zone" data-patient-zone="archived">');
      archived.forEach(function (p) {
        rondaNav.push(String(p.id));
      });
      parts.push(archived.map(cardHtml).join(''));
      parts.push('</div>');
    }
  }
  _lastRondaNavIds = rondaNav;
  list.innerHTML = parts.join('');
  mountPatientListSortables();
  if (rt.getActiveAppTab() === 'agenda') rt.renderProcedureAgendaPanel();
}

export function selectPatient(id) {
  if (id == null || id === '') return;
  try {
    selectPatientCore(id);
  } catch (err) {
    console.error('[R+] selectPatient:', err && err.message ? err.message : err);
  }
}

function selectPatientCore(id) {
  var prevId = rt.getActiveId();
  var wasOnLab = rt.getActiveAppTab() === 'lab';
  var patientChanged = prevId != null && String(prevId) !== String(id);
  rt.setActiveId(id);
  renderPatientList();
  var emptyState = document.getElementById('empty-state');
  var patientView = document.getElementById('patient-view');
  if (emptyState) emptyState.style.display = 'none';
  if (patientView) patientView.style.display = 'flex';
  rt.renderInnerTabs();
  rt.renderEstadoActualButton();
  rt.renderNoteForm();
  rt.renderIndicaForm();
  rt.renderListadoForm();
  rt.renderLabHistoryPanel();
  rt.renderMedRecetaPanel();
  var settings = rt.getSettings();
  var inner = rt.getActiveInner();
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
  if (rt.getActiveInner() === 'todo') {
    rt.renderTodoForm();
  }
  if (wasOnLab && patientChanged) {
    rt.limpiarReporte();
    rt.setLabHistoryPanelCollapsed(false);
    rt.syncLabHistoryCollapseUI();
    rt.renderLabHistoryPanel();
    if (isPaseMode()) {
      rt.syncWorkContextChrome();
    } else {
      rt.switchAppTab('lab');
      var labHistCard = document.getElementById('lab-history-card');
      if (labHistCard) {
        window.setTimeout(function () {
          try {
            labHistCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (_e) {
            labHistCard.scrollIntoView(true);
          }
        }, 0);
      }
    }
  } else {
    rt.syncWorkContextChrome();
  }
  if (isPaseMode() && rt.getActiveAppTab() === 'nota') {
    if (inner === 'todo' || !inner) {
      _roundOverviewMode = true;
    } else {
      _roundOverviewMode = false;
    }
  }
  syncRoundExpedienteLayout();
  rt.refreshTendenciasOrCultivosPanel();
  if (isPaseMode()) {
    rt.switchAppTab(rt.getActiveAppTab());
    rt.renderPaseBoard();
  }
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
  if (!confirm('¿Eliminar este paciente y sus notas?')) return;
  var target = patients.find(function (p) {
    return p.id === id;
  });
  var label = target ? 'Eliminar ' + (target.nombre || 'paciente') : 'Eliminar paciente';
  if (typeof rt.pushUndoSnapshot === 'function') rt.pushUndoSnapshot(label);
  if (!removePatientLocally(id)) return;
  emitLiveSyncPatientDelete(target || { id: id, registro: '' });
  saveState();
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

function _syncPatientModalModeFields() {
  var sala = isModeSala(rt.getSettings());
  var areaGroup = document.getElementById('m-area-group');
  var servicioLabel = document.getElementById('m-servicio-label');
  var servicioInput = document.getElementById('m-servicio');
  if (areaGroup) areaGroup.style.display = sala ? 'none' : '';
  if (servicioLabel) servicioLabel.textContent = sala ? 'Área / Servicio *' : 'Servicio *';
  if (servicioInput) servicioInput.placeholder = sala ? 'ej. MEDICINA INTERNA' : 'ej. MEDICINA INTERNA';
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
  document.getElementById('modal').classList.add('open');
  setTimeout(function () {
    document.getElementById('m-nombre-manual').focus();
  }, 120);
}

export function openAddModalFromLab() {
  var lab = rt.getActiveLab && rt.getActiveLab();
  if (!lab) {
    openAddModal();
    return;
  }
  var p = lab.patient;
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
  _prefillServicioForSala();
  document.getElementById('modal').classList.add('open');
  setTimeout(function () {
    var first = document.getElementById('m-edad-num');
    if (first) first.focus();
  }, 120);
}

export function closeModal() {
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
    return;
  }

  if (!edadNum) {
    rt.showToast('Ingresa la edad', 'error');
    return;
  }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    rt.showToast('Edad inválida', 'error');
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
    return;
  }
  if (!salaMode && !area) {
    rt.showToast('Ingresa área / departamento', 'error');
    return;
  }
  if (!cuarto || !cama) {
    rt.showToast('Ingresa cuarto y cama', 'error');
    return;
  }

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

  if (v.warning === 'missing_expediente' && !isFromLab) {
    showExpedienteAdvice(commit);
    return;
  }
  commit();
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
  closeModal();
  var pendingLab = null;
  if (isFromLab) {
    pendingLab = rt.consumeActiveLab ? rt.consumeActiveLab() : null;
    if (rt.clearLabOutputUi) rt.clearLabOutputUi();
    rt.switchAppTab('nota');
  }
  renderPatientList();
  selectPatient(patient.id);
  rt.showToast('Paciente agregado', 'success');
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
  return {
    patient: patient,
    note: notes[patientId] || {},
    indicaciones: indicaciones[patientId] || {},
    labHistory: Array.isArray(labHistory[patientId]) ? labHistory[patientId] : [],
    medReceta: medRecetaByPatient[patientId] || null,
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
