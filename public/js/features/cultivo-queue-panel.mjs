/**
 * Global cultivo follow-up queue (mi equipo) — ATB pendiente / sin nota desde resultado.
 */
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../clinical-access-runtime.mjs';
import { labHistory, notes } from '../app-state.mjs';
import { isPatientAssignedToJoinedTeam } from '../mobile-team-patient-scope.mjs';
import { patientsVisibleInSidebar } from './patients-scope.mjs';
import { normalizeFechaLabHistory } from '../tend-core.mjs';
import {
  buildCultivoQueueRows,
  cultivoQueueStatusLine,
} from './cultivo-queue-model.mjs';

/** @type {import('./cultivo-queue-model.mjs').CultivoQueueRow[]} */
var currentRows = [];
var wired = false;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function teamPatients() {
  var user = clinicalSessionContext.user;
  var scope = getClinicalScopeContextForEvaluate();
  if (!user || !user.user_id) return [];
  var userId = String(user.user_id);
  var census = patientsVisibleInSidebar() || [];
  return census.filter(function (p) {
    return p && isPatientAssignedToJoinedTeam(String(p.id), scope, userId);
  });
}

function buildRows() {
  return buildCultivoQueueRows(teamPatients(), {
    normalizeFecha: normalizeFechaLabHistory,
    labHistoryByPatient: labHistory,
    notesByPatient: notes,
  });
}

function itemDetailLine(row) {
  var items = (row && row.items) || [];
  if (!items.length) return '';
  var first = items[0];
  var head =
    (first.sitio && first.sitio !== '—' ? first.sitio + ': ' : '') +
    (first.organismo || '—') +
    (first.fecha && first.fecha !== '—' ? ' · ' + first.fecha : '');
  if (items.length === 1) return head;
  return head + ' (+' + (items.length - 1) + ' más)';
}

function renderList() {
  var list = document.getElementById('cultivo-queue-list');
  var meta = document.getElementById('cultivo-queue-meta');
  if (!list) return;
  currentRows = buildRows();
  if (meta) {
    meta.textContent =
      currentRows.length > 0
        ? currentRows.length +
          ' paciente' +
          (currentRows.length === 1 ? '' : 's') +
          ' de tu equipo con cultivo por seguir.'
        : 'De tu equipo: cultivos positivos sin antibiograma, o sin nota desde el resultado.';
  }
  if (!currentRows.length) {
    list.innerHTML =
      '<p class="doc-queue-empty">Sin cultivos pendientes de seguimiento en tu equipo.</p>';
    return;
  }
  list.innerHTML = currentRows
    .map(function (r) {
      var status = esc(cultivoQueueStatusLine(r.reasons, r.items.length));
      var detail = esc(itemDetailLine(r));
      return (
        '<article class="doc-queue-row" data-patient-id="' +
        esc(r.id) +
        '">' +
        '<div class="doc-queue-row-body">' +
        '<div class="doc-queue-row-text">' +
        '<p class="doc-queue-row-name">' +
        esc(r.nombre) +
        '</p>' +
        (r.hint ? '<p class="doc-queue-row-bed">' + esc(r.hint) + '</p>' : '') +
        '<p class="doc-queue-row-status">' +
        status +
        '</p>' +
        (detail ? '<p class="doc-queue-row-bed">' + detail + '</p>' : '') +
        '</div>' +
        '<button type="button" class="btn-generate doc-queue-primary" data-cultivo-queue-nav="cultivos" data-patient-id="' +
        esc(r.id) +
        '">Abrir cultivos</button>' +
        '</div>' +
        '</article>'
      );
    })
    .join('');
}

export function refreshCultivoQueueBadge() {
  var badge = document.getElementById('cultivo-queue-badge');
  var btn = document.getElementById('btn-cultivo-queue');
  if (!badge && !btn) return;
  if (badge) {
    badge.hidden = true;
    badge.textContent = '';
  }
  if (btn) {
    btn.setAttribute('title', 'Cultivos por seguir');
    btn.setAttribute('aria-label', 'Cultivos por seguir');
  }
  var modal = document.getElementById('cultivo-queue-modal');
  if (modal && modal.classList.contains('open')) {
    renderList();
  }
}

function navigateCultivoQueue(patientId) {
  var id = String(patientId || '');
  if (!id) return;
  closeCultivoQueuePanel();
  if (typeof window.selectPatient === 'function') {
    window.selectPatient(id);
  }
  if (typeof window.openPaseSectionInNormal === 'function') {
    window.openPaseSectionInNormal('cultivos');
  } else if (typeof window.switchInnerTab === 'function') {
    if (typeof window.switchAppTab === 'function') window.switchAppTab('nota');
    window.switchInnerTab('cult');
  }
}

function onListClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest('[data-cultivo-queue-nav]');
  if (!btn) return;
  e.preventDefault();
  navigateCultivoQueue(btn.getAttribute('data-patient-id'));
}

function wireOnce() {
  if (wired) return;
  wired = true;
  var list = document.getElementById('cultivo-queue-list');
  if (list) list.addEventListener('click', onListClick);
  var cancel = document.getElementById('cultivo-queue-close');
  if (cancel) {
    cancel.addEventListener('click', function () {
      closeCultivoQueuePanel();
    });
  }
  var backdrop = document.getElementById('cultivo-queue-modal');
  if (backdrop) {
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeCultivoQueuePanel();
    });
  }
}

export function openCultivoQueuePanel() {
  var modal = document.getElementById('cultivo-queue-modal');
  if (!modal) return;
  wireOnce();
  renderList();
  refreshCultivoQueueBadge();
  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  var firstPrimary = modal.querySelector('.doc-queue-primary');
  var focusEl = firstPrimary || document.getElementById('cultivo-queue-close');
  if (focusEl && typeof focusEl.focus === 'function') {
    try {
      focusEl.focus();
    } catch (_err) {
      void _err;
    }
  }
}

export function closeCultivoQueuePanel() {
  var modal = document.getElementById('cultivo-queue-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
}

export var windowHandlers = {
  openCultivoQueuePanel: openCultivoQueuePanel,
  closeCultivoQueuePanel: closeCultivoQueuePanel,
  refreshCultivoQueueBadge: refreshCultivoQueueBadge,
};
