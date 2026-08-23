/**
 * Markup for the "Consulta IC" screen (Document 1 — outpatient HF follow-up
 * visit, Part C Phase 4). Sections follow the paper form's order, grouped
 * into a step wizard (same pattern as `evaluacion-inicial-html.mjs`) so the
 * user works through one screenful at a time instead of one long scroll.
 * Reuses `hf-field-kit.mjs` for every field primitive (tri-state, enum,
 * narrative, Previo/Actual table, comorbilidades rows) — no field markup is
 * reinvented here. Section chrome (`.hf-section`/`.hf-section-title`) and
 * field layout (`.hf-field-grid`) reuse the classes already defined in
 * `estado-actual.css` for `evaluacion-inicial-html.mjs`, not new CSS.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import {
  triSelect,
  enumSelect,
  narrativeTextarea,
  prevActualTable,
  comorbilidadListHtml,
} from './hf-field-kit.mjs';
import {
  FASES_SEGUIMIENTO,
  COMORBILIDADES,
  ESTADO_ESTUDIO,
  PERUGINI,
  ENFERMEDAD_CORONARIA_ESTADO,
  METODO_CORONARIO,
  ANTICOAGULANTES,
  ESTRATEGIA_FA,
  CHA2DS2VASC_RANGE,
  HASBLED_RANGE,
  TRASTORNO_SUENO,
  TRATAMIENTO_SUENO,
  STOPBANG_RANGE,
  SEVERIDAD_VALVULAR,
  TIPO_DISPOSITIVO,
  INDICACION_DISPOSITIVO,
  NYHA,
  VEXUS_GRADES,
  DOPPLER_SUPRAHEPATICO,
  PULSATILIDAD_PORTAL,
  DOPPLER_RENAL,
  LINEAS_B_CAMPO,
} from '../../../../lib/cardio/hf-enums.mjs';

// No IV/VO/Ambas list exists in hf-enums.mjs (checked) — built inline per the
// Phase 4 brief's fallback instruction. Flagged in the handoff report as a
// candidate to move into hf-enums.mjs later.
var ESCALO_DIURETICOS_VIA = [
  { value: 'IV', label: 'IV' },
  { value: 'VO', label: 'VO' },
  { value: 'Ambas', label: 'Ambas' },
];

function sectionDiv(title, bodyHtml, opts) {
  var primary = opts && opts.primary ? ' hf-section--primary' : '';
  return (
    '<div class="hf-section' + primary + '"><h4 class="hf-section-title">' + escHtml(title) + '</h4>' + bodyHtml + '</div>'
  );
}

function row(html) {
  return '<div class="hf-field-grid">' + html + '</div>';
}

function fieldHtml(labelText, controlHtml, wide) {
  return (
    '<label class="ea-field ea-field--inline"' +
    (wide ? ' style="grid-column:1/-1"' : '') +
    '><span class="ea-label">' +
    escHtml(labelText) +
    '</span>' +
    controlHtml +
    '</label>'
  );
}

/** @param {{ nombre?: string, registro?: string, expediente?: string, edad?: string|number }} patient */
export function renderConsultaIcIdentityHtml(patient) {
  var p = patient || {};
  var registro = p.registro || p.expediente || '';
  return (
    '<div class="hf-consulta-identity" style="display:flex;gap:16px;flex-wrap:wrap">' +
    '<div><span class="ea-snapshot-label">Nombre</span><div><b>' +
    escHtml(p.nombre || 'Paciente') +
    '</b></div></div>' +
    '<div><span class="ea-snapshot-label">Registro</span><div><b>' +
    escHtml(registro || '—') +
    '</b></div></div>' +
    '<div><span class="ea-snapshot-label">Edad</span><div><b>' +
    escHtml(p.edad != null && p.edad !== '' ? String(p.edad) : '—') +
    '</b></div></div>' +
    '</div>'
  );
}

/** @param {{ date: string, existingDates: string[] }} model */
export function renderVisitSelectorHtml(model) {
  var m = model || {};
  return (
    '<div class="hf-consulta-visit-selector" style="display:flex;align-items:center;gap:8px">' +
    '<label class="ea-field ea-field--inline"><span class="ea-label">Fecha de consulta</span>' +
    '<input type="date" class="ea-input" data-hf-consulta-date value="' +
    escAttr(m.date || '') +
    '"></label>' +
    (Array.isArray(m.existingDates) && m.existingDates.length
      ? '<span class="ea-muted">Visitas registradas: ' + escHtml(m.existingDates.join(', ')) + '</span>'
      : '<span class="ea-muted">Primera consulta registrada</span>') +
    '</div>'
  );
}

