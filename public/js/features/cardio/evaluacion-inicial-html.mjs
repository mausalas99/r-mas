/**
 * Markup for "Eval. inicial" (Document 2) — the ER/admission intake filled
 * once per hospitalization episode, on `patient.cardio.evaluacionInicial`
 * (a single object, not an array — see `lib/cardio/evaluacion-inicial.mjs`).
 * Sala-only screen; see `expediente-tabs.mjs` for the mode gate.
 *
 * Field-kit reuse: `triSelect`/`enumSelect`/`narrativeTextarea` and the
 * medicamentos-previos repeatable-row helpers come from `hf-field-kit.mjs`
 * (read-only import, not modified here). Etiología/fenotipo/residente are
 * NOT part of `evaluacionInicial` per the lib file — etiología and fenotipo
 * are canonical `patient.cardio.{etiologia,fenotipo}` fields referenced
 * directly (same `data-ea-cardio` attribute + `enumSelect` markup as
 * `estado-actual-cardio-html.mjs`'s Identidad row, so the existing
 * `applyCardioFieldChange` wire helper can be reused verbatim); `residente`
 * DOES exist as its own field on `evaluacionInicial` (a real discrepancy
 * from the plan's assumption — see the wire file for how both are read).
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { escAttrNumeric } from '../estado-actual-panel-format.mjs';
import {
  triSelect,
  enumSelect,
  narrativeTextarea,
  medicamentoPrevioListHtml,
} from './hf-field-kit.mjs';
import {
  FENOTIPOS,
  ETIOLOGIAS,
  ESTRATEGIA_FA,
  LLENADO_CAPILAR,
  TEMPERATURA_EXTREMIDADES,
  EDEMA_MI_GRADO,
  STEVENSON,
  DOPPLER_SUPRAHEPATICO,
  PULSATILIDAD_PORTAL,
  DOPPLER_RENAL,
  VEXUS_GRADES,
  RX_TORAX_HALLAZGOS,
  LINEAS_B_CAMPO,
} from '../../../../lib/cardio/hf-enums.mjs';

function field(labelText, inputHtml) {
  return (
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">' +
    escHtml(labelText) +
    '</span>' +
    inputHtml +
    '</label>'
  );
}

function textInput(dataAttr, key, val, type) {
  return (
    '<input type="' +
    (type || 'text') +
    '" class="ea-input" data-' +
    dataAttr +
    '="' +
    escAttr(key) +
    '" value="' +
    escAttr(val) +
    '">'
  );
}

export var DURATION_UNITS = [
  { value: 'dia', singular: 'día', plural: 'días' },
  { value: 'semana', singular: 'semana', plural: 'semanas' },
  { value: 'mes', singular: 'mes', plural: 'meses' },
  { value: 'ano', singular: 'año', plural: 'años' },
];

// "2 meses" / "1 día" (free text) → { n: 2, unit: 'mes' } for pre-filling the
// picker; unmatched legacy text keeps unit defaulted and n blank rather than
// guessing, so we never silently rewrite a doctor's original note.
function parseDurationValue(val) {
  var text = String(val || '').trim();
  var match = /^(\d+(?:[.,]\d+)?)\s*([a-záéíóúñ]+)/i.exec(text);
  if (!match) return { n: '', unit: 'mes' };
  var n = match[1].replace(',', '.');
  var word = match[2].toLowerCase();
  var unit = DURATION_UNITS.find(function (u) {
    return word.indexOf(u.value === 'ano' ? 'año' : u.value) === 0;
  });
  return { n: n, unit: unit ? unit.value : 'mes' };
}

/** @param {string} n @param {string} unitValue */
export function composeDurationValue(n, unitValue) {
  var nText = String(n || '').trim();
  if (!nText) return '';
  var unit = DURATION_UNITS.find(function (u) {
    return u.value === unitValue;
  }) || DURATION_UNITS[2];
  var num = Number(nText.replace(',', '.'));
  var word = num === 1 ? unit.singular : unit.plural;
  return nText + ' ' + word;
}

