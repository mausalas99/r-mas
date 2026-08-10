/** Estado clínico section HTML fragments — extracted from estado-actual-panel-clinico.mjs */
import {
  renderDietCaloricFieldsHtml,
  renderDietWeightHintHtml,
} from './estado-actual-panel-diet.mjs';
import { escHtml, escAttr, escAttrNumeric } from './estado-actual-panel-format.mjs';
import { SOPORTE_OPTIONS } from './estado-actual-panel-constants.mjs';
import { normalizeSoporteValue } from './estado-actual-ventilatorio.mjs';
import { renderSoporteVentilatorioBlockHtml } from './estado-actual-panel-soporte-html.mjs';

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
