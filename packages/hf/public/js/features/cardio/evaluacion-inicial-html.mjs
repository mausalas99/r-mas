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

export function field(labelText, inputHtml) {
  return (
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">' +
    escHtml(labelText) +
    '</span>' +
    inputHtml +
    '</label>'
  );
}

export function textInput(dataAttr, key, val, type) {
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

export function numberInput(dataAttr, key, val) {
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

export function sectionTitle(text) {
  return '<h4 class="hf-section-title">' + escHtml(text) + '</h4>';
}

// Collapsible variant of an `.hf-section`, using native <details>/<summary>
// (same mechanism as `estado-actual-med-block-html.mjs`'s `.ea-med-cat`
// blocks — no JS wiring needed, the browser handles the toggle). Starts
// expanded when the section already has data, so a returning user isn't
// hiding their own entries behind an extra click.
function collapsibleSection(title, bodyHtml, hasData) {
  return (
    '<details class="hf-section"' +
    (hasData ? ' open' : '') +
    '>' +
    '<summary class="hf-section-title">' +
    escHtml(title) +
    '</summary>' +
    bodyHtml +
    '</details>'
  );
}

export function row(html) {
  return '<div class="hf-ei-row hf-field-grid">' + html + '</div>';
}

function hasTratamientoPrevioData(t) {
  var d = t || {};
  return !!(d.ieca_ara || d.arni || d.sglt2 || d.arm || d.bb || d.asa || d.anticoagulante);
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

export function exploracionHtml(e) {
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

export function vexusInicialHtml(v) {
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

// US pulmonar and Rx tórax used to render their full 8-zone grid / checklist
// inline, which is what pushed the Exploración step past its one-screen
// budget (see the split-step comment above). Both now render as a compact
// card in the step body; the actual fields open in a modal (`data-hf-ei-modal-open`,
// wired in evaluacion-inicial-wire.mjs), same `.modal-backdrop`/`.modal` chrome
// used elsewhere in this codebase (see `lab.css`) rather than a new overlay
// system. US pulmonar's modal splits Derecho/Izquierdo into a two-tab toggle
// (`data-hf-ei-uspulmonar-side`) instead of the old side-by-side columns, so
// only 4 zones render at once.
function usPulmonarSideZonesHtml(campos, side) {
  var start = side === 'I' ? 4 : 0;
  return campos
    .slice(start, start + 4)
    .map(function (c, i) {
      return usPulmonarCampoHtml(c, start + i);
    })
    .join('');
}

function usPulmonarSideTabsHtml(side) {
  return (
    '<div class="hf-side-tabs" role="tablist">' +
    ['D', 'I']
      .map(function (v) {
        var active = v === side;
        return (
          '<button type="button" class="hf-side-tab' +
          (active ? ' is-active' : '') +
          '" data-hf-ei-uspulmonar-side="' +
          v +
          '" role="tab" aria-selected="' +
          (active ? 'true' : 'false') +
          '">' +
          (v === 'D' ? 'Derecho' : 'Izquierdo') +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}

export function usPulmonarModalBodyHtml(us, side) {
  var d = us || {};
  var campos = Array.isArray(d.campos) ? d.campos : [];
  var activeSide = side === 'I' ? 'I' : 'D';
  return (
    usPulmonarSideTabsHtml(activeSide) +
    '<div class="hf-lung-grid-col">' +
    usPulmonarSideZonesHtml(campos, activeSide) +
    '</div>' +
    narrativeTextarea('hf-ei-uspulmonar', 'nota', d.nota, 'Nota US pulmonar')
  );
}

export function usPulmonarCardHtml(us) {
  var nota = (us || {}).nota;
  return (
    '<button type="button" class="hf-ei-card" data-hf-ei-modal-open="usPulmonar">' +
    '<span class="hf-ei-card-title">US pulmonar</span>' +
    '<span class="hf-ei-card-sub">' +
    (nota ? escHtml(String(nota)) : 'Editar hallazgos por lado') +
    '</span>' +
    '</button>'
  );
}

// Chip-style checkbox (`.hf-chip-checkbox`) instead of a bare
// `<input type="checkbox">` label — same `data-hf-ei-rxtorax-hallazgo`
// attribute, only the visual wrapper changes, so `wireRxTorax` needs no edit.
function rxToraxHallazgoCheckboxHtml(opt, selected) {
  var checked = selected.indexOf(opt.value) >= 0;
  return (
    '<label class="hf-chip-checkbox">' +
    '<input type="checkbox" data-hf-ei-rxtorax-hallazgo="' +
    escAttr(opt.value) +
    '"' +
    (checked ? ' checked' : '') +
    '>' +
    '<span>' +
    escHtml(opt.label) +
    '</span>' +
    '</label>'
  );
}

export function rxToraxModalBodyHtml(rx) {
  var d = rx || {};
  var selected = Array.isArray(d.hallazgos) ? d.hallazgos : [];
  return (
    '<div class="hf-chip-row">' +
    RX_TORAX_HALLAZGOS.map(function (opt) { return rxToraxHallazgoCheckboxHtml(opt, selected); }).join('') +
    '</div>' +
    narrativeTextarea('hf-ei-rxtorax', 'nota', d.nota, 'Nota Rx tórax')
  );
}

function rxToraxSelectedLabels(rx) {
  var selected = Array.isArray((rx || {}).hallazgos) ? rx.hallazgos : [];
  if (!selected.length) return 'Editar hallazgos';
  return RX_TORAX_HALLAZGOS.filter(function (opt) {
    return selected.indexOf(opt.value) >= 0;
  })
    .map(function (opt) { return opt.label; })
    .join(', ');
}

export function rxToraxCardHtml(rx) {
  return (
    '<button type="button" class="hf-ei-card" data-hf-ei-modal-open="rxTorax">' +
    '<span class="hf-ei-card-title">Rx tórax</span>' +
    '<span class="hf-ei-card-sub">' +
    escHtml(rxToraxSelectedLabels(rx)) +
    '</span>' +
    '</button>'
  );
}

export function explorationModalHtml(modal, side, d) {
  if (!modal) return '';
  var title = modal === 'usPulmonar' ? 'US pulmonar' : 'Rx tórax';
  var body = modal === 'usPulmonar' ? usPulmonarModalBodyHtml(d.usPulmonar, side) : rxToraxModalBodyHtml(d.rxTorax);
  return (
    '<div class="modal-backdrop open" data-hf-ei-modal-backdrop>' +
    '<div class="modal hf-ei-modal" role="dialog" aria-modal="true" aria-label="' +
    escAttr(title) +
    '" onclick="event.stopPropagation()">' +
    '<header class="hf-ei-modal-head">' +
    '<h4>' +
    escHtml(title) +
    '</h4>' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-hf-ei-modal-action="close">Cerrar</button>' +
    '</header>' +
    '<div class="hf-ei-modal-body">' +
    body +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

var LABS_INGRESO_ROWS = [
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

// "Fecha de labs" moved up into the Datos generales row (see
// `stepFeviLabsHtml`) so it shares a row with FEVI/Fenotipo instead of
// sitting alone on its own row — trims one row's worth of vertical space.
export function labsIngresoNumbersHtml(labs) {
  var d = labs || {};
  return row(
    LABS_INGRESO_ROWS.map(function (r) {
      return field(r[1], numberInput('hf-ei-labs', r[0], d[r[0]]));
    }).join('')
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
  'VExUS de ingreso',
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
    collapsibleSection(
      'Tratamiento previo',
      tratamientoPrevioHtml(d.tratamientoPrevio),
      hasTratamientoPrevioData(d.tratamientoPrevio)
    ) +
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

// Exam findings only — VExUS de ingreso moved to its own step
// (`stepVexusIngresoHtml`), splitting the former ~1653px-overflow step in
// two (see the streamlining plan, section 4).
function stepExploracionHtml(d, modal, side) {
  return (
    '<div class="hf-section hf-section--primary">' +
    sectionTitle('Datos generales') +
    row(field('PEEA', textInput('hf-ei', 'peea', d.peea))) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Exploración física') +
    exploracionHtml(d.exploracion) +
    '</div>' +
    '<div class="hf-ei-card-row">' +
    usPulmonarCardHtml(d.usPulmonar) +
    rxToraxCardHtml(d.rxTorax) +
    '</div>' +
    narrativeTextarea('hf-ei', 'ecgIngreso', d.ecgIngreso, 'ECG de ingreso') +
    explorationModalHtml(modal, side, d)
  );
}

function stepVexusIngresoHtml(d) {
  return '<div class="hf-section hf-section--primary">' + sectionTitle('VExUS de ingreso') + vexusInicialHtml(d.vexusInicial) + '</div>';
}

function stepFeviLabsHtml(d, c) {
  var labs = d.labsIngreso || {};
  return (
    '<div class="hf-section hf-section--primary">' +
    sectionTitle('Datos generales') +
    row(
      field('FEVI estimada inicial', numberInput('hf-ei', 'feviEstimadaInicial', d.feviEstimadaInicial)) +
        field('Fenotipo', enumSelect('ea-cardio', 'fenotipo', c.fenotipo, FENOTIPOS)) +
        field('Fecha de labs', textInput('hf-ei-labs', 'fecha', labs.fecha, 'date'))
    ) +
    '</div>' +
    '<div class="hf-section">' +
    sectionTitle('Labs de ingreso') +
    labsIngresoNumbersHtml(d.labsIngreso) +
    '</div>'
  );
}

function stepImpresionPlanHtml(d) {
  return (
    narrativeTextarea('hf-ei', 'impresionDiagnostica', d.impresionDiagnostica, 'Impresión diagnóstica') +
    narrativeTextarea('hf-ei', 'planTerapeutico', d.planTerapeutico, 'Plan terapéutico') +
    collapsibleSection(
      'Diuresis y gasto urinario',
      row(
        field('Diuresis 2h post-bolo', numberInput('hf-ei', 'nau2hPostBolo', d.nau2hPostBolo)) +
          field('Gasto urinario 6h', numberInput('hf-ei', 'gastoUrinario6h', d.gastoUrinario6h))
      ),
      d.nau2hPostBolo != null && d.nau2hPostBolo !== '' || d.gastoUrinario6h != null && d.gastoUrinario6h !== ''
    ) +
    narrativeTextarea('hf-ei', 'eventualidades', d.eventualidades, 'Eventualidades')
  );
}

/**
 * @param {number} step 0-based step index, clamped into range.
 * @param {Record<string, unknown>} d normalized evaluacionInicial
 * @param {{ etiologia?: string, fenotipo?: string }} c patient.cardio
 */
function stepBodyHtml(step, d, c, modal, side) {
  if (step === 1) return stepHistoriaIcHtml(d, c);
  if (step === 2) return stepExploracionHtml(d, modal, side);
  if (step === 3) return stepVexusIngresoHtml(d);
  if (step === 4) return stepFeviLabsHtml(d, c);
  if (step === 5) return stepImpresionPlanHtml(d);
  return stepIdentificacionHtml(d);
}

/**
 * Clickable step pills — one per step, numbered, current step highlighted —
 * so the user can jump directly to any step instead of clicking Atrás/
 * Siguiente repeatedly. Not a linear gate: every pill is always clickable,
 * visited or not (see the task's "move quickly" requirement). Shares
 * `.hf-wizard-step*` with Consulta IC's own step wizard (converges on one
 * visual pattern — see `estado-actual.css`). Numbers only (not full titles)
 * to keep this a single compact row and not reopen the step-overflow issue
 * the step split itself fixed; the full title still shows in the step head.
 */
function stepPillsHtml(step) {
  return (
    '<div class="hf-wizard-steps" role="tablist" aria-label="Pasos">' +
    EVALUACION_INICIAL_STEP_TITLES.map(function (title, i) {
      var current = i === step;
      return (
        '<button type="button" class="hf-wizard-step' +
        (current ? ' is-current' : '') +
        '" data-hf-ei-step-jump="' +
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
 * @param {{modal?: 'usPulmonar'|'rxTorax'|null, side?: 'D'|'I'}} [modalState]
 *   which Exploración-step sub-modal (if any) is open, and its active side
 *   tab for US pulmonar — see `evaluacion-inicial-wire.mjs`.
 */
export function buildEvaluacionInicialHtml(evaluacionInicial, cardio, step, modalState) {
  var d = evaluacionInicial || {};
  var c = cardio || {};
  var s = Math.max(0, Math.min(EVALUACION_INICIAL_STEP_COUNT - 1, Number(step) || 0));
  var ms = modalState || {};
  return (
    '<div class="hf-ei-form rpc-form-stack">' +
    stepPillsHtml(s) +
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
    stepBodyHtml(s, d, c, ms.modal, ms.side) +
    '</div>' +
    stepNavHtml(s) +
    '</div>'
  );
}
