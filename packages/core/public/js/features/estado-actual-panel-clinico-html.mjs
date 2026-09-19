/** Estado clínico section HTML fragments — extracted from estado-actual-panel-clinico.mjs */
import { SOPORTE_OPTIONS } from './estado-actual-panel-constants.mjs';
import { escHtml, escAttr, escAttrNumeric } from './estado-actual-panel-format.mjs';
import {
  normalizeSoporteValue,
  soporteTier,
  VM_MODO_OPTIONS,
  buildVentilatorioCalcHints,
} from './estado-actual-ventilatorio.mjs';

/**
 * @param {Record<string, unknown>} ec
 * @param {string} kcalDisplay
 * @param {(s: unknown) => string} escAttr
 * @returns {string}
 */
export function renderDietCaloricFieldsHtml(ec, kcalDisplay, escAttr) {
  return (
    '<label class="ea-field">' +
    '<span class="ea-label">Kcal/kg</span>' +
    '<input type="number" class="ea-input" data-ea-ec="kcalKg" step="any" value="' +
    escAttr(ec.kcalKg) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Kcal total</span>' +
    '<input type="number" class="ea-input" data-ea-ec="kcal" step="any" min="0" value="' +
    escAttr(kcalDisplay) +
    '" placeholder="Total">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Proteína (g/día)</span>' +
    '<input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value="' +
    escAttr(ec.proteinG) +
    '" placeholder="Gramos">' +
    '</label>'
  );
}

/**
 * @param {string} dietWeightHint
 * @param {(s: unknown) => string} escHtml
 * @returns {string}
 */
export function renderDietWeightHintHtml(dietWeightHint, escHtml) {
  return '<p class="ea-diet-weight-hint">' + escHtml(dietWeightHint) + '</p>';
}

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

/**
 * @param {Record<string, unknown>} ec
 */
function renderSoporteOptions(ec) {
  var current = normalizeSoporteValue(ec.soporte);
  return SOPORTE_OPTIONS.map(function (opt) {
    var sel = current === opt ? ' selected' : '';
    return '<option value="' + escAttr(opt) + '"' + sel + '>' + escHtml(opt) + '</option>';
  }).join('');
}

/**
 * @param {Record<string, unknown>} ec
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown }} [vitalsCtx]
 */
function renderVitalsRowHtml(ec, vitalsCtx) {
  var soporteBlock = renderSoporteVentilatorioBlockHtml(ec, vitalsCtx);
  return (
    '<div class="ea-clinico-vitals-row">' +
    '<label class="ea-field">' +
    '<span class="ea-label">FOUR (/16)</span>' +
    '<input type="number" class="ea-input" data-ea-ec="four" min="0" max="16" step="1" value="' +
    escAttrNumeric(ec.four) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Esferas</span>' +
    '<input type="number" class="ea-input" data-ea-ec="esferas" min="0" step="1" value="' +
    escAttrNumeric(ec.esferas) +
    '">' +
    '</label>' +
    '<label class="ea-field ea-field--soporte">' +
    '<span class="ea-label">Soporte respiratorio</span>' +
    '<select class="ea-input" data-ea-ec="soporte">' +
    renderSoporteOptions(ec) +
    '</select>' +
    '</label>' +
    '</div>' +
    (soporteBlock
      ? '<div class="ea-soporte-vent-block" data-ea-soporte-wrap>' + soporteBlock + '</div>'
      : '')
  );
}

/**
 * @param {Record<string, unknown>} ec
 * @param {boolean} dietPending
 * @param {boolean} dietaSuplemento
 * @param {string} kcalDisplay
 * @param {boolean} [dietaParenteral]
 */
