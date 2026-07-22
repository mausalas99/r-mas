/**
 * Entrega prep checklist panel (mi equipo) — HC / EA / pendientes vencidos / cultivos sin seguimiento.
 */
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../clinical-access-runtime.mjs';
import { labHistory, patients } from '../app-state.mjs';
import { storage } from '../storage.js';
import { isModeSala } from '../mode-features.mjs';
import { isPatientAssignedToJoinedTeam } from '../mobile-team-patient-scope.mjs';
import { patientsVisibleInSidebar } from './patients-scope.mjs';
import { loadSettings } from './profile-load.mjs';
import {
  listActiveProcedimientos,
  normalizePendientesJson,
} from '../../../lib/entrega/entrega-pendientes.mjs';
import {
  buildEntregaPrepRows,
  entregaPrepPrimaryActionLabel,
  entregaPrepStatusLine,
} from '../../../lib/entrega/entrega-prep-checklist.mjs';
import {
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  splitResLabsByTipo,
} from '../cultivo-block-core.mjs';

/** @type {import('../../../lib/entrega/entrega-prep-checklist.mjs').EntregaPrepRow[]} */
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

function patientById(id) {
  var pid = String(id || '');
  var list = patients || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].id) === pid) return list[i];
  }
  return null;
}

function collectHcByPatient(team) {
  var out = Object.create(null);
  (team || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    var full = patientById(id) || p;
    var data = full.historiaClinica && full.historiaClinica.data;
    out[id] = data && typeof data === 'object' ? data : null;
  });
  return out;
}

function collectEaByPatient(team) {
  var out = Object.create(null);
  (team || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    var full = patientById(id) || p;
    var mon = full.monitoreo;
    out[id] = mon && mon.textoGuardado ? mon.textoGuardado : null;
  });
  return out;
}

function collectTodosByPatient(team) {
  var out = Object.create(null);
  (team || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    out[id] = storage.getTodos(id) || [];
  });
  return out;
}

function collectProcedimientosByPatient(team) {
  var out = Object.create(null);
  var map = clinicalSessionContext.guardiasMap;
  (team || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    var g = map && typeof map.get === 'function' ? map.get(id) : null;
    if (!g || !g.pendientes_json) {
      out[id] = [];
      return;
    }
    out[id] = listActiveProcedimientos(normalizePendientesJson(g.pendientes_json));
  });
  return out;
}

function cultivoRowsFromLabSets(sets) {
  var rows = [];
  var seq = 0;
  (sets || []).forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function (chunk) {
      var sections = String(chunk || '')
        .split(/\n\n+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      sections.forEach(function (sec) {
        var lines = sec
          .split(/\r?\n/)
          .map(function (l) {
            return l.replace(/\*+$/g, '').trim();
          })
          .filter(Boolean);
        if (!lines.length || !isCultureTableHeaderLine(lines[0])) return;
        rows.push(parseCultureBlockFromLineArray(lines, set, seq++).row);
      });
    });
  });
  return rows;
}

function collectCultivosByPatient(team) {
  var out = Object.create(null);
  (team || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    out[id] = cultivoRowsFromLabSets(labHistory[id] || []);
  });
  return out;
}

function buildRows() {
  var team = teamPatients();
  return buildEntregaPrepRows(team, {
    hcByPatient: collectHcByPatient(team),
    eaByPatient: collectEaByPatient(team),
    todosByPatient: collectTodosByPatient(team),
    procedimientosByPatient: collectProcedimientosByPatient(team),
    cultivosByPatient: collectCultivosByPatient(team),
  });
}

/**
 * @param {import('../../../lib/entrega/entrega-prep-checklist.mjs').EntregaPrepCta} cta
 * @returns {string}
 */
function navTargetForCta(cta) {
  var t = String(cta || 'pendientes');
  if (t === 'pendientes') return 'pendientes';
  if (t === 'cultivos') return 'cultivos';
  if (t === 'ea') return 'estadoActual';
  if (t === 'hc') return isModeSala(loadSettings()) ? 'historia' : 'nota';
  return 'pendientes';
}

function gapKeyForNav(nav) {
  if (nav === 'estadoActual') return 'ea';
  if (nav === 'historia' || nav === 'nota') return 'hc';
  if (nav === 'cultivos') return 'cultivos';
  return 'pendientes';
}

function secondaryLinksHtml(row, primaryTarget) {
  var gaps = row.gaps || [];
  var sala = isModeSala(loadSettings());
  var candidates = [
    ['pendientes', 'Pendientes'],
    ['estadoActual', 'Estado actual'],
    [sala ? 'historia' : 'nota', sala ? 'Historia' : 'Nota'],
    ['cultivos', 'Cultivos'],
  ];
  var links = [];
  candidates.forEach(function (pair) {
    var nav = pair[0];
    var label = pair[1];
    if (nav === primaryTarget) return;
    if (gaps.indexOf(gapKeyForNav(nav)) === -1) return;
    links.push(
      '<button type="button" class="entrega-prep-link" data-entrega-prep-nav="' +
        esc(nav) +
        '" data-patient-id="' +
        esc(row.id) +
        '">' +
        esc(label) +
        '</button>'
    );
  });
  if (!links.length) return '';
  return (
    '<div class="entrega-prep-row-links">' +
    '<span class="entrega-prep-row-links-label">También</span>' +
    links.join('<span class="entrega-prep-row-links-sep" aria-hidden="true">·</span>') +
    '</div>'
  );
}

