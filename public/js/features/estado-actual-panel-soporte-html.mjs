/** HTML de parámetros ventilatorios — extracted from estado-actual-panel-clinico-html.mjs */
import { escHtml, escAttr, escAttrNumeric } from './estado-actual-panel-format.mjs';
import {
  soporteTier,
  VM_MODO_OPTIONS,
  buildVentilatorioCalcHints,
} from './estado-actual-ventilatorio.mjs';

/**
 * @param {Record<string, unknown>} ec
 */
function renderVmModoOptions(ec) {
  return VM_MODO_OPTIONS.map(function (opt) {
    var sel = ec.vmModo === opt.value ? ' selected' : '';
    return (
      '<option value="' +
      escAttr(opt.value) +
      '"' +
      sel +
      '>' +
      escHtml(opt.label) +
      '</option>'
    );
  }).join('');
}

/**
 * @param {string} tier
 * @param {boolean} show
 */
function tierStyle(tier, show) {
  return show ? '' : ' style="display:none"';
}

/**
 * @param {Record<string, unknown>} ec
 * @param {SoporteTier} tier
 */
function renderSoporteParamsHtml(ec, tier) {
  var litros = tier === 'litros';
  var hfnc = tier === 'hfnc';
  var vmni = tier === 'vmni';
  var vm = tier === 'vm';
  var tqt = tier === 'tqt';
  var needsFio2 = hfnc || vmni || vm || tqt;

  return (
    '<div class="ea-soporte-params" data-ea-soporte-params>' +
    '<div class="ea-soporte-params-grid">' +
    '<label class="ea-field ea-soporte-tier-litros"' +
    tierStyle('litros', litros) +
    '><span class="ea-label">Litros O₂</span><input type="number" class="ea-input" data-ea-ec="soporteLitros" min="0" step="any" value="' +
    escAttrNumeric(ec.soporteLitros) +
    '" placeholder="L/min"></label>' +
    '<label class="ea-field ea-soporte-tier-hfnc"' +
    tierStyle('hfnc', hfnc) +
    '><span class="ea-label">Flujo (L/min)</span><input type="number" class="ea-input" data-ea-ec="soporteFlujoLmin" min="0" step="any" value="' +
    escAttrNumeric(ec.soporteFlujoLmin) +
    '" placeholder="60"></label>' +
    '<label class="ea-field ea-soporte-tier-vmni ea-soporte-tier-vm"' +
    tierStyle('vmni', vmni || vm) +
    '><span class="ea-label">PEEP / EPAP</span><input type="number" class="ea-input" data-ea-ec="vmPeep" min="0" step="any" value="' +
    escAttrNumeric(ec.vmPeep) +
    '" placeholder="cmH₂O"></label>' +
    '<label class="ea-field ea-soporte-tier-vmni"' +
    tierStyle('vmni', vmni) +
    '><span class="ea-label">PS (cmH₂O)</span><input type="number" class="ea-input" data-ea-ec="vmPsoporte" min="0" step="any" value="' +
    escAttrNumeric(ec.vmPsoporte) +
    '" placeholder="Sobre EPAP"></label>' +
    '<label class="ea-field ea-soporte-tier-vm"' +
    tierStyle('vm', vm) +
    '><span class="ea-label">Modo</span><select class="ea-input" data-ea-ec="vmModo">' +
    renderVmModoOptions(ec) +
    '</select></label>' +
    '<label class="ea-field ea-soporte-tier-vm"' +
    tierStyle('vm', vm) +
    '><span class="ea-label">VT (mL)</span><input type="number" class="ea-input" data-ea-ec="vmVt" min="0" step="any" value="' +
    escAttrNumeric(ec.vmVt) +
    '" placeholder="420"></label>' +
    '<label class="ea-field ea-soporte-tier-vm"' +
    tierStyle('vm', vm) +
    '><span class="ea-label">Flujo insp.</span><input type="number" class="ea-input" data-ea-ec="vmFlujo" min="0" step="any" value="' +
    escAttrNumeric(ec.vmFlujo) +
    '" placeholder="L/min"></label>' +
    '<label class="ea-field ea-soporte-tier-vm"' +
    tierStyle('vm', vm) +
    '><span class="ea-label">P meseta</span><input type="number" class="ea-input" data-ea-ec="vmPmeseta" min="0" step="any" value="' +
    escAttrNumeric(ec.vmPmeseta) +
    '" placeholder="cmH₂O"></label>' +
    '<label class="ea-field ea-soporte-tier-fio2"' +
    tierStyle('fio2', needsFio2) +
    '><span class="ea-label">FiO₂ (%)</span><input type="number" class="ea-input" data-ea-ec="soporteFio2" min="21" max="100" step="any" value="' +
    escAttrNumeric(ec.soporteFio2) +
    '" placeholder="%"></label>' +
    '</div></div>'
  );
}