/**
 * Number + unit picker (e.g. "2" + "Meses") instead of a free-text box, so
 * "tiempo de evolución" stays a comparable value instead of prose.
 */
function durationField(labelText, dataAttr, key, val) {
  var parsed = parseDurationValue(val);
  var options = DURATION_UNITS.map(function (u) {
    return '<option value="' + u.value + '"' + (u.value === parsed.unit ? ' selected' : '') + '>' + escHtml(u.plural) + '</option>';
  }).join('');
  return (
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">' +
    escHtml(labelText) +
    '</span>' +
    '<div class="hf-duration-field">' +
    '<input type="number" min="0" step="1" class="ea-input hf-duration-number" data-' +
    dataAttr +
    '-duration-n="' +
    escAttr(key) +
    '" value="' +
    escAttrNumeric(parsed.n) +
    '">' +
    '<select class="ea-input hf-duration-unit" data-' +
    dataAttr +
    '-duration-unit="' +
    escAttr(key) +
    '">' +
    options +
    '</select>' +
    '</div>' +
    '</label>'
  );
}

function numberInput(dataAttr, key, val) {
  return (
    '<input type="number" step="any" class="ea-input" data-' +
    dataAttr +
    '="' +
    escAttr(key) +
    '" value="' +
    escAttrNumeric(val) +
    '">'
  );
}

function sectionTitle(text) {
  return '<h4 class="hf-section-title">' + escHtml(text) + '</h4>';
}

function row(html) {
  return '<div class="hf-ei-row hf-field-grid">' + html + '</div>';
}

function tratamientoPrevioHtml(t) {
  var d = t || {};
  return row(
    field('IECA/ARA', triSelect('hf-ei-trat', 'ieca_ara', d.ieca_ara)) +
      field('ARNI', triSelect('hf-ei-trat', 'arni', d.arni)) +
      field('SGLT2i', triSelect('hf-ei-trat', 'sglt2', d.sglt2)) +
      field('ARM', triSelect('hf-ei-trat', 'arm', d.arm)) +
      field('Betabloqueador', triSelect('hf-ei-trat', 'bb', d.bb)) +
      field('ASA', triSelect('hf-ei-trat', 'asa', d.asa)) +
      field('Anticoagulante', textInput('hf-ei-trat', 'anticoagulante', d.anticoagulante))
  );
}

function exploracionHtml(e) {
  var d = e || {};
  return row(
    field('TA', textInput('hf-ei-expl', 'ta', d.ta)) +
      field('FC', numberInput('hf-ei-expl', 'fc', d.fc)) +
      field('SatO2', numberInput('hf-ei-expl', 'satO2', d.satO2)) +
      field('PVY', triSelect('hf-ei-expl', 'pvy', d.pvy)) +
      field('Soplo', triSelect('hf-ei-expl', 'soplo', d.soplo)) +
      field('Nota soplo', textInput('hf-ei-expl', 'soploNota', d.soploNota)) +
      field('Estertores', triSelect('hf-ei-expl', 'estertores', d.estertores)) +
      field('Nota estertores', textInput('hf-ei-expl', 'estertoresNota', d.estertoresNota)) +
      field('Ascitis/hepatomegalia', triSelect('hf-ei-expl', 'ascitisHepatomegalia', d.ascitisHepatomegalia)) +
      field('Edema MI', enumSelect('hf-ei-expl', 'edemaMi', d.edemaMi, EDEMA_MI_GRADO)) +
      field('Llenado capilar', enumSelect('hf-ei-expl', 'llenadoCapilar', d.llenadoCapilar, LLENADO_CAPILAR)) +
      field(
        'Temperatura extremidades',
        enumSelect('hf-ei-expl', 'temperaturaExtremidades', d.temperaturaExtremidades, TEMPERATURA_EXTREMIDADES)
      ) +
      field('Stevenson–Nohria', enumSelect('hf-ei-expl', 'stevenson', d.stevenson, STEVENSON))
  );
}