function renderList() {
  var list = document.getElementById('entrega-prep-list');
  var meta = document.getElementById('entrega-prep-meta');
  if (!list) return;
  currentRows = buildRows();
  if (meta) {
    meta.textContent = currentRows.length
      ? currentRows.length +
        ' paciente' +
        (currentRows.length === 1 ? '' : 's') +
        ' de tu equipo · toca Abrir'
      : 'Nada incompleto en tu equipo';
  }
  if (!currentRows.length) {
    list.innerHTML =
      '<p class="entrega-prep-empty">Listo para entrega: HC, EA de hoy, pendientes al día y cultivos con seguimiento.</p>';
    return;
  }
  list.innerHTML = currentRows
    .map(function (r) {
      var target = navTargetForCta(r.primaryCta);
      var status = esc(
        entregaPrepStatusLine(r.gaps, {
          overdueTodoCount: r.overdueTodoCount,
          dueProcedimientoCount: r.dueProcedimientoCount,
          cultivoFollowUpCount: r.cultivoFollowUpCount,
        })
      );
      var primaryLabel = esc(entregaPrepPrimaryActionLabel(r.primaryCta));
      return (
        '<article class="entrega-prep-row" data-patient-id="' +
        esc(r.id) +
        '">' +
        '<div class="entrega-prep-row-body">' +
        '<div class="entrega-prep-row-text">' +
        '<p class="entrega-prep-row-name">' +
        esc(r.nombre) +
        '</p>' +
        (r.hint ? '<p class="entrega-prep-row-bed">' + esc(r.hint) + '</p>' : '') +
        '<p class="entrega-prep-row-status">' +
        status +
        '</p>' +
        '</div>' +
        '<button type="button" class="btn-generate entrega-prep-primary" data-entrega-prep-nav="' +
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

export function refreshEntregaPrepBadge() {
  var badge = document.getElementById('entrega-prep-badge');
  var btn = document.getElementById('btn-entrega-prep');
  if (!badge && !btn) return;
  if (badge) {
    badge.hidden = true;
    badge.textContent = '';
  }
  if (btn) {
    btn.setAttribute('title', 'Preparar entrega');
    btn.setAttribute('aria-label', 'Preparar entrega');
  }
  var modal = document.getElementById('entrega-prep-modal');
  if (modal && modal.classList.contains('open')) {
    renderList();
  }
}

function navigateEntregaPrep(patientId, nav) {
  var id = String(patientId || '');
  if (!id) return;
  var target = String(nav || 'pendientes');
  closeEntregaPrepPanel();
  if (typeof window.selectPatient === 'function') {
    window.selectPatient(id);
  }
  if (target === 'estadoActual' || target === 'historia') {
    if (typeof window.switchAppTab === 'function') window.switchAppTab('nota');
    if (typeof window.switchInnerTab === 'function') window.switchInnerTab(target);
    return;
  }
  if (target === 'nota') {
    if (typeof window.openPaseSectionInNormal === 'function') {
      window.openPaseSectionInNormal('nota');
    }
    return;
  }
  var section =
    target === 'cultivos' ? 'cultivos' : target === 'pendientes' ? 'pendientes' : 'nota';
  if (typeof window.openPaseSectionInNormal === 'function') {
    window.openPaseSectionInNormal(section);
  }
}

function onListClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest('[data-entrega-prep-nav]');
  if (!btn) return;
  e.preventDefault();
  navigateEntregaPrep(
    btn.getAttribute('data-patient-id'),
    btn.getAttribute('data-entrega-prep-nav')
  );
}

function wireOnce() {
  if (wired) return;
  wired = true;
  var list = document.getElementById('entrega-prep-list');
  if (list) list.addEventListener('click', onListClick);
  var cancel = document.getElementById('entrega-prep-close');
  if (cancel) {
    cancel.addEventListener('click', function () {
      closeEntregaPrepPanel();
    });
  }
  var backdrop = document.getElementById('entrega-prep-modal');
  if (backdrop) {
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeEntregaPrepPanel();
    });
  }
}

export function openEntregaPrepPanel() {
  var modal = document.getElementById('entrega-prep-modal');
  if (!modal) return;
  wireOnce();
  renderList();
  refreshEntregaPrepBadge();
  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  var firstPrimary = modal.querySelector('.entrega-prep-primary');
  var focusEl = firstPrimary || document.getElementById('entrega-prep-close');
  if (focusEl && typeof focusEl.focus === 'function') {
    try {
      focusEl.focus();
    } catch (err) {
      void err;
    }
  }
}

export function closeEntregaPrepPanel() {
  var modal = document.getElementById('entrega-prep-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
}

export var windowHandlers = {
  openEntregaPrepPanel: openEntregaPrepPanel,
  closeEntregaPrepPanel: closeEntregaPrepPanel,
  refreshEntregaPrepBadge: refreshEntregaPrepBadge,
};
