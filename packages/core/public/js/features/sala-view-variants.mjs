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
import { drawSalaHome, drawSalaRail, drawGridIcon } from './sala-view-variants-view.jsx';
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
var archView = false;

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

function rows(archived) {
  return sortPatientsForCensus(patientsVisibleInSidebar().filter(function (p) { return !p.archived === !archived; }));
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

export function bedLine(p) {
  var cuarto = String(p.cuarto || '').trim();
  var cama = String(p.cama || '').trim();
  return [cuarto && 'Cto. ' + cuarto, cama && 'Cama ' + cama].filter(Boolean).join(' · ') || 'Sin cama';
}

/** Etiquetas de alerta de la tarjeta (No RCP, ingreso incompleto, soporte, lab crítico). */
function cardTags(p) {
  var tags = [];
  if (Number(p.negativa_maniobras_firmada || 0)) tags.push({ cls: 'sv-tag--dnr', text: 'No RCP' });
  if (isPatientAdmissionIncomplete(p, rt.getSettings())) tags.push({ cls: 'sv-tag--warn', text: 'Ingreso incompleto' });
  var ventLabel = VENT_TIERS[soporteTier(p.monitoreo && p.monitoreo.estadoClinico && p.monitoreo.estadoClinico.soporte)];
  if (ventLabel) tags.push({ cls: 'sv-tag--warn', text: ventLabel });
  if (rt.ensureParsedLabHistoryCached && hasCriticalLabValue(rt.ensureParsedLabHistoryCached(p.id))) {
    tags.push({ cls: 'sv-tag--dnr', text: 'Lab crítico' });
  }
  return tags;
}

/** Same tags as markup, for the Interconsulta team board's "has a critical lab" check. */
export function cardTagsHtml(p) {
  return cardTags(p).map(function (t) { return '<span class="sv-tag ' + t.cls + '">' + esc(t.text) + '</span>'; }).join('');
}

export function cardModel(p) {
  ensurePatientDiagnosticos(p);
  return {
    id: String(p.id),
    active: isActive(p),
    archived: !!p.archived,
    bed: bedLine(p),
    tags: cardTags(p),
    name: p.nombre || 'Sin nombre',
    rawName: p.nombre,
    dx: p.diagnosticosList.filter(Boolean),
    ic: (Array.isArray(p.interconsultServiceIds) ? p.interconsultServiceIds : [])
      .map(serviceById)
      .filter(Boolean)
      .map(function (s) { return { name: s.name, hue: hueForService(s) }; }),
  };
}

/** Plain data for the cards view: `list` = patients in sala, `archived` = archived ones, `shown` = what the grid draws. */
export function homeModel(list, archived, shown, archView) {
  return { archView: archView, archivedCount: archived.length, listCount: list.length, shown: shown.map(cardModel) };
}

/** Plain data for the bed rail. */
export function railItems(list) {
  return list.map(function (p) {
    return { id: String(p.id), name: p.nombre || '', label: formatCamaCellForCenso(p), active: isActive(p) };
  });
}

function renderHome(list) {
  var main = document.querySelector('.main-col');
  var panel = el('sala-view-home', 'section', main, main.firstChild);
  var archived = rows(true);
  if (!archived.length) archView = false;
  var shown = archView ? archived : list;
  panel.setAttribute('aria-label', archView ? 'Pacientes archivados' : 'Pacientes de sala');
  drawSalaHome(panel, homeModel(list, archived, shown, archView));
  hintOnce(panel.querySelector('[data-sv-view="bar"]'), HINT_BAR_LS, 'Nuevo: vuelve a la barra lateral cuando quieras');
}

function renderRail(list) {
  var app = document.querySelector('.app');
  var rail = el('sala-view-rail', 'nav', app, document.querySelector('.main-col'));
  rail.setAttribute('aria-label', 'Camas');
  drawSalaRail(rail, railItems(list));
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
    drawGridIcon(btn);
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
    var t = ev.target.closest('[data-sv-view],[data-sv-open],[data-sv-home],[data-sv-labs],[data-sv-arch]');
    if (!t) return;
    if (t.hasAttribute('data-sv-view')) {
      setView(t.getAttribute('data-sv-view'));
    } else if (t.hasAttribute('data-sv-open')) {
      home = false;
      patientsBridge.selectPatient(t.getAttribute('data-sv-open'));
      syncSalaView();
    } else if (t.hasAttribute('data-sv-arch')) {
      archView = !archView;
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
