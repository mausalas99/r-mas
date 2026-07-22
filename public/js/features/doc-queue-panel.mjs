/**
 * Global documentation queue panel (mi equipo) — labs hoy / pendientes abiertos.
 */
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../clinical-access-runtime.mjs';
import { labHistory, notes, patients } from '../app-state.mjs';
import { storage } from '../storage.js';
import { isModeSala } from '../mode-features.mjs';
import { isPatientAssignedToJoinedTeam } from '../mobile-team-patient-scope.mjs';
import { patientsVisibleInSidebar } from './patients-scope.mjs';
import { loadSettings } from './profile-load.mjs';
import { normalizeFechaLabHistory } from '../tend-core.mjs';
import {
  buildDocQueueRows,
  docQueueStatusLine,
  formatLocalTodayFecha,
} from './doc-queue-model.mjs';
import { autosendLabsToEventualidad } from './lab-eventualidad-autosend.mjs';
import { renderEventualidadesPanel } from './eventualidades-panel.mjs';

/** @type {import('./doc-queue-model.mjs').DocQueueRow[]} */
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

function collectTodosByPatient(patients) {
  var out = Object.create(null);
  (patients || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    out[id] = storage.getTodos(id) || [];
  });
  return out;
}

function buildRows() {
  var team = teamPatients();
  return buildDocQueueRows(team, {
    todayFecha: formatLocalTodayFecha(),
    normalizeFecha: normalizeFechaLabHistory,
    labHistoryByPatient: labHistory,
    notesByPatient: notes,
    todosByPatient: collectTodosByPatient(team),
  });
}

/**
 * In Sala, `notas` migrates to Historia Clínica — wrong for this queue.
 * Verbal lab documentation (Hb 9 → anemia microcítica, gaso interpretación) lives in Eventualidades.
 * @param {import('./doc-queue-model.mjs').DocQueueRow} row
 * @returns {string}
 */
function effectiveNavTarget(row) {
  var cta = String((row && row.primaryCta) || 'nota');
  if (cta === 'pendientes') return 'pendientes';
  if (!isModeSala(loadSettings())) {
    return cta === 'labs' ? 'labs' : 'nota';
  }
  // Sala: documenting labs → Eventualidades (Laboratorio stays as secondary link)
  if (cta === 'labs' || cta === 'nota') return 'eventualidades';
  return 'eventualidades';
}

function primaryActionLabelForTarget(target) {
  if (target === 'labs') return 'Abrir laboratorio';
  if (target === 'pendientes') return 'Abrir pendientes';
  if (target === 'eventualidades') return 'Abrir eventualidades';
  return 'Abrir nota';
}

function secondaryLinksHtml(row, primaryTarget) {
  var sala = isModeSala(loadSettings());
  var links = [];
  var push = function (nav, label) {
    if (nav === primaryTarget) return;
    links.push(
      '<button type="button" class="doc-queue-link" data-doc-queue-nav="' +
        esc(nav) +
        '" data-patient-id="' +
        esc(row.id) +
        '">' +
        esc(label) +
        '</button>'
    );
  };
  push('labs', 'Laboratorio');
  if (sala) push('eventualidades', 'Eventualidades');
  else push('nota', 'Nota');
  push('pendientes', 'Pendientes');
  if (!links.length) return '';
  return (
    '<div class="doc-queue-row-links">' +
    '<span class="doc-queue-row-links-label">También</span>' +
    links.join('<span class="doc-queue-row-links-sep" aria-hidden="true">·</span>') +
    '</div>'
  );
}

function renderList() {
  var list = document.getElementById('doc-queue-list');
  var meta = document.getElementById('doc-queue-meta');
  if (!list) return;
  currentRows = buildRows();
  if (meta) {
    meta.textContent = currentRows.length
      ? currentRows.length +
        ' paciente' +
        (currentRows.length === 1 ? '' : 's') +
        ' de tu equipo · toca Abrir'
      : 'Nada pendiente en tu equipo';
  }
  if (!currentRows.length) {
    list.innerHTML =
      '<p class="doc-queue-empty">Todo al día en tu equipo. Cuando haya labs de hoy sin nota o pendientes abiertos, aparecen aquí.</p>';
    return;
  }
  list.innerHTML = currentRows
    .map(function (r) {
      var target = effectiveNavTarget(r);
      var status = esc(docQueueStatusLine(r.reasons, r.openTodoCount));
      var primaryLabel = esc(primaryActionLabelForTarget(target));
      return (
        '<article class="doc-queue-row" data-patient-id="' +
        esc(r.id) +
        '">' +
        '<div class="doc-queue-row-body">' +
        '<div class="doc-queue-row-text">' +
        '<p class="doc-queue-row-name">' +
        esc(r.nombre) +
        '</p>' +
        (r.hint
          ? '<p class="doc-queue-row-bed">' + esc(r.hint) + '</p>'
          : '') +
        '<p class="doc-queue-row-status">' +
        status +
        '</p>' +
        '</div>' +
        '<button type="button" class="btn-generate doc-queue-primary" data-doc-queue-nav="' +
        esc(target) +
        '" data-patient-id="' +
        esc(r.id) +
        '">' +
        primaryLabel +
        '</button>' +
        '</div>' +
        secondaryLinksHtml(r, target) +
        '</article>'
      );
    })
    .join('');
}

