/**
 * Interconsult catalog modal — palette A only, no A/B switcher.
 */
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

/** Services grouped by category, with the selected ones marked. */
function icGroups(assignedIds) {
  var assigned = Array.isArray(assignedIds) ? assignedIds : [];
  return CAT_ORDER.map(function (cat) {
    return {
      label: CAT_LABELS[cat],
      services: INTERCONSULT_SERVICES.filter(function (s) {
        return s.cat === cat;
      }).map(function (s) {
        return { id: s.id, name: s.name, hue: hueForService(s), on: assigned.indexOf(s.id) >= 0 };
      }),
    };
  });
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
  scrim.appendChild(panel);
  document.body.appendChild(scrim);
  return { scrim: scrim, panel: panel };
}

async function paintPicker(panel, assignedIds) {
  // Lazy: Preact stays off the boot path until a picker opens.
  var view = await import('./ic-modal-view.jsx');
  view.drawIcPanel(panel, icGroups(assignedIds));
}

/**
 * @param {{
 *   assignedIds: string[],
 *   onToggle: (id: string) => string[],
 *   trigger?: HTMLElement,
 * }} opts
 */
export async function openInterconsultModal(opts) {
  var assigned = Array.isArray(opts && opts.assignedIds) ? opts.assignedIds.slice() : [];
  var onToggle = opts && typeof opts.onToggle === 'function' ? opts.onToggle : null;
  var dom = ensureIcDom();
  await paintPicker(dom.panel, assigned);
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
    void paintPicker(dom.panel, assigned);
  };
}

/* ── Single-service picker (Servicio solicitante) ──────────────────
 * Same catalog/category chips as the interconsultantes picker above,
 * but a single pick that closes the modal instead of a toggle-array.
 */

/** Flat chip row (no category grouping) — the requesting-service subset is
 * short enough that Médicas/Quirúrgicas/Soporte headers would be noise. */
function requestingServices(selectedName) {
  var name = String(selectedName || '').trim();
  return REQUESTING_SERVICE_IDS.map(serviceById)
    .filter(Boolean)
    .map(function (s) {
      return { id: s.id, name: s.name, hue: hueForRequestingService(s), on: s.name === name };
    });
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

async function paintSvcPicker(panel, selectedName) {
  var view = await import('./ic-modal-view.jsx');
  view.drawServicePanel(panel, requestingServices(selectedName));
}

/**
 * @param {{ current?: string, onSelect: (name: string) => void, trigger?: HTMLElement }} opts
 */
export async function openServicePickerModal(opts) {
  var current = (opts && opts.current) || '';
  var onSelect = opts && typeof opts.onSelect === 'function' ? opts.onSelect : null;
  var dom = ensureSvcPickDom();
  await paintSvcPicker(dom.panel, current);
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
