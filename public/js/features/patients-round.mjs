import { getPatients } from '../app-state.mjs';
import { isModeSala } from '../mode-features.mjs';
import { t, isPaseMode } from './chrome.mjs';
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { esc } from './patients-html.mjs';
import { setPatientSearchFilter } from './patients-scope.mjs';
import { renderPatientCardToolbarHtml, patientSidebarCardOpts } from './patients-card-html.mjs';
import {
  isPatientBulkSelectMode,
  isPatientBulkSelected,
} from './patients-bulk-select.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { renderPatientSidebarBodyHtml } from '../patient-sidebar-card.mjs';
import { renderPatientDashboard } from './patient-dashboard/dashboard-mount.mjs';

var _lastRondaNavIds = [];
var _roundOverviewMode = true;
var ROUND_SEEN_LS = 'rpc-round-seen';

export function getRoundOverviewMode() {
  return _roundOverviewMode;
}

export function setRoundOverviewMode(v) {
  _roundOverviewMode = !!v;
}

export function setLastRondaNavIds(ids) {
  _lastRondaNavIds = ids;
}

export function getLastRondaNavIds() {
  return _lastRondaNavIds;
}

export function onPatientSearchInput(val) {
  setPatientSearchFilter(val);
  patientsBridge.renderPatientList();
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
  } catch {
    return { day: todayLocalYMD(), ids: [] };
  }
}

function persistRoundSeenSet(s) {
  try {
    localStorage.setItem(ROUND_SEEN_LS, JSON.stringify(s));
  } catch (_e) { void _e; }
}

export function isPatientRoundSeen(patientId) {
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
  patientsBridge.renderPatientList();
}

function hideRoundOverviewLayout(overview, classic, fullbar) {
  overview.style.display = 'none';
  classic.style.display = 'flex';
  if (fullbar) {
    fullbar.classList.remove('is-visible');
    fullbar.setAttribute('aria-hidden', 'true');
  }
  rt.syncWorkContextChrome();
}

function showRoundOverviewLayout(overview, classic, fullbar) {
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

export function syncRoundExpedienteLayout() {
  var overview = document.getElementById('patient-ronda-overview');
  var classic = document.getElementById('patient-expediente-classic');
  var fullbar = document.getElementById('patient-ronda-fullbar');
  if (!overview || !classic) return;

  if (!isPaseMode()) {
    hideRoundOverviewLayout(overview, classic, fullbar);
    return;
  }
  showRoundOverviewLayout(overview, classic, fullbar);
}

function formatRoundPatientMeta(p) {
  if (!p) return '';
  return (
    'Cto. ' +
    (p.cuarto || '—') +
    ' · Cama ' +
    (p.cama || '—') +
    ' · ' +
    (p.servicio || '—') +
    (p.registro ? ' · Reg. ' + String(p.registro) : '')
  );
}

export function renderRoundOverviewPanels() {
  if (!isPaseMode() || !_roundOverviewMode || rt.getActiveAppTab() !== 'nota' || !rt.getActiveId()) return;
  var titleEl = document.getElementById('patient-ronda-patient-label');
  var metaEl = document.getElementById('patient-ronda-patient-meta');
  var aid = rt.getActiveId();
  var p = getPatients().find(function (x) {
    return String(x.id) === String(aid);
  });
  if (titleEl) titleEl.textContent = p ? p.nombre || 'Paciente' : 'Paciente';
  if (metaEl) metaEl.textContent = formatRoundPatientMeta(p);
  var host = document.getElementById('patient-ronda-dashboard-host');
  if (host) renderPatientDashboard(host);
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
  if (isPatientBulkSelectMode()) return;
  if (!_lastRondaNavIds.length) return;
  var cur = rt.getActiveId() != null ? String(rt.getActiveId()) : '';
  var idx = _lastRondaNavIds.indexOf(cur);
  if (idx < 0) {
    patientsBridge.selectPatient(_lastRondaNavIds[delta > 0 ? 0 : _lastRondaNavIds.length - 1]);
    return;
  }
  var next = idx + delta;
  if (next < 0) next = _lastRondaNavIds.length - 1;
  if (next >= _lastRondaNavIds.length) next = 0;
  patientsBridge.selectPatient(_lastRondaNavIds[next]);
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
      } catch {
        cards[i].scrollIntoView(true);
      }
      break;
    }
  }
}

export function renderPatientRoundRowHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var seen = isPatientRoundSeen(p.id);
  var seenTitle = typeof t === 'function' ? t('roundMode.seenTitle') : 'Visto en ronda';
  var aid = rt.getActiveId();
  var bulkSelected = isPatientBulkSelectMode() && isPatientBulkSelected(p.id);
  var incomplete = isPatientAdmissionIncomplete(p, rt.getSettings());
  return (
    '<div class="patient-card patient-card--roundrow ' +
    (p.id === aid ? 'active' : '') +
    (seen ? ' patient-card--roundrow-seen' : '') +
    (bulkSelected ? ' patient-card--bulk-selected' : '') +
    (incomplete ? ' patient-card--incomplete' : '') +
    '" data-patient-id="' +
    p.id +
    '" role="button" tabindex="0">' +
    renderPatientCardToolbarHtml(p, pinOn, archOn) +
    '<div class="roundrow-main">' +
    '<div class="roundrow-text">' +
    renderPatientSidebarBodyHtml(p, patientSidebarCardOpts({ roundRow: true })) +
    '</div>' +
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