function vexusInicialHtml(v) {
  var d = v || {};
  return (
    row(
      field('VCI (mm)', numberInput('hf-ei-vexus', 'vciMm', d.vciMm)) +
        field('Colapso VCI', textInput('hf-ei-vexus', 'vciColapso', d.vciColapso)) +
        field('Doppler suprahepático', enumSelect('hf-ei-vexus', 'dopplerHepaticas', d.dopplerHepaticas, DOPPLER_SUPRAHEPATICO)) +
        field('Pulsatilidad portal', enumSelect('hf-ei-vexus', 'pulsatilidadPorta', d.pulsatilidadPorta, PULSATILIDAD_PORTAL)) +
        field('Doppler renal', enumSelect('hf-ei-vexus', 'dopplerRenal', d.dopplerRenal, DOPPLER_RENAL)) +
        field('Grado VExUS', enumSelect('hf-ei-vexus', 'grado', d.grado, VEXUS_GRADES))
    ) +
    '<div class="ea-clinico-actions">' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-hf-ei-action="sync-congestion">Guardar VExUS de ingreso en Congestión</button>' +
    '</div>'
  );
}

// Same 8-zone convention as the POCUS/Congestión grid
// (`estado-actual-cardio-html.mjs` / `lib/cardio/congestion.mjs`'s
// `LUNG_ZONE_KEYS`): campos 0-3 = derecho, 4-7 = izquierdo, each in
// anterior-superior / anterior-inferior / lateral-superior / lateral-inferior
// order. `evaluacionInicial.usPulmonar.campos` itself is a generic
// "Campo N" array with no anatomical key names, so this side split is a
// presentation-only judgment call (not a data-schema claim) made for
// visual scanability — matching the convention already established
// elsewhere in this codebase for an 8-zone lung-US grid.
var US_PULMONAR_ZONE_SHORT_LABELS = ['Ant. superior', 'Ant. inferior', 'Lat. superior', 'Lat. inferior'];

function usPulmonarCampoHtml(campo, idx) {
  var c = campo || {};
  return (
    '<div class="hf-lung-grid-zone">' +
    '<span class="hf-lung-grid-zone-label">' +
    escHtml(US_PULMONAR_ZONE_SHORT_LABELS[idx % 4]) +
    '</span>' +
    enumSelect('hf-ei-uspulmonar-lineasb', String(idx), c.lineasB, LINEAS_B_CAMPO) +
    '<label class="ea-field ea-field--inline"><span class="ea-label">Derrame</span>' +
    triSelect('hf-ei-uspulmonar-derrame', String(idx), c.derrame) +
    '</label>' +
    '<label class="ea-field ea-field--inline"><span class="ea-label">Consolidación</span>' +
    triSelect('hf-ei-uspulmonar-consolidacion', String(idx), c.consolidacion) +
    '</label>' +
    '</div>'
  );
}

function usPulmonarHtml(us) {
  var d = us || {};
  var campos = Array.isArray(d.campos) ? d.campos : [];
  var right = campos.slice(0, 4).map(usPulmonarCampoHtml).join('');
  var left = campos
    .slice(4, 8)
    .map(function (c, i) {
      return usPulmonarCampoHtml(c, i + 4);
    })
    .join('');
  return (
    '<div class="hf-lung-grid">' +
    '<div class="hf-lung-grid-col">' +
    '<h5 class="hf-lung-grid-side-title">Derecho</h5>' +
    right +
    '</div>' +
    '<div class="hf-lung-grid-col">' +
    '<h5 class="hf-lung-grid-side-title">Izquierdo</h5>' +
    left +
    '</div>' +
    '</div>' +
    narrativeTextarea('hf-ei-uspulmonar', 'nota', d.nota, 'Nota US pulmonar')
  );
}

function rxToraxHallazgoCheckboxHtml(opt, selected) {
  var checked = selected.indexOf(opt.value) >= 0;
  return (
    '<label class="ea-field ea-field--inline">' +
    '<input type="checkbox" data-hf-ei-rxtorax-hallazgo="' +
    escAttr(opt.value) +
    '"' +
    (checked ? ' checked' : '') +
    '> ' +
    escHtml(opt.label) +
    '</label>'
  );
}

