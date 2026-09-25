/**
 * Modo Sala — vista de tarjetas (todas las camas a la vista) como alternativa a la barra lateral.
 * localStorage['rplus-sala-view'] = 'cards' | 'bar' (default 'cards'; los E2E fijan 'bar').
 * Onboarding: resalta una vez «Barra lateral»; si el usuario cambia a barra, resalta una vez el botón de tarjetas.
 */
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { patientsVisibleInSidebar } from './patients-scope.mjs';
import { getWorkMode } from './chrome.mjs';
import { sortPatientsForCensus, formatCamaCellForCenso } from '../censo-build.mjs';
import { ensurePatientDiagnosticos } from '../patient-diagnosticos.mjs';
import { escSidebarHtml as esc } from '../patient-sidebar-card.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { serviceById, hueForService } from './patient-dashboard/interconsult-catalog.mjs';
import { hasCriticalLabValue } from '../labs-critical-values.mjs';
import { soporteTier } from './estado-actual-ventilatorio.mjs';

var VENT_TIERS = { hfnc: 'Alto flujo', vmni: 'VMNI', vm: 'VM' };

var VIEW_LS = 'rplus-sala-view';
var HINT_BAR_LS = 'rplus-sala-hint-bar';
var HINT_CARDS_LS = 'rplus-sala-hint-cards';
var home = true;
var wired = false;
var GRID_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';

function readLs(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLs(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) { console.warn('[sala-view] failed to write ' + key, e); }
}

function isCards() {
  return readLs(VIEW_LS) !== 'bar' && getWorkMode() === 'sala';
}

function setView(v) {
  writeLs(VIEW_LS, v);
  if (v === 'bar' && readLs(HINT_CARDS_LS) !== 'seen') writeLs(HINT_CARDS_LS, 'pending');
  home = true;
  syncSalaView();
}

/** Resalta `btn` hasta el primer clic del usuario en cualquier parte; luego no vuelve a salir. */
function hintOnce(btn, key, text) {
  if (!btn || readLs(key) === 'seen') return;
  btn.classList.add('tour-spotlight-soap', 'sv-hint');
  btn.dataset.svHint = text;
  document.addEventListener('pointerdown', function () {
    writeLs(key, 'seen');
    btn.classList.remove('tour-spotlight-soap', 'sv-hint');
    delete btn.dataset.svHint;
  }, { capture: true, once: true });
}

function rows() {
  return sortPatientsForCensus(patientsVisibleInSidebar().filter(function (p) { return !p.archived; }));
}

function isActive(p) {
  return String(p.id) === String(rt.getActiveId() ?? '');
}

function el(id, tag, parent, before) {
  var node = document.getElementById(id);
  if (node) return node;
  node = document.createElement(tag);
  node.id = id;
  parent.insertBefore(node, before || null);
  return node;
}

function bedLine(p) {
  var cuarto = String(p.cuarto || '').trim();
  var cama = String(p.cama || '').trim();
  return [cuarto && 'Cto. ' + cuarto, cama && 'Cama ' + cama].filter(Boolean).join(' · ') || 'Sin cama';
}

function cardHtml(p) {
  ensurePatientDiagnosticos(p);
  var dx = p.diagnosticosList.filter(Boolean);
  var ic = (Array.isArray(p.interconsultServiceIds) ? p.interconsultServiceIds : [])
    .map(serviceById)
    .filter(Boolean);
  var tags = '';
  if (Number(p.negativa_maniobras_firmada || 0)) tags += '<span class="sv-tag sv-tag--dnr">No RCP</span>';
  if (isPatientAdmissionIncomplete(p, rt.getSettings())) tags += '<span class="sv-tag sv-tag--warn">Ingreso incompleto</span>';
  var ventLabel = VENT_TIERS[soporteTier(p.monitoreo && p.monitoreo.estadoClinico && p.monitoreo.estadoClinico.soporte)];
  if (ventLabel) tags += '<span class="sv-tag sv-tag--warn">' + esc(ventLabel) + '</span>';
  if (rt.ensureParsedLabHistoryCached && hasCriticalLabValue(rt.ensureParsedLabHistoryCached(p.id))) {
    tags += '<span class="sv-tag sv-tag--dnr">Lab crítico</span>';
  }
  return (
    '<button type="button" class="sv-card' + (isActive(p) ? ' is-active' : '') + '" data-sv-open="' + esc(p.id) + '">' +
    '<span class="sv-card-top"><span class="sv-bed">' + esc(bedLine(p)) + '</span>' + tags + '</span>' +
    '<span class="sv-name">' + esc(p.nombre || 'Sin nombre') + '</span>' +
    '<span class="sv-label">Diagnósticos</span>' +
    (dx.length
      ? '<ul class="sv-dx">' + dx.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>'
      : '<span class="sv-none">Sin diagnóstico</span>') +
    '<span class="sv-label">Interconsultas</span>' +
    (ic.length
      ? '<span class="sv-ic">' + ic.map(function (s) {
        return '<span class="svc" style="--h:' + hueForService(s) + '">' + esc(s.name) + '</span>';
      }).join('') + '</span>'
      : '<span class="sv-none">Ninguna</span>') +
    '</button>'
  );
}