export function renderFaseComorbilidadesHtml(entry) {
  var e = entry || {};
  var body =
    row(
      fieldHtml('Fase de seguimiento', enumSelect('hf-consulta', 'faseSeguimiento', e.faseSeguimiento, FASES_SEGUIMIENTO)) +
        fieldHtml(
          'Contacto',
          '<input type="text" class="ea-input" data-hf-consulta="contacto" value="' + escAttr(e.contacto) + '">'
        )
    ) +
    '<div><span class="ea-label">Comorbilidades</span>' +
    comorbilidadListHtml(e.comorbilidades, COMORBILIDADES) +
    '</div>';
  return sectionDiv('Fase / Comorbilidades', body, { primary: true });
}

export function renderInternamientoHtml(entry) {
  var e = entry || {};
  var body = row(
    fieldHtml(
      'Último internamiento (fecha)',
      '<input type="date" class="ea-input" data-hf-consulta="ultimoInternamientoFecha" value="' +
        escAttr(e.ultimoInternamientoFecha) +
        '">'
    ) +
      fieldHtml(
        'Causa',
        '<input type="text" class="ea-input" data-hf-consulta="ultimoInternamientoCausa" value="' +
          escAttr(e.ultimoInternamientoCausa) +
          '">'
      ) +
      fieldHtml('Escalada de diuréticos (6m)', triSelect('hf-consulta-tri', 'escaloDiureticos6m', e.escaloDiureticos6m)) +
      fieldHtml('Vía', enumSelect('hf-consulta', 'escaloDiureticosVia', e.escaloDiureticosVia, ESCALO_DIURETICOS_VIA)) +
      fieldHtml(
        'Nota',
        '<input type="text" class="ea-input" data-hf-consulta="escaloDiureticosNota" value="' +
          escAttr(e.escaloDiureticosNota) +
          '">',
        true
      )
  );
  return sectionDiv('Último internamiento y escalada de diuréticos', body);
}

export function renderSubjetivoObjetivoHtml(entry) {
  var e = entry || {};
  var body = narrativeTextarea('hf-consulta', 'subjetivo', e.subjetivo, 'Subjetivo') + narrativeTextarea('hf-consulta', 'objetivo', e.objetivo, 'Objetivo');
  return sectionDiv('Subjetivo / Objetivo', body);
}

function workupField(labelText, section, field, val, options) {
  return fieldHtml(labelText, enumSelect('hf-workup', section + '.' + field, val, options));
}
function workupTri(labelText, section, field, val) {
  return fieldHtml(labelText, triSelect('hf-workup-tri', section + '.' + field, val));
}
function workupNum(labelText, section, field, val) {
  return fieldHtml(
    labelText,
    '<input type="number" step="any" class="ea-input" data-hf-workup="' +
      section +
      '.' +
      field +
      '" value="' +
      (val == null ? '' : escAttr(String(val))) +
      '">'
  );
}
function workupText(labelText, section, field, val) {
  return fieldHtml(
    labelText,
    '<input type="text" class="ea-input" data-hf-workup="' + section + '.' + field + '" value="' + escAttr(val) + '">'
  );
}

function workupGroup(title, bodyHtml) {
  return sectionDiv(title, row(bodyHtml));
}