function rxToraxHtml(rx) {
  var d = rx || {};
  var selected = Array.isArray(d.hallazgos) ? d.hallazgos : [];
  return (
    row(RX_TORAX_HALLAZGOS.map(function (opt) { return rxToraxHallazgoCheckboxHtml(opt, selected); }).join('')) +
    narrativeTextarea('hf-ei-rxtorax', 'nota', d.nota, 'Nota Rx tórax')
  );
}

function labsIngresoHtml(labs) {
  var d = labs || {};
  var rows = [
    ['na', 'Na'],
    ['k', 'K'],
    ['mg', 'Mg'],
    ['creat', 'Creatinina'],
    ['bun', 'BUN'],
    ['fa', 'FA'],
    ['hb', 'Hb'],
    ['ntProBnp', 'NT-proBNP'],
    ['lactato', 'Lactato'],
    ['bilTotal', 'Bilirrubina total'],
    ['bilDirecta', 'Bilirrubina directa'],
    ['bicarbonato', 'Bicarbonato'],
    ['ph', 'pH'],
    ['troponina', 'Troponina'],
  ];
  return (
    row(field('Fecha de labs', textInput('hf-ei-labs', 'fecha', d.fecha, 'date'))) +
    row(
      rows
        .map(function (r) {
          return field(r[1], numberInput('hf-ei-labs', r[0], d[r[0]]));
        })
        .join('')
    )
  );
}

/**
 * Step wizard: paper-form order is preserved, only grouped into windows that
 * each fit one screen without page-scroll (see the task's step grouping).
 */
export var EVALUACION_INICIAL_STEP_TITLES = [
  'Identificación',
  'Historia de IC',
  'Exploración',
  'FEVI y labs',
  'Impresión y plan',
];
export var EVALUACION_INICIAL_STEP_COUNT = EVALUACION_INICIAL_STEP_TITLES.length;

function stepIdentificacionHtml(d) {
  return (
    '<div class="hf-section">' +
    sectionTitle('Datos generales') +
    row(
      field('Fecha', textInput('hf-ei', 'fecha', d.fecha, 'date')) +
        field('Residente', textInput('hf-ei', 'residente', d.residente))
    ) +
    '</div>' +
    narrativeTextarea('hf-ei', 'motivoConsulta', d.motivoConsulta, 'Motivo de consulta') +
    narrativeTextarea('hf-ei', 'antecedentes', d.antecedentes, 'Antecedentes')
  );
}

function stepHistoriaIcHtml(d, c) {
  return (
    '<div class="hf-section hf-section--primary">' +
    sectionTitle('Medicamentos previos') +
    medicamentoPrevioListHtml(d.medicamentosPrevios) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Historia de IC') +
    row(
      field('Historia de IC previa', triSelect('hf-ei', 'historiaIcPrevia', d.historiaIcPrevia)) +
        field('Fenotipo previo', enumSelect('hf-ei', 'fenotipoPrevio', d.fenotipoPrevio, FENOTIPOS)) +
        field('Etiología', enumSelect('ea-cardio', 'etiologia', c.etiologia, ETIOLOGIAS)) +
        durationField('Tiempo de evolución', 'hf-ei', 'tiempoEvolucion', d.tiempoEvolucion) +
        field('Última hospitalización', textInput('hf-ei', 'ultimaHospitalizacion', d.ultimaHospitalizacion, 'date')) +
        field('Último NT-proBNP', numberInput('hf-ei', 'ultimoNtProBnp', d.ultimoNtProBnp)) +
        field('Última FEVI', numberInput('hf-ei', 'ultimaFevi', d.ultimaFevi))
    ) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Tratamiento previo') +
    tratamientoPrevioHtml(d.tratamientoPrevio) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('FA/Flutter y dispositivo') +
    row(
      field('FA/Flutter', triSelect('hf-ei', 'faFlutter', d.faFlutter)) +
        field('Estrategia', enumSelect('hf-ei', 'estrategia', d.estrategia, ESTRATEGIA_FA)) +
        field('Dispositivo previo', triSelect('hf-ei', 'dispositivoPrevio', d.dispositivoPrevio)) +
        field('Especificar', textInput('hf-ei', 'especificar', d.especificar)) +
        field('Fecha de implante', textInput('hf-ei', 'fechaImplante', d.fechaImplante, 'date'))
    ) +
    '</div>'
  );
}