function renderHome(list) {
  var main = document.querySelector('.main-col');
  var panel = el('sala-view-home', 'section', main, main.firstChild);
  panel.setAttribute('aria-label', 'Pacientes de sala');
  panel.innerHTML =
    '<div class="sv-home-head"><strong>Pacientes</strong><span>' + list.length + ' en sala</span>' +
    '<span class="sv-home-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-sv-view="bar">Barra lateral</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-sv-labs>Actualizar labs</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" onclick="openAddModal()">+ Agregar</button>' +
    '</span></div>' +
    (list.length
      ? '<div class="sv-grid">' + list.map(cardHtml).join('') + '</div>'
      : '<p class="sv-none">Sin pacientes aún.</p>');
  hintOnce(panel.querySelector('[data-sv-view="bar"]'), HINT_BAR_LS, 'Nuevo: vuelve a la barra lateral cuando quieras');
}

function renderRail(list) {
  var app = document.querySelector('.app');
  var rail = el('sala-view-rail', 'nav', app, document.querySelector('.main-col'));
  rail.setAttribute('aria-label', 'Camas');
  rail.innerHTML =
    '<button type="button" class="sv-rail-home" data-sv-home aria-label="Ver todas las camas" title="Ver todas las camas (Esc)">' + GRID_ICON + '<span>Camas</span></button>' +
    list.map(function (p) {
      return '<button type="button" data-sv-open="' + esc(p.id) + '" title="' + esc(p.nombre || '') + '"' +
        (isActive(p) ? ' class="is-active" aria-current="true"' : '') + '>' + esc(formatCamaCellForCenso(p)) + '</button>';
    }).join('');
}

/** Botón junto al buscador de la barra lateral para pasar a tarjetas (solo en Sala). */
function renderSidebarToggle() {
  var wrap = document.querySelector('.patient-search-wrap');
  if (!wrap) return;
  var btn = el('btn-sala-view-cards', 'button', wrap);
  btn.type = 'button';
  btn.className = 'btn-patient-bulk-select';
  btn.hidden = getWorkMode() !== 'sala';
  btn.dataset.svView = 'cards';
  btn.title = 'Ver pacientes como tarjetas';
  btn.setAttribute('aria-label', 'Ver pacientes como tarjetas');
  if (!btn.firstChild) {
    btn.innerHTML = GRID_ICON;
  }
  if (!btn.hidden && readLs(HINT_CARDS_LS) === 'pending' && !btn.classList.contains('sv-hint')) {
    hintOnce(btn, HINT_CARDS_LS, 'Vuelve a las tarjetas aquí');
  }
}

function openLabsUpdate() {
  if (typeof window.openLabRepoBatchModal === 'function') {
    window.openLabRepoBatchModal();
    return;
  }
  void import('../lazy-feature-routes.mjs')
    .then(function (routes) { return routes.ensureLabsLoaded(); })
    .then(function (mod) {
      if (mod && typeof mod.openLabRepoBatchModal === 'function') mod.openLabRepoBatchModal();
    });
}

function wire() {
  if (wired) return;
  wired = true;
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-sv-view],[data-sv-open],[data-sv-home],[data-sv-labs]');
    if (!t) return;
    if (t.hasAttribute('data-sv-view')) {
      setView(t.getAttribute('data-sv-view'));
    } else if (t.hasAttribute('data-sv-open')) {
      home = false;
      patientsBridge.selectPatient(t.getAttribute('data-sv-open'));
      syncSalaView();
    } else if (t.hasAttribute('data-sv-home')) {
      home = true;
      syncSalaView();
    } else {
      openLabsUpdate();
    }
  });
  // Esc en la vista de un paciente → vuelve a las tarjetas, si nada más usó la tecla.
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || ev.defaultPrevented || home || !isCards()) return;
    if (ev.target.closest('input,textarea,select,[contenteditable="true"],.modal,[role="dialog"]')) return;
    if (document.querySelector('.modal-backdrop.open,dialog[open]')) return;
    home = true;
    syncSalaView();
  });
}

/** Llamado tras cada render de la lista y cada cambio de paciente. */
export function syncSalaView() {
  if (!document.querySelector('.main-col')) return;
  wire();
  renderSidebarToggle();
  var body = document.body;
  if (!isCards()) {
    delete body.dataset.salaView;
    delete body.dataset.salaHome;
    ['sala-view-home', 'sala-view-rail'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.remove();
    });
    return;
  }
  var list = rows();
  if (rt.getActiveId() == null) home = true;
  body.dataset.salaView = 'cards';
  if (home) body.dataset.salaHome = '1';
  else delete body.dataset.salaHome;
  renderHome(list);
  renderRail(list);
}