export function renderWorkupHtml(workup) {
  var w = workup || {};
  var hierro = w.hierro || {};
  var tiroideo = w.tiroideo || {};
  var proteinuria = w.proteinuria || {};
  var amiloidosis = w.amiloidosis || {};
  var infiltracion = w.infiltracion || {};
  var coronaria = w.coronaria || {};
  var fa = w.fa || {};
  var sueno = w.sueno || {};
  var valvular = w.valvular || {};

  var body =
    workupGroup(
      'Hierro',
      workupField('Estado de estudio', 'hierro', 'estadoEstudio', hierro.estadoEstudio, ESTADO_ESTUDIO) +
        workupNum('Ferritina', 'hierro', 'ferritina', hierro.ferritina) +
        workupNum('Sat. transferrina', 'hierro', 'satTransferrina', hierro.satTransferrina) +
        workupTri('Deficiencia de hierro', 'hierro', 'deficienciaHierro', hierro.deficienciaHierro) +
        workupText('Tratamiento', 'hierro', 'tratamiento', hierro.tratamiento)
    ) +
    workupGroup(
      'Tiroideo',
      workupField('Estado de estudio', 'tiroideo', 'estadoEstudio', tiroideo.estadoEstudio, ESTADO_ESTUDIO) +
        workupNum('TSH', 'tiroideo', 'tsh', tiroideo.tsh) +
        workupNum('T4L', 'tiroideo', 't4l', tiroideo.t4l) +
        workupTri('Alteración', 'tiroideo', 'alteracion', tiroideo.alteracion)
    ) +
    workupGroup(
      'Proteinuria',
      workupField('Estado de estudio', 'proteinuria', 'estadoEstudio', proteinuria.estadoEstudio, ESTADO_ESTUDIO) +
        workupNum('Relación prot/Cr', 'proteinuria', 'relacionProtCr', proteinuria.relacionProtCr) +
        workupTri('Microalbuminuria', 'proteinuria', 'microalbuminuria', proteinuria.microalbuminuria)
    ) +
    workupGroup(
      'Amiloidosis',
      workupTri('Sospecha', 'amiloidosis', 'sospecha', amiloidosis.sospecha) +
        workupField('Estado de estudio', 'amiloidosis', 'estadoEstudio', amiloidosis.estadoEstudio, ESTADO_ESTUDIO) +
        workupField('Perugini', 'amiloidosis', 'perugini', amiloidosis.perugini, PERUGINI) +
        workupTri('Biopsia confirmada', 'amiloidosis', 'biopsiaConfirmada', amiloidosis.biopsiaConfirmada)
    ) +
    workupGroup(
      'Infiltración',
      workupTri('Sospecha', 'infiltracion', 'sospecha', infiltracion.sospecha) +
        workupField('Estado de estudio', 'infiltracion', 'estadoEstudio', infiltracion.estadoEstudio, ESTADO_ESTUDIO) +
        workupText('Nota', 'infiltracion', 'nota', infiltracion.nota)
    ) +
    workupGroup(
      'Enfermedad coronaria',
      workupField('Estado', 'coronaria', 'estado', coronaria.estado, ENFERMEDAD_CORONARIA_ESTADO) +
        workupField('Método', 'coronaria', 'metodo', coronaria.metodo, METODO_CORONARIO) +
        fieldHtml(
          'Fecha',
          '<input type="date" class="ea-input" data-hf-workup="coronaria.fecha" value="' + escAttr(coronaria.fecha) + '">'
        ) +
        workupText('Hallazgos', 'coronaria', 'hallazgos', coronaria.hallazgos)
    ) +
    workupGroup(
      'FA / Anticoagulación',
      workupTri('FA presente', 'fa', 'presente', fa.presente) +
        workupField('Estrategia', 'fa', 'estrategia', fa.estrategia, ESTRATEGIA_FA) +
        workupField('CHA₂DS₂-VASc', 'fa', 'cha2ds2vasc', fa.cha2ds2vasc, CHA2DS2VASC_RANGE) +
        workupField('HAS-BLED', 'fa', 'hasbled', fa.hasbled, HASBLED_RANGE) +
        workupField('Anticoagulante', 'fa', 'anticoagulante', fa.anticoagulante, ANTICOAGULANTES)
    ) +
    workupGroup(
      'Sueño',
      workupField('Trastorno', 'sueno', 'trastorno', sueno.trastorno, TRASTORNO_SUENO) +
        workupField('STOP-BANG', 'sueno', 'stopbang', sueno.stopbang, STOPBANG_RANGE) +
        workupField('Tratamiento', 'sueno', 'tratamiento', sueno.tratamiento, TRATAMIENTO_SUENO)
    ) +
    workupGroup(
      'Valvular',
      workupText('Lesión', 'valvular', 'lesion', valvular.lesion) +
        workupField('Severidad', 'valvular', 'severidad', valvular.severidad, SEVERIDAD_VALVULAR) +
        workupText('Nota', 'valvular', 'nota', valvular.nota)
    );
  return '<div class="hf-workup-group">' + body + '</div>';
}

