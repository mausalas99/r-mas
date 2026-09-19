/**
 * Interconsult catalog modal — palette A only, no A/B switcher.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { openDialog } from '../../ui-overlay.mjs';
import {
  INTERCONSULT_SERVICES,
  REQUESTING_SERVICE_IDS,
  hueForService,
  hueForRequestingService,
  toggleInterconsultId,
  serviceById,
} from './interconsult-catalog.mjs';

var CAT_LABELS = { med: 'Médicas', qx: 'Quirúrgicas', sop: 'Soporte' };
var CAT_ORDER = ['med', 'qx', 'sop'];

var icLayer = null;

function svcChipHtml(svc, selected) {
  return (
    '<button type="button" class="svc' +
    (selected ? ' is-on' : '') +
    '" style="--h:' +
    hueForService(svc) +
    '" data-ic-toggle="' +
    escAttr(svc.id) +
    '">' +
    escHtml(svc.name) +
    '</button>'
  );
}

export function renderIcPickerHtml(assignedIds) {
  var assigned = Array.isArray(assignedIds) ? assignedIds : [];
  return CAT_ORDER.map(function (cat) {
    var chips = INTERCONSULT_SERVICES.filter(function (s) {
      return s.cat === cat;
    })
      .map(function (s) {
        return svcChipHtml(s, assigned.indexOf(s.id) >= 0);
      })
      .join('');
    return (
      '<div class="ic-cat"><small>' +
      escHtml(CAT_LABELS[cat]) +
      '</small><div class="chips">' +
      chips +
      '</div></div>'
    );
  }).join('');
}

function ensureIcDom() {
  var scrim = document.getElementById('patient-ic-scrim');
  var panel = document.getElementById('patient-ic-panel');
  if (scrim && panel) return { scrim: scrim, panel: panel };
  scrim = document.createElement('div');
  scrim.id = 'patient-ic-scrim';
  scrim.hidden = true;
  scrim.setAttribute('aria-hidden', 'true');
  panel = document.createElement('div');
  panel.id = 'patient-ic-panel';
  panel.className = 'patient-dash patient-dash-ic-modal';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'patient-ic-title');
  panel.innerHTML =
    '<h3 id="patient-ic-title">Servicios interconsultantes</h3>' +
    '<div id="ic-picker"></div>' +
    '<button type="button" class="btn-med-secondary" data-ic-done>Listo</button>';
  scrim.appendChild(panel);
  document.body.appendChild(scrim);
  return { scrim: scrim, panel: panel };
}

function paintPicker(assignedIds) {
  var picker = document.getElementById('ic-picker');
  if (picker) picker.innerHTML = renderIcPickerHtml(assignedIds);
}

/**
 * @param {{
 *   assignedIds: string[],
 *   onToggle: (id: string) => string[],
 *   trigger?: HTMLElement,
 * }} opts
 */
export function openInterconsultModal(opts) {
  var assigned = Array.isArray(opts && opts.assignedIds) ? opts.assignedIds.slice() : [];
  var onToggle = opts && typeof opts.onToggle === 'function' ? opts.onToggle : null;
  var dom = ensureIcDom();
  paintPicker(assigned);
  if (icLayer && typeof icLayer.close === 'function') icLayer.close();
  icLayer = openDialog({
    panel: dom.panel,
    scrim: dom.scrim,
    nested: true,
    trigger: opts && opts.trigger,
  });
  dom.panel.onclick = function (ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== 'function') return;
    var done = t.closest('[data-ic-done]');
    if (done) {
      if (icLayer) icLayer.close();
      return;
    }
    var btn = t.closest('[data-ic-toggle]');
    if (!btn || !onToggle) return;
    var id = btn.getAttribute('data-ic-toggle');
    assigned = onToggle(id) || toggleInterconsultId(assigned, id);
    paintPicker(assigned);
  };
}

export function closeInterconsultModal() {
  if (icLayer && typeof icLayer.close === 'function') icLayer.close();
  icLayer = null;
}

/* ── Single-service picker (Servicio solicitante) ──────────────────
 * Same catalog/category chips as the interconsultantes picker above,
 * but a single pick that closes the modal instead of a toggle-array.
 */

function svcPickChipHtml(svc, selected) {
  return (
    '<button type="button" class="svc' +
    (selected ? ' is-on' : '') +
    '" style="--h:' +
    hueForRequestingService(svc) +
    '" data-svc-pick="' +
    escAttr(svc.id) +
    '">' +
    escHtml(svc.name) +
    '</button>'
  );
}

/** Flat chip row (no category grouping) — the requesting-service subset is
 * short enough that Médicas/Quirúrgicas/Soporte headers would be noise. */
export function renderServicePickerHtml(selectedName) {
  var name = String(selectedName || '').trim();
  return (
    '<div class="chips">' +
    REQUESTING_SERVICE_IDS.map(serviceById)
      .filter(Boolean)
      .map(function (s) {
        return svcPickChipHtml(s, s.name === name);
      })
      .join('') +
    '</div>'
  );
}

var svcPickLayer = null;

function ensureSvcPickDom() {
  var scrim = document.getElementById('patient-svc-pick-scrim');
  var panel = document.getElementById('patient-svc-pick-panel');
  if (scrim && panel) return { scrim: scrim, panel: panel };
  scrim = document.createElement('div');
  scrim.id = 'patient-svc-pick-scrim';
  scrim.hidden = true;
  scrim.setAttribute('aria-hidden', 'true');
  panel = document.createElement('div');
  panel.id = 'patient-svc-pick-panel';
  panel.className = 'patient-dash patient-dash-ic-modal';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'patient-svc-pick-title');
  scrim.appendChild(panel);
  document.body.appendChild(scrim);
  return { scrim: scrim, panel: panel };
}

function paintSvcPicker(panel, selectedName) {
  panel.innerHTML =
    '<h3 id="patient-svc-pick-title">Servicio solicitante</h3>' +
    '<div id="svc-picker">' +
    renderServicePickerHtml(selectedName) +
    '</div>' +
    '<button type="button" class="btn-med-secondary" data-svc-pick-done>Cerrar</button>';
}

/**
 * @param {{ current?: string, onSelect: (name: string) => void, trigger?: HTMLElement }} opts
 */
export function openServicePickerModal(opts) {
  var current = (opts && opts.current) || '';
  var onSelect = opts && typeof opts.onSelect === 'function' ? opts.onSelect : null;
  var dom = ensureSvcPickDom();
  paintSvcPicker(dom.panel, current);
  if (svcPickLayer && typeof svcPickLayer.close === 'function') svcPickLayer.close();
  svcPickLayer = openDialog({
    panel: dom.panel,
    scrim: dom.scrim,
    nested: true,
    trigger: opts && opts.trigger,
  });
  dom.panel.onclick = function (ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== 'function') return;
    if (t.closest('[data-svc-pick-done]')) {
      if (svcPickLayer) svcPickLayer.close();
      return;
    }
    var btn = t.closest('[data-svc-pick]');
    if (!btn) return;
    var svc = serviceById(btn.getAttribute('data-svc-pick'));
    if (svc && onSelect) onSelect(svc.name);
    if (svcPickLayer) svcPickLayer.close();
  };
}

export function closeServicePickerModal() {
  if (svcPickLayer && typeof svcPickLayer.close === 'function') svcPickLayer.close();
  svcPickLayer = null;
}
