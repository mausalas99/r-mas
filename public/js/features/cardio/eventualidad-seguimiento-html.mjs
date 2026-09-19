/**
 * Markup for the "Eventualidades" follow-up wizard — one structured entry
 * per hospitalization day, on `patient.cardio.eventualidadesSeguimiento[]`
 * (repeatable version of Eval. inicial's clinical sections; see
 * `lib/cardio/eventualidad-seguimiento.mjs`). Sala-only screen, same gate as
 * the old free-text panel it replaces (`expediente-tabs.mjs`).
 *
 * Reuses Eval. inicial's section builders verbatim (`exploracionHtml`,
 * `vexusInicialHtml`, `usPulmonarCardHtml`/`usPulmonarModalBodyHtml`,
 * `rxToraxCardHtml`/`rxToraxModalBodyHtml`, `explorationModalHtml`,
 * `labsIngresoNumbersHtml`) — these emit `data-hf-ei-*` attributes, which
 * `eventualidad-seguimiento-wire.mjs` wires up directly (the attribute
 * names are just DOM plumbing scoped to this panel's own mount; reusing
 * them here is intentional, not a naming mistake). Also reuses Consulta
 * IC's `renderVisitSelectorHtml` for the date picker (already generic).
 */
import { escHtml } from '../../dom-escape.mjs';
import { narrativeTextarea } from './hf-field-kit.mjs';
import {
  field,
  textInput,
  numberInput,
  sectionTitle,
  row,
  exploracionHtml,
  vexusInicialHtml,
  usPulmonarCardHtml,
  rxToraxCardHtml,
  explorationModalHtml,
  labsIngresoNumbersHtml,
} from './evaluacion-inicial-html.mjs';
import { renderVisitSelectorHtml } from './consulta-ic-html.mjs';
import { cardioImageAttachHtml } from './cardio-image-attach.mjs';

export var EVENTUALIDAD_STEP_TITLES = ['Exploración', 'VExUS', 'US pulmonar y Rx tórax', 'FEVI y labs', 'Impresión y plan'];
export var EVENTUALIDAD_STEP_COUNT = EVENTUALIDAD_STEP_TITLES.length;

function stepExploracionHtml(d) {
  return '<div class="hf-section hf-section--primary">' + sectionTitle('Exploración física') + exploracionHtml(d.exploracion) + '</div>';
}

function stepVexusHtml(d) {
  return '<div class="hf-section hf-section--primary">' + sectionTitle('VExUS') + vexusInicialHtml(d.vexusInicial) + '</div>';
}

function stepUsRxHtml(d, modal, side) {
  return (
    '<div class="hf-ei-card-row">' +
    usPulmonarCardHtml(d.usPulmonar) +
    cardioImageAttachHtml({ kind: 'pocus' }) +
    rxToraxCardHtml(d.rxTorax) +
    cardioImageAttachHtml({ kind: 'rxTorax' }) +
    '</div>' +
    narrativeTextarea('hf-ei', 'ecgIngreso', d.ecgIngreso, 'ECG') +
    cardioImageAttachHtml({ kind: 'ekg' }) +
    explorationModalHtml(modal, side, d)
  );
}

function stepFeviLabsHtml(d) {
  var labs = d.labsIngreso || {};
  return (
    '<div class="hf-section hf-section--primary">' +
    sectionTitle('Datos generales') +
    row(
      field('FEVI estimada', numberInput('hf-ei', 'feviEstimadaInicial', d.feviEstimadaInicial)) +
        field('Fecha de labs', textInput('hf-ei-labs', 'fecha', labs.fecha, 'date'))
    ) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Labs') +
    labsIngresoNumbersHtml(d.labsIngreso) +
    '</div>'
  );
}