function stepExploracionHtml(d) {
  return (
    '<div class="hf-section hf-section--primary">' +
    sectionTitle('Datos generales') +
    row(field('PEEA', textInput('hf-ei', 'peea', d.peea))) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Exploración física') +
    exploracionHtml(d.exploracion) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('VExUS de ingreso') +
    vexusInicialHtml(d.vexusInicial) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('US pulmonar') +
    usPulmonarHtml(d.usPulmonar) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Rx tórax') +
    rxToraxHtml(d.rxTorax) +
    '</div>' +
    narrativeTextarea('hf-ei', 'ecgIngreso', d.ecgIngreso, 'ECG de ingreso')
  );
}

function stepFeviLabsHtml(d, c) {
  return (
    '<div class="hf-section hf-section--primary">' +
    sectionTitle('Datos generales') +
    row(
      field('FEVI estimada inicial', numberInput('hf-ei', 'feviEstimadaInicial', d.feviEstimadaInicial)) +
        field('Fenotipo', enumSelect('ea-cardio', 'fenotipo', c.fenotipo, FENOTIPOS))
    ) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Labs de ingreso') +
    labsIngresoHtml(d.labsIngreso) +
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
    '</div>' +
    narrativeTextarea('hf-ei', 'eventualidades', d.eventualidades, 'Eventualidades')
  );
}

/**
 * @param {number} step 0-based step index, clamped into range.
 * @param {Record<string, unknown>} d normalized evaluacionInicial
 * @param {{ etiologia?: string, fenotipo?: string }} c patient.cardio
 */
function stepBodyHtml(step, d, c) {
  if (step === 1) return stepHistoriaIcHtml(d, c);
  if (step === 2) return stepExploracionHtml(d);
  if (step === 3) return stepFeviLabsHtml(d, c);
  if (step === 4) return stepImpresionPlanHtml(d);
  return stepIdentificacionHtml(d);
}

function stepNavHtml(step) {
  var isFirst = step <= 0;
  var isLast = step >= EVALUACION_INICIAL_STEP_COUNT - 1;
  return (
    '<div class="hf-ei-step-nav" style="display:flex;justify-content:space-between;gap:8px;margin-top:12px">' +
    (isFirst
      ? '<span></span>'
      : '<button type="button" class="ea-btn" data-hf-ei-step-action="back">Atrás</button>') +
    (isLast
      ? '<span></span>'
      : '<button type="button" class="ea-btn ea-btn--primary" data-hf-ei-step-action="next">Siguiente</button>') +
    '</div>'
  );
}

/**
 * @param {Record<string, unknown>} evaluacionInicial normalized via
 *   `normalizeEvaluacionInicial()` (see the data file).
 * @param {{ etiologia?: string, fenotipo?: string }} cardio
 *   canonical top-level `patient.cardio` fields (etiología/fenotipo).
 * @param {number} [step] 0-based current step index (default 0).
 */
export function buildEvaluacionInicialHtml(evaluacionInicial, cardio, step) {
  var d = evaluacionInicial || {};
  var c = cardio || {};
  var s = Math.max(0, Math.min(EVALUACION_INICIAL_STEP_COUNT - 1, Number(step) || 0));
  return (
    '<div class="hf-ei-form rpc-form-stack">' +
    '<div class="hf-ei-step-head" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px">' +
    '<h3 class="ea-snapshot-zone-title" style="margin:0">' +
    escHtml(EVALUACION_INICIAL_STEP_TITLES[s]) +
    '</h3>' +
    '<span class="ea-muted">Paso ' +
    escHtml(String(s + 1)) +
    ' de ' +
    escHtml(String(EVALUACION_INICIAL_STEP_COUNT)) +
    '</span>' +
    '</div>' +
    '<div class="hf-ei-step-body">' +
    stepBodyHtml(s, d, c) +
    '</div>' +
    stepNavHtml(s) +
    '</div>'
  );
}
