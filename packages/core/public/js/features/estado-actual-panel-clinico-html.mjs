/** Soporte respiratorio live DOM sync (the section markup is estado-actual-panel-clinico-view.jsx). */
import { escHtml } from './estado-actual-panel-format.mjs';
import { soporteTier, buildVentilatorioCalcHints } from './estado-actual-ventilatorio.mjs';

/**
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown, lab?: unknown }} [vitalsCtx]
 */
export function renderSoporteCalcHintsHtml(ec, vitalsCtx) {
  var tier = soporteTier(ec.soporte != null ? String(ec.soporte) : '');
  if (!tier) return '';
  var hints = buildVentilatorioCalcHints(ec, vitalsCtx || {});
  if (!hints.length) return '';
  return (
    '<ul class="ea-soporte-calc-list" data-ea-soporte-calc>' +
    hints
      .map(function (h) {
        return '<li class="ea-soporte-calc-item">' + escHtml(h) + '</li>';
      })
      .join('') +
    '</ul>'
  );
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
  insights.insertAdjacentHTML('beforeend', renderSoporteCalcHintsHtml(ec, vitalsCtx));
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