function renderNutritionRowHtml(ec, dietPending, dietaSuplemento, kcalDisplay, dietaParenteral) {
  var caloricHtml = '';
  if (!dietaSuplemento) {
    if (dietaParenteral) {
      caloricHtml =
        '<label class="ea-field">' +
        '<span class="ea-label">Kcal total</span>' +
        '<input type="number" class="ea-input" data-ea-ec="kcal" step="any" min="0" value="' +
        escAttr(kcalDisplay) +
        '" placeholder="Total">' +
        '</label>' +
        '<label class="ea-field">' +
        '<span class="ea-label">Proteína (g/día)</span>' +
        '<input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value="' +
        escAttr(ec.proteinG) +
        '" placeholder="Gramos">' +
        '</label>';
    } else {
      caloricHtml = renderDietCaloricFieldsHtml(ec, kcalDisplay, escAttr);
    }
  }
  return (
    '<div class="ea-clinico-nutrition-row">' +
    '<label class="ea-field ea-field--dieta">' +
    '<span class="ea-label">Dieta' +
    (dietPending ? ' <span class="ea-pendiente-badge">Propuesta</span>' : '') +
    '</span>' +
    '<input type="text" class="ea-input" data-ea-ec="dieta" value="' +
    escAttr(ec.dieta) +
    '">' +
    '</label>' +
    caloricHtml +
    '</div>'
  );
}

function renderDietProposalBarHtml(dietOptions, selectedIndex) {
  var optionsHtml = '';
  if (Array.isArray(dietOptions) && dietOptions.length > 1) {
    optionsHtml =
      '<div class="ea-diet-options" role="radiogroup" aria-label="Opciones de dieta desde SOME">' +
      '<span class="ea-diet-options-lead">Varias dietas detectadas — elige cuál aplicar:</span>' +
      dietOptions
        .map(function (opt, idx) {
          var checked = idx === selectedIndex ? ' checked' : '';
          return (
            '<label class="ea-diet-option">' +
            '<input type="radio" name="ea-diet-option" value="' +
            String(idx) +
            '"' +
            checked +
            ' onchange="selectEaDietOption(' +
            String(idx) +
            ')">' +
            '<span>' +
            escHtml(opt.label || opt.descripcion || 'Opción ' + (idx + 1)) +
            '</span></label>'
          );
        })
        .join('') +
      '</div>';
  }
  return (
    '<div class="ea-diet-proposal-bar">' +
    optionsHtml +
    '<span class="ea-diet-proposal-lead">Dieta importada desde SOME — revisa los valores y confirma o descarta.</span>' +
    '<div class="ea-diet-proposal-actions">' +
    '<button type="button" class="ea-btn ea-btn--success" onclick="confirmEaDietProposal()">Confirmar dieta</button>' +
    '<button type="button" class="ea-btn" onclick="discardEaDietProposal()">Descartar</button>' +
    '</div></div>'
  );
}

/**
 * @param {Record<string, unknown>} ec
 * @param {boolean} dietPending
 * @param {boolean} dietaSuplemento
 * @param {string} kcalDisplay
 * @param {string} dietWeightHint
 * @param {string} medFieldsHtml
 * @param {boolean} anyPending
 * @param {unknown[]} [dietOptions]
 * @param {number} [dietOptionSelected]
 * @param {boolean} [dietaParenteral]
 * @param {{ fr?: unknown, sat?: unknown, pesoKg?: unknown }} [vitalsCtx]
 */
export function renderEstadoClinicoBodyHtml(ec, dietPending, dietaSuplemento, kcalDisplay, dietWeightHint, medFieldsHtml, anyPending, dietOptions, dietOptionSelected, dietaParenteral, vitalsCtx) {
  return (
    '<div class="ea-clinico-body">' +
    '<div class="ea-clinico-grid">' +
    renderVitalsRowHtml(ec, vitalsCtx) +
    renderNutritionRowHtml(ec, dietPending, dietaSuplemento, kcalDisplay, dietaParenteral) +
    (dietPending ? renderDietProposalBarHtml(dietOptions, dietOptionSelected == null ? 0 : dietOptionSelected) : '') +
    '</div>' +
    (dietaSuplemento || dietaParenteral ? '' : renderDietWeightHintHtml(dietWeightHint, escHtml)) +
    medFieldsHtml +
    (anyPending
      ? '<div class="ea-clinico-actions">' +
        '<button type="button" class="ea-btn ea-btn--success" onclick="confirmAllEaMedProposals()">Confirmar todas las propuestas</button>' +
        '</div>'
      : '') +
    '</div>'
  );
}