/**
 * @param {{ sourceLabel?: string, kind?: string | null, pO2?: number | null, pCO2?: number | null } | null} labCtx
 */
function renderSoporteLabFeedHtml(labCtx) {
  if (!labCtx || !labCtx.sourceLabel) {
    return (
      '<div class="ea-soporte-lab-feed ea-soporte-lab-feed--empty">' +
      '<div class="ea-soporte-lab-feed-label">Expediente</div>' +
      '<div class="ea-soporte-lab-feed-text">Sin gasometría reciente — PaFi usa SpO₂ del pulsioxímetro si hay FiO₂.</div>' +
      '</div>'
    );
  }
  var values = [];
  if (labCtx.pO2 != null) values.push('pO₂ ' + labCtx.pO2);
  if (labCtx.pCO2 != null) values.push('pCO₂ ' + labCtx.pCO2);
  var valuesHtml =
  values.length
    ? '<div class="ea-soporte-lab-feed-values">' + escHtml(values.join(' · ')) + '</div>'
    : '';
  return (
    '<div class="ea-soporte-lab-feed">' +
    '<div class="ea-soporte-lab-feed-label">Expediente</div>' +
    '<div class="ea-soporte-lab-feed-body">' +
    '<div class="ea-soporte-lab-feed-text">' +
    escHtml(labCtx.sourceLabel) +
    '</div>' +
    valuesHtml +
    '</div>' +
    '</div>'
  );
}

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
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown, lab?: unknown }} [vitalsCtx]
 */
export function renderSoporteVentilatorioBlockHtml(ec, vitalsCtx) {
  var tier = soporteTier(ec.soporte != null ? String(ec.soporte) : '');
  if (!tier) return '';
  var labCtx = vitalsCtx && vitalsCtx.lab ? vitalsCtx.lab : null;
  var showInsights = tier === 'hfnc' || tier === 'vmni' || tier === 'vm' || tier === 'tqt';
  var params = renderSoporteParamsHtml(ec, tier);
  if (!showInsights) return params;
  var insights =
    '<div class="ea-soporte-insights">' +
    renderSoporteLabFeedHtml(labCtx) +
    renderSoporteCalcHintsHtml(ec, vitalsCtx) +
    '</div>';
  return params + insights;
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
  var litros = tier === 'litros';
  var hfnc = tier === 'hfnc';
  var vmni = tier === 'vmni';
  var vm = tier === 'vm';
  var tqt = tier === 'tqt';
  var needsFio2 = hfnc || vmni || vm || tqt;

  block.querySelectorAll('.ea-soporte-tier-litros').forEach(function (el) {
    el.style.display = litros ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-hfnc').forEach(function (el) {
    el.style.display = hfnc ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-vmni').forEach(function (el) {
    var isPeep = el.querySelector('[data-ea-ec="vmPeep"]');
    if (isPeep) el.style.display = vmni || vm ? '' : 'none';
    else el.style.display = vmni ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-vm').forEach(function (el) {
    el.style.display = vm ? '' : 'none';
  });
  block.querySelectorAll('.ea-soporte-tier-fio2').forEach(function (el) {
    el.style.display = needsFio2 ? '' : 'none';
  });

  var calc = mount.querySelector('[data-ea-soporte-calc]');
  if (calc) calc.style.display = tier ? '' : 'none';
  var insights = mount.querySelector('.ea-soporte-insights');
  if (insights) {
    insights.style.display =
      tier === 'hfnc' || tier === 'vmni' || tier === 'vm' || tier === 'tqt' ? '' : 'none';
  }
  var wrap = mount.querySelector('.ea-soporte-vent-block');
  if (wrap) wrap.style.display = tier ? '' : 'none';
}