var LAB_ROWS_DEF = [
  { key: 'cr', label: 'Creatinina', unit: 'mg/dL' },
  { key: 'tfge', label: 'TFGe', unit: 'mL/min' },
  { key: 'peso', label: 'Peso', unit: 'kg' },
  { key: 'k', label: 'K', unit: 'mEq/L' },
  { key: 'na', label: 'Na', unit: 'mEq/L' },
  { key: 'p', label: 'P', unit: 'mg/dL' },
  { key: 'mg', label: 'Mg', unit: 'mg/dL' },
  { key: 'alb', label: 'Albúmina', unit: 'g/dL' },
  { key: 'protTotales', label: 'Proteínas totales', unit: 'g/dL' },
  { key: 'bilTotal', label: 'Bilirrubina total', unit: 'mg/dL' },
  { key: 'bilDirecta', label: 'Bilirrubina directa', unit: 'mg/dL' },
  { key: 'fa', label: 'FA', unit: 'U/L' },
  { key: 'ggt', label: 'GGT', unit: 'U/L' },
  { key: 'ast', label: 'AST', unit: 'U/L' },
  { key: 'alt', label: 'ALT', unit: 'U/L' },
  { key: 'ldh', label: 'LDH', unit: 'U/L' },
  { key: 'colTotal', label: 'Colesterol total', unit: 'mg/dL' },
  { key: 'hdl', label: 'HDL', unit: 'mg/dL' },
  { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
  { key: 'tg', label: 'Triglicéridos', unit: 'mg/dL' },
  { key: 'protOrina', label: 'Proteína en orina', unit: 'mg/dL' },
  { key: 'ntProBnp', label: 'NT-proBNP', unit: 'pg/mL' },
  { key: 'troponina', label: 'Troponina', unit: 'ng/L' },
];
export { LAB_ROWS_DEF };

function newEntryNumField(dataAttr, r, val) {
  return fieldHtml(
    r.label + (r.unit ? ' (' + r.unit + ')' : ''),
    '<input type="number" step="any" class="ea-input" data-' +
      dataAttr +
      '="' +
      r.key +
      '" value="' +
      (val == null ? '' : escAttr(String(val))) +
      '">'
  );
}

export function renderLabsHtml(model) {
  var m = model || {};
  var previoVals = (m.previo && m.previo.values) || {};
  var actualVals = (m.actual && m.actual.values) || {};
  var table = prevActualTable(LAB_ROWS_DEF, previoVals, actualVals);
  var draft = m.draft || {};
  var newFields = row(
    LAB_ROWS_DEF.map(function (r) {
      return newEntryNumField('hf-lab-new', r, draft[r.key]);
    }).join('')
  );
  var body =
    table +
    '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-hf-lab-action="prefill">Prefill desde laboratorios importados</button>' +
    '</div>' +
    sectionDiv(
      'Nueva medición',
      row(fieldHtml('Fecha', '<input type="date" class="ea-input" data-hf-lab-new="date" value="' + escAttr(draft.date) + '">')) +
        newFields +
        '<div style="margin-top:8px"><button type="button" class="ea-btn" data-hf-lab-action="save">Guardar medición</button></div>'
    );
  return sectionDiv('Labs Previo / Actual', body);
}

var ECHO_NUM_FIELDS = [
  ['fevi', 'FEVI', '%'],
  ['vfdvi', 'VFDVI', 'mL'],
  ['vfsvi', 'VFSVI', 'mL'],
  ['septumIvd', 'Septum IVD', 'mm'],
  ['dvid', 'DVID', 'mm'],
  ['ppvid', 'PPVID', 'mm'],
  ['gpr', 'GPR', ''],
  ['volAiIndex', 'Vol. AI indexado', 'mL/m²'],
  ['areaAd', 'Área AD', 'cm²'],
  ['diametroVd', 'Diámetro VD', 'mm'],
  ['itVmax', 'IT Vmax', 'm/s'],
  ['pad', 'PAD', 'mmHg'],
  ['tapse', 'TAPSE', 'mm'],
  ['psap', 'PSAP', 'mmHg'],
  ['tapsePsap', 'TAPSE/PSAP', ''],
  ['vciMm', 'VCI', 'mm'],
  ['jvdRatio', 'Ratio JVD', ''],
];
var ECHO_ROWS_DEF = ECHO_NUM_FIELDS.map(function (f) {
  return { key: f[0], label: f[1], unit: f[2] };
}).concat([
  { key: 'it', label: 'IT' },
  { key: 'im', label: 'IM' },
  { key: 'iao', label: 'IAo' },
  { key: 'ip', label: 'IP' },
  { key: 'estenosis', label: 'Estenosis' },
  { key: 'estenosisSeveridad', label: 'Severidad estenosis' },
  { key: 'vciColapso', label: 'Colapso VCI' },
  { key: 'dopplerHepaticas', label: 'Doppler suprahepático' },
  { key: 'pulsatilidadPorta', label: 'Pulsatilidad portal' },
  { key: 'dopplerRenal', label: 'Doppler renal' },
  { key: 'vexus', label: 'VExUS' },
  { key: 'patronPulmonar', label: 'Patrón pulmonar' },
  { key: 'lineasBPorCampo', label: 'Líneas B por campo' },
]);
export { ECHO_ROWS_DEF };

export function renderEchoHtml(model) {
  var m = model || {};
  var previoVals = m.previo || {};
  var actualVals = m.actual || {};
  var table = prevActualTable(ECHO_ROWS_DEF, previoVals, actualVals);
  var draft = m.draft || {};
  var numFields = ECHO_NUM_FIELDS.map(function (f) {
    return newEntryNumField('hf-echo-new', { key: f[0], label: f[1], unit: f[2] }, draft[f[0]]);
  }).join('');
  var enumFields =
    fieldHtml('IT', enumSelect('hf-echo-new', 'it', draft.it, SEVERIDAD_VALVULAR)) +
    fieldHtml('IM', enumSelect('hf-echo-new', 'im', draft.im, SEVERIDAD_VALVULAR)) +
    fieldHtml('IAo', enumSelect('hf-echo-new', 'iao', draft.iao, SEVERIDAD_VALVULAR)) +
    fieldHtml('IP', enumSelect('hf-echo-new', 'ip', draft.ip, SEVERIDAD_VALVULAR)) +
    fieldHtml(
      'Estenosis',
      '<input type="text" class="ea-input" data-hf-echo-new="estenosis" value="' + escAttr(draft.estenosis) + '">'
    ) +
    fieldHtml('Severidad estenosis', enumSelect('hf-echo-new', 'estenosisSeveridad', draft.estenosisSeveridad, SEVERIDAD_VALVULAR)) +
    fieldHtml(
      'Colapso VCI',
      '<input type="text" class="ea-input" data-hf-echo-new="vciColapso" value="' + escAttr(draft.vciColapso) + '">'
    ) +
    fieldHtml('Doppler suprahepático', enumSelect('hf-echo-new', 'dopplerHepaticas', draft.dopplerHepaticas, DOPPLER_SUPRAHEPATICO)) +
    fieldHtml('Pulsatilidad portal', enumSelect('hf-echo-new', 'pulsatilidadPorta', draft.pulsatilidadPorta, PULSATILIDAD_PORTAL)) +
    fieldHtml('Doppler renal', enumSelect('hf-echo-new', 'dopplerRenal', draft.dopplerRenal, DOPPLER_RENAL)) +
    fieldHtml('VExUS', enumSelect('hf-echo-new', 'vexus', draft.vexus, VEXUS_GRADES)) +
    fieldHtml(
      'Patrón pulmonar',
      '<input type="text" class="ea-input" data-hf-echo-new="patronPulmonar" value="' + escAttr(draft.patronPulmonar) + '">'
    ) +
    fieldHtml('Líneas B por campo', enumSelect('hf-echo-new', 'lineasBPorCampo', draft.lineasBPorCampo, LINEAS_B_CAMPO));
  var body =
    table +
    sectionDiv(
      'Nuevo estudio',
      row(
        fieldHtml('Fecha', '<input type="date" class="ea-input" data-hf-echo-new="date" value="' + escAttr(draft.date) + '">') +
          numFields +
          enumFields
      ) +
        narrativeTextarea('hf-echo-new', 'nota', draft.nota, 'Nota') +
        '<div style="margin-top:8px"><button type="button" class="ea-btn" data-hf-echo-action="save">Guardar estudio</button></div>'
    );
  return sectionDiv('Eco Previo / Actual', body);
}

export function renderEcgHtml(entry) {
  var e = entry || {};
  var body =
    narrativeTextarea('hf-consulta', 'ekgDescripcion', e.ekgDescripcion, 'Descripción') +
    row(
      fieldHtml(
        'Fecha',
        '<input type="date" class="ea-input" data-hf-consulta="ekgFecha" value="' + escAttr(e.ekgFecha) + '">'
      ) + fieldHtml('¿Es previo?', triSelect('hf-consulta-tri', 'ekgEsPrevio', e.ekgEsPrevio))
    );
  return sectionDiv('ECG', body);
}

export function renderDeviceHtml(device) {
  var d = device || {};
  var body = row(
    fieldHtml('¿Tiene indicación?', triSelect('hf-device-tri', 'tieneIndicacion', d.tieneIndicacion)) +
      fieldHtml('Indicación', enumSelect('hf-device', 'indicacion', d.indicacion, INDICACION_DISPOSITIVO)) +
      fieldHtml(
        'Nota de indicación',
        '<input type="text" class="ea-input" data-hf-device="indicacionNota" value="' + escAttr(d.indicacionNota) + '">'
      ) +
      fieldHtml('¿Colocado?', triSelect('hf-device-tri', 'colocado', d.colocado)) +
      fieldHtml('Tipo', enumSelect('hf-device', 'tipo', d.tipo, TIPO_DISPOSITIVO)) +
      fieldHtml(
        'Fecha de colocación',
        '<input type="date" class="ea-input" data-hf-device="fechaColocacion" value="' + escAttr(d.fechaColocacion) + '">'
      ) +
      fieldHtml(
        'Fecha última revisión',
        '<input type="date" class="ea-input" data-hf-device="fechaUltimaRevision" value="' + escAttr(d.fechaUltimaRevision) + '">'
      ) +
      fieldHtml(
        'Parámetros',
        '<input type="text" class="ea-input" data-hf-device="parametros" value="' + escAttr(d.parametros) + '">',
        true
      )
  );
  return sectionDiv('Dispositivo', body);
}

var SCORE_ROWS_DEF = [
  { key: 'nyha', label: 'NYHA' },
  { key: 'mlwhfq', label: 'MLWHFQ' },
  { key: 'kccq', label: 'KCCQ' },
  { key: 'sixMwtMeters', label: '6MWT', unit: 'm' },
  { key: 'maggic', label: 'MAGGIC' },
  { key: 'shfm', label: 'SHFM' },
  { key: 'hfss', label: 'HFSS' },
];
export { SCORE_ROWS_DEF };

export function renderScoresHtml(model) {
  var m = model || {};
  var table = prevActualTable(SCORE_ROWS_DEF, m.previo, m.actual);
  var draft = m.draft || {};
  var numFields = SCORE_ROWS_DEF.filter(function (r) {
    return r.key !== 'nyha';
  })
    .map(function (r) {
      return newEntryNumField('hf-score-new', r, draft[r.key]);
    })
    .join('');
  var body =
    table +
    sectionDiv(
      'Nuevo registro',
      row(
        fieldHtml('Fecha', '<input type="date" class="ea-input" data-hf-score-new="date" value="' + escAttr(draft.date) + '">') +
          fieldHtml('NYHA', enumSelect('hf-score-new', 'nyha', draft.nyha, NYHA)) +
          numFields
      ) +
        '<div style="margin-top:8px"><button type="button" class="ea-btn" data-hf-score-action="save">Guardar score</button></div>'
    );
  return sectionDiv('Scores Previo / Actual', body);
}

/** @param {Array<{className: string, drug: string, dosis: string}>} fantasticos */
function fantasticosReadOnlyHtml(fantasticos) {
  var list = Array.isArray(fantasticos) ? fantasticos : [];
  if (!list.length) return '<p class="ea-muted">Sin GDMT registrado.</p>';
  var rows = list
    .map(function (f) {
      return (
        '<tr><td>' +
        escHtml(f.className) +
        '</td><td>' +
        escHtml(f.drug || '—') +
        '</td><td>' +
        escHtml(f.dosis || '—') +
        '</td></tr>'
      );
    })
    .join('');
  return (
    '<table class="hf-prev-actual-table"><thead><tr><th>Clase</th><th>Fármaco</th><th>Dosis</th></tr></thead><tbody>' +
    rows +
    '</tbody></table>'
  );
}

var GDMT_TOLERADA_FIELDS = [
  ['ieca_ara', 'IECA/ARA'],
  ['arni', 'ARNI'],
  ['sglt2', 'SGLT2i'],
  ['arm', 'ARM'],
  ['bb', 'Betabloqueador'],
  ['asa', 'AAS'],
];

/**
 * @param {Array<any>} fantasticos read-only
 * @param {Record<string, boolean|null>} gdmtMaxTolerada per-visit tri flags
 */
export function renderTratamientoActualHtml(fantasticos, gdmtMaxTolerada) {
  var gdmt = gdmtMaxTolerada || {};
  var toleradaFields = GDMT_TOLERADA_FIELDS.map(function (f) {
    return fieldHtml('¿' + f[1] + ' a dosis máxima tolerada?', triSelect('hf-consulta-gdmt', f[0], gdmt[f[0]]));
  }).join('');
  var body = fantasticosReadOnlyHtml(fantasticos) + row(toleradaFields);
  return sectionDiv('Tratamiento actual', body);
}

export function renderApreciativoPlanHtml(entry) {
  var e = entry || {};
  var body = narrativeTextarea('hf-consulta', 'apreciativo', e.apreciativo, 'Apreciativo') + narrativeTextarea('hf-consulta', 'plan', e.plan, 'Plan');
  return sectionDiv('Apreciativo / Plan', body);
}

/**
 * Step wizard: paper-form order is preserved, only grouped into windows that
 * each fit one screen without a long page-scroll (mirrors
 * `evaluacion-inicial-html.mjs`'s step grouping).
 */
export var CONSULTA_IC_STEP_TITLES = [
  'Fase, comorbilidades e internamiento',
  'Workup',
  'Labs',
  'Eco, ECG y dispositivo',
  'Scores y tratamiento',
  'Apreciativo y plan',
];
export var CONSULTA_IC_STEP_COUNT = CONSULTA_IC_STEP_TITLES.length;

function stepBodyHtml(step, c, e) {
  if (step === 1) return renderWorkupHtml(c.workup);
  if (step === 2) return renderLabsHtml(c.labs);
  if (step === 3) return renderEchoHtml(c.echo) + renderEcgHtml(e) + renderDeviceHtml(c.device);
  if (step === 4) return renderScoresHtml(c.scores) + renderTratamientoActualHtml(c.fantasticos, e.gdmtMaxTolerada);
  if (step === 5) return renderApreciativoPlanHtml(e);
  return renderFaseComorbilidadesHtml(e) + renderInternamientoHtml(e) + renderSubjetivoObjetivoHtml(e);
}

function stepNavHtml(step) {
  var isFirst = step <= 0;
  var isLast = step >= CONSULTA_IC_STEP_COUNT - 1;
  return (
    '<div class="hf-consulta-step-nav" style="display:flex;justify-content:space-between;gap:8px;margin-top:12px">' +
    (isFirst
      ? '<span></span>'
      : '<button type="button" class="ea-btn" data-hf-consulta-step-action="back">Atrás</button>') +
    (isLast
      ? '<span></span>'
      : '<button type="button" class="ea-btn ea-btn--primary" data-hf-consulta-step-action="next">Siguiente</button>') +
    '</div>'
  );
}

/**
 * @param {{
 *   patient: any,
 *   entry: any,
 *   existingDates: string[],
 *   workup: any,
 *   device: any,
 *   labs: { previo: any, actual: any, draft: any },
 *   echo: { previo: any, actual: any, draft: any },
 *   scores: { previo: any, actual: any, draft: any },
 *   fantasticos: any[],
 *   step?: number,
 * }} ctx
 */
export function renderConsultaIcHtml(ctx) {
  var c = ctx || {};
  var e = c.entry || {};
  var s = Math.max(0, Math.min(CONSULTA_IC_STEP_COUNT - 1, Number(c.step) || 0));
  return (
    '<div class="hf-consulta-ic rpc-form-stack">' +
    renderConsultaIcIdentityHtml(c.patient) +
    renderVisitSelectorHtml({ date: e.date, existingDates: c.existingDates }) +
    '<div class="hf-consulta-step-head" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:8px 0">' +
    '<h3 class="ea-snapshot-zone-title" style="margin:0">' +
    escHtml(CONSULTA_IC_STEP_TITLES[s]) +
    '</h3>' +
    '<span class="ea-muted">Paso ' +
    escHtml(String(s + 1)) +
    ' de ' +
    escHtml(String(CONSULTA_IC_STEP_COUNT)) +
    '</span>' +
    '</div>' +
    stepBodyHtml(s, c, e) +
    stepNavHtml(s) +
    '</div>'
  );
}