function stepImpresionPlanHtml(d) {
  return (
    narrativeTextarea('hf-ei', 'impresionDiagnostica', d.impresionDiagnostica, 'Impresión diagnóstica') +
    narrativeTextarea('hf-ei', 'planTerapeutico', d.planTerapeutico, 'Plan terapéutico') +
    '<div class="hf-section">' +
    sectionTitle('Diuresis y gasto urinario') +
    row(
      field('Diuresis 2h post-bolo', numberInput('hf-ei', 'nau2hPostBolo', d.nau2hPostBolo)) +
        field('Gasto urinario 6h', numberInput('hf-ei', 'gastoUrinario6h', d.gastoUrinario6h))
    ) +
    '</div>'
  );
}

function stepBodyHtml(step, d, modal, side) {
  if (step === 1) return stepVexusHtml(d);
  if (step === 2) return stepUsRxHtml(d, modal, side);
  if (step === 3) return stepFeviLabsHtml(d);
  if (step === 4) return stepImpresionPlanHtml(d);
  return stepExploracionHtml(d);
}

function stepPillsHtml(step) {
  return (
    '<div class="hf-wizard-steps" role="tablist" aria-label="Pasos">' +
    EVENTUALIDAD_STEP_TITLES.map(function (title, i) {
      var current = i === step;
      return (
        '<button type="button" class="hf-wizard-step' +
        (current ? ' is-current' : '') +
        '" data-hf-ev-step-jump="' +
        i +
        '" role="tab" aria-selected="' +
        (current ? 'true' : 'false') +
        '" title="' +
        escHtml(title) +
        '">' +
        (i + 1) +
        '</button>'
      );
    }).join('') +
    '</div>'
  );
}

function lockBannerHtml(locked) {
  if (!locked) return '';
  return (
    '<div class="hf-ei-lock-banner" style="display:flex;justify-content:space-between;align-items:center;gap:8px;' +
    'margin-bottom:8px;padding:6px 10px;border-radius:6px;background:#fdecea;color:#7a2e22;font-size:0.9em">' +
    '<span>🔒 Solo lectura — fecha pasada</span>' +
    '<button type="button" class="ea-btn" data-hf-history-edit="unlock">Editar</button>' +
    '</div>'
  );
}

function stepNavHtml(step) {
  var isFirst = step <= 0;
  var isLast = step >= EVENTUALIDAD_STEP_COUNT - 1;
  return (
    '<div class="hf-ei-step-nav" style="display:flex;justify-content:space-between;gap:8px;margin-top:12px">' +
    (isFirst ? '<span></span>' : '<button type="button" class="ea-btn" data-hf-ev-step-action="back">Atrás</button>') +
    (isLast ? '<span></span>' : '<button type="button" class="ea-btn ea-btn--primary" data-hf-ev-step-action="next">Siguiente</button>') +
    '</div>'
  );
}

/**
 * @param {{date: string, existingDates: string[], entry: any, step?: number, modal?: string|null, side?: 'D'|'I', locked?: boolean}} ctx
 */
export function buildEventualidadSeguimientoHtml(ctx) {
  var c = ctx || {};
  var d = c.entry || {};
  var s = Math.max(0, Math.min(EVENTUALIDAD_STEP_COUNT - 1, Number(c.step) || 0));
  return (
    '<div class="hf-ei-form rpc-form-stack">' +
    renderVisitSelectorHtml({ date: c.date, existingDates: c.existingDates }) +
    lockBannerHtml(!!c.locked) +
    stepPillsHtml(s) +
    '<div class="hf-ei-step-head" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px">' +
    '<h3 class="ea-snapshot-zone-title" style="margin:0">' +
    escHtml(EVENTUALIDAD_STEP_TITLES[s]) +
    '</h3>' +
    '<span class="ea-muted">Paso ' +
    escHtml(String(s + 1)) +
    ' de ' +
    escHtml(String(EVENTUALIDAD_STEP_COUNT)) +
    '</span>' +
    '</div>' +
    '<div class="hf-ei-step-body">' +
    stepBodyHtml(s, d, c.modal, c.side) +
    '</div>' +
    stepNavHtml(s) +
    '</div>'
  );
}