export function refreshDocQueueBadge() {
  var badge = document.getElementById('doc-queue-badge');
  var btn = document.getElementById('btn-doc-queue');
  if (!badge && !btn) return;
  if (badge) {
    badge.hidden = true;
    badge.textContent = '';
  }
  if (btn) {
    btn.setAttribute('title', 'Falta documentar');
    btn.setAttribute('aria-label', 'Falta documentar');
  }
  var modal = document.getElementById('doc-queue-modal');
  if (modal && modal.classList.contains('open')) {
    renderList();
  }
}

function findPatientById(patientId) {
  var id = String(patientId || '');
  return (patients || []).find(function (p) {
    return String(p && p.id) === id;
  });
}

function tryRenderEventualidadesPanel() {
  var mount =
    typeof document !== 'undefined' ? document.getElementById('exp-pane-eventualidades') : null;
  if (!mount) return false;
  renderEventualidadesPanel(mount);
  return true;
}

function openEventualidadesPanel() {
  if (typeof window.switchAppTab === 'function') window.switchAppTab('nota');
  if (typeof window.switchInnerTab === 'function') window.switchInnerTab('eventualidades');
  if (!tryRenderEventualidadesPanel()) {
    setTimeout(tryRenderEventualidadesPanel, 80);
  }
}

/**
 * Auto-append today's lab interpretation as an Eventualidad, then open the panel.
 * @param {string} patientId
 */
async function openEventualidadesWithLabAutoSend(patientId) {
  openEventualidadesPanel();
  var patient = findPatientById(patientId);
  if (!patient) {
    if (typeof window.showToast === 'function') {
      window.showToast('Paciente no encontrado.', 'error');
    }
    return;
  }
  var sets = labHistory[String(patientId)] || [];
  var out = await autosendLabsToEventualidad(patient, sets, {
    filterToday: true,
    todayFecha: formatLocalTodayFecha(),
  });
  tryRenderEventualidadesPanel();
  if (out && out.ok) {
    if (out.skipped === 'dup') return;
    if (typeof window.showToast === 'function') {
      window.showToast('Labs enviados a Eventualidades.', 'success');
    }
    return;
  }
  if (typeof window.showToast === 'function') {
    window.showToast(
      out && out.reason === 'empty'
        ? 'Sin labs de hoy para enviar — escribe la eventualidad'
        : 'No se pudo guardar la eventualidad.',
      out && out.reason === 'empty' ? 'info' : 'error'
    );
  }
}

function navigateDocQueue(patientId, cta) {
  var id = String(patientId || '');
  if (!id) return;
  var target = String(cta || 'nota');
  // Sala remaps notas → Historia Clínica; document labs in Eventualidades instead.
  if (target === 'nota' && isModeSala(loadSettings())) {
    target = 'eventualidades';
  }
  closeDocQueuePanel();
  if (typeof window.selectPatient === 'function') {
    window.selectPatient(id);
  }
  if (target === 'eventualidades') {
    void openEventualidadesWithLabAutoSend(id);
    return;
  }
  var section =
    target === 'labs' ? 'labs' : target === 'pendientes' ? 'pendientes' : 'nota';
  if (typeof window.openPaseSectionInNormal === 'function') {
    window.openPaseSectionInNormal(section);
  }
}

function onListClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest('[data-doc-queue-nav]');
  if (!btn) return;
  e.preventDefault();
  navigateDocQueue(btn.getAttribute('data-patient-id'), btn.getAttribute('data-doc-queue-nav'));
}

function wireOnce() {
  if (wired) return;
  wired = true;
  var list = document.getElementById('doc-queue-list');
  if (list) list.addEventListener('click', onListClick);
  var cancel = document.getElementById('doc-queue-close');
  if (cancel) {
    cancel.addEventListener('click', function () {
      closeDocQueuePanel();
    });
  }
  var backdrop = document.getElementById('doc-queue-modal');
  if (backdrop) {
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeDocQueuePanel();
    });
  }
}

export function openDocQueuePanel() {
  var modal = document.getElementById('doc-queue-modal');
  if (!modal) return;
  wireOnce();
  renderList();
  refreshDocQueueBadge();
  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  var firstPrimary = modal.querySelector('.doc-queue-primary');
  var focusEl = firstPrimary || document.getElementById('doc-queue-close');
  if (focusEl && typeof focusEl.focus === 'function') {
    try {
      focusEl.focus();
    } catch (_e) {
      /* ignore */
    }
  }
}

export function closeDocQueuePanel() {
  var modal = document.getElementById('doc-queue-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
}

export var windowHandlers = {
  openDocQueuePanel: openDocQueuePanel,
  closeDocQueuePanel: closeDocQueuePanel,
  refreshDocQueueBadge: refreshDocQueueBadge,
};
