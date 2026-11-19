/** Soporte respiratorio live DOM sync (the section markup is estado-actual-panel-clinico-view.jsx). */
import { SOPORTE_OPTIONS } from './estado-actual-panel-constants.mjs';
import { escAttrNumeric } from './estado-actual-panel-format.mjs';
import { buildSnapshotViewProps } from './estado-actual-panel-snapshot-html.mjs';
import {
  normalizeSoporteValue,
  soporteTier,
  VM_MODO_OPTIONS,
  buildVentilatorioCalcHints,
} from './estado-actual-ventilatorio.mjs';

/** Estado clínico fields that go in number inputs (non-numeric legacy strings are dropped). */
var NUMERIC_EC_KEYS = [
  'four', 'glasgow', 'rass', 'soporteLitros', 'soporteFlujoLmin', 'vmPeep', 'vmPsoporte', 'vmVt', 'vmFlujo', 'vmPmeseta', 'soporteFio2',
];

/**
 * Plain props for `EaClinicoSection`: derives what the view must not import (soporte tier, hints, options,
 * numeric field values, the snapshot strip props) from the already-gathered `a`.
 * @param {{ ec: Record<string, any>, snapshot: object, balGlobal: number, vitalsCtx: object, now?: Date }} a
 *   the rest of `a` (dietPending, dietaSuplemento, dietaParenteral, kcalDisplay, dietWeight, dietOptions,
 *   dietOptionSelected) goes through unchanged
 */
export function buildClinicoViewProps(a) {
  var ec = a.ec;
  var tier = soporteTier(ec.soporte != null ? String(ec.soporte) : '');
  var num = {};
  NUMERIC_EC_KEYS.forEach(function (k) {
    num[k] = escAttrNumeric(ec[k]);
  });
  return Object.assign({}, a, {
    soporteOptions: SOPORTE_OPTIONS,
    soporteCurrent: normalizeSoporteValue(ec.soporte),
    soporteTier: tier,
    vmModoOptions: VM_MODO_OPTIONS,
    calcHints: tier ? buildVentilatorioCalcHints(ec, a.vitalsCtx || {}) : [],
    num: num,
    snapshot: buildSnapshotViewProps(a.snapshot, a.balGlobal, a.now),
  });
}

/**
 * Re-render the hints in place (keeps input focus). Mirrors SoporteCalcHints in estado-actual-panel-clinico-view.jsx.
 * @param {HTMLElement | null} mount
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown, lab?: unknown }} [vitalsCtx]
 */
export function refreshSoporteCalcHints(mount, ec, vitalsCtx) {
  var insights = mount && mount.querySelector('.ea-soporte-insights');
  if (!insights) return;
  var old = insights.querySelector('[data-ea-soporte-calc]');
  if (old) old.remove();
  var tier = soporteTier(ec.soporte != null ? String(ec.soporte) : '');
  var hints = tier ? buildVentilatorioCalcHints(ec, vitalsCtx || {}) : [];
  if (!hints.length) return;
  var ul = document.createElement('ul');
  ul.className = 'ea-soporte-calc-list';
  ul.setAttribute('data-ea-soporte-calc', '');
  hints.forEach(function (h) {
    var li = document.createElement('li');
    li.className = 'ea-soporte-calc-item';
    li.textContent = h;
    ul.appendChild(li);
  });
  insights.appendChild(ul);
}

function resolveSoporteTierFlags(tier) {
  var litros = tier === 'litros';
  var hfnc = tier === 'hfnc';
  var vmni = tier === 'vmni';
  var vm = tier === 'vm';
  var tqt = tier === 'tqt';
  return {
    litros: litros,
    hfnc: hfnc,
    vmni: vmni,
    vm: vm,
    tqt: tqt,
    needsFio2: hfnc || vmni || vm || tqt,
    showInsights: hfnc || vmni || vm || tqt,
  };
}

function syncSoporteTierBlockVisibility(block, flags) {
  block.querySelectorAll('.ea-soporte-tier-litros').forEach(function (el) {
    el.style.display = flags.litros ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-hfnc').forEach(function (el) {
    el.style.display = flags.hfnc ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-vmni').forEach(function (el) {
    var isPeep = el.querySelector('[data-ea-ec="vmPeep"]');
    if (isPeep) el.style.display = flags.vmni || flags.vm ? '' : 'none';
    else el.style.display = flags.vmni ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-vm').forEach(function (el) {
    if (el.querySelector('[data-ea-ec="vmPeep"]')) return; // shared with VMNI, set above
    el.style.display = flags.vm ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-fio2').forEach(function (el) {
    el.style.display = flags.needsFio2 ? '' : 'none';
  });
}

function syncSoporteCalcAndInsightsVisibility(mount, tier, showInsights) {
  var calc = mount.querySelector('[data-ea-soporte-calc]');
  if (calc) calc.style.display = tier ? '' : 'none';
  var insights = mount.querySelector('.ea-soporte-insights');
  if (insights) insights.style.display = showInsights ? '' : 'none';
  var wrap = mount.querySelector('.ea-soporte-vent-block');
  if (wrap) wrap.style.display = tier ? '' : 'none';
}

/**
 * @param {HTMLElement | null} mount
 * @param {string | null | undefined} soporte
 */
export function syncSoporteParamsVisibility(mount, soporte) {
  if (!mount) return;
  var block = mount.querySelector('[data-ea-soporte-params]');
  if (!block) return;
  var tier = soporteTier(soporte != null ? String(soporte) : '');
  var flags = resolveSoporteTierFlags(tier);
  syncSoporteTierBlockVisibility(block, flags);
  syncSoporteCalcAndInsightsVisibility(mount, tier, flags.showInsights);
}
