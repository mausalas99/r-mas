/**
 * Markup for the "Consulta IC" screen (Document 1 — outpatient HF follow-up
 * visit, Part C Phase 4). An 8-step wizard matching the paper form's real
 * sections (not one step per long table/list — a 32-step version of this
 * was tried and rejected as too tedious). Long content that would otherwise
 * overflow a step is absorbed by three tools instead of paging:
 *  - an in-step tab/segmented control (workup's 9 subsystems, step 3),
 *  - a collapsed `<details>` accordion (comorbilidades, TMO, apreciativo —
 *    same pattern as `.ea-med-cat` in `estado-actual-med-block-html.mjs`),
 *  - a "glance card → modal" pattern for the Previo/Actual tables and entry
 *    forms that are simply too big for any step (labs, echo, scores): a
 *    small card shows headline values inline, click opens a modal with the
 *    full table/form. No scroll in either axis anywhere, including inside
 *    a modal — a still-too-tall table is split into side-by-side columns
 *    instead (`prevActualTableColumns` in `hf-field-kit.mjs`).
 * Reuses `hf-field-kit.mjs` for every field primitive and the modal shell
 * classes already defined for the Congestión/POCUS modal
 * (`.modal-backdrop`/`.modal.ea-registro-modal`/`.ea-registro-modal-*`) —
 * see `.hf-consulta-modal` in `estado-actual.css` for the width override.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { cardioImageAttachHtml } from './cardio-image-attach.mjs';
import {
  triSelect,
  enumSelect,
  narrativeTextarea,
  prevActualTable,
  prevActualTableColumns,
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
  SEVERIDAD_SINTOMA,
  EDEMA_MI_GRADO,
  TIPO_DISPOSITIVO,
  INDICACION_DISPOSITIVO,
  NYHA,
  VEXUS_GRADES,
  DOPPLER_SUPRAHEPATICO,
  PULSATILIDAD_PORTAL,
  DOPPLER_RENAL,
  LINEAS_B_CAMPO,
  CAUSA_REINGRESO,
  CAUSA_MUERTE,
  TITULACION_DOSIS,
} from '../../../../lib/cardio/hf-enums.mjs';
import { ntProBnpPercentChange } from '../../../../lib/cardio/hf-labs.mjs';
import { parseTriState } from './consulta-ic-data.mjs';

// No IV/VO/Ambas list exists in hf-enums.mjs (checked) — built inline per the
// Phase 4 brief's fallback instruction. Flagged in the handoff report as a
// candidate to move into hf-enums.mjs later.
var ESCALO_DIURETICOS_VIA = [
  { value: 'IV', label: 'IV' },
  { value: 'VO', label: 'VO' },
  { value: 'Ambas', label: 'Ambas' },
];

// No Normal/Anormal list exists in hf-enums.mjs either — same inline pattern
// as ESCALO_DIURETICOS_VIA, only used by the Objetivo exam checklist below.
var RUIDOS_CARDIACOS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Anormal', label: 'Anormal' },
];

function sectionDiv(title, bodyHtml, opts) {
  var primary = opts && opts.primary ? ' hf-section--primary' : '';
  return (
    '<div class="hf-section' + primary + '"><h4 class="hf-section-title">' + escHtml(title) + '</h4>' + bodyHtml + '</div>'
  );
}

/**
 * Same `.hf-section` chrome as `sectionDiv`, but collapsed behind native
 * `<details>`/`<summary>` (same pattern as `.ea-med-cat` in
 * `estado-actual-med-block-html.mjs`) — starts open only when the group
 * already has data, so a secondary field-group can be tucked away to save
 * vertical space without hiding data the user already entered.
 */
function collapsibleSectionDiv(title, bodyHtml, hasData) {
  return (
    '<details class="hf-section"' +
    (hasData ? ' open' : '') +
    '><summary class="hf-section-title">' +
    escHtml(title) +
    '</summary><div class="hf-collapse-body">' +
    bodyHtml +
    '</div></details>'
  );
}

/** Same as `collapsibleSectionDiv` but without the `.hf-section` box chrome
 * (border/padding/background) — for nesting a toggle inside a section that
 * already has that chrome, so the toggle doesn't render as a box-in-a-box. */
function collapsibleInline(title, bodyHtml, hasData) {
  return (
    '<details' +
    (hasData ? ' open' : '') +
    '><summary class="hf-section-title">' +
    escHtml(title) +
    '</summary><div class="hf-collapse-body">' +
    bodyHtml +
    '</div></details>'
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
    '<input type="date" class="ea-input rpc-date-input" data-hf-consulta-date value="' +
    escAttr(m.date || '') +
    '"></label>' +
    (Array.isArray(m.existingDates) && m.existingDates.length
      ? '<span class="ea-muted">Visitas registradas: ' + escHtml(m.existingDates.join(', ')) + '</span>'
      : '<span class="ea-muted">Primera consulta registrada</span>') +
    '</div>'
  );
}

// ---------------------------------------------------------------------
// Paso 1 — Fase de seguimiento + Comorbilidades
// ---------------------------------------------------------------------

export function renderFaseHtml(entry) {
  var e = entry || {};
  var body = row(
    fieldHtml('Fase de seguimiento', enumSelect('hf-consulta', 'faseSeguimiento', e.faseSeguimiento, FASES_SEGUIMIENTO)) +
      fieldHtml(
        'Contacto',
        '<input type="text" class="ea-input" data-hf-consulta="contacto" value="' + escAttr(e.contacto) + '">'
      )
  );
  return sectionDiv('Fase de seguimiento', body, { primary: true });
}

/** Collapsed by default (native `<details>`) — starts open only when the
 * patient already has comorbilidades recorded. */
export function renderComorbilidadesHtml(entry) {
  var e = entry || {};
  var rows = Array.isArray(e.comorbilidades) ? e.comorbilidades : [];
  var body = comorbilidadListHtml(e.comorbilidades, COMORBILIDADES);
  return collapsibleSectionDiv('Comorbilidades', body, rows.length > 0);
}

export function renderFaseComorbilidadesStepHtml(entry) {
  return renderFaseHtml(entry) + renderComorbilidadesHtml(entry);
}

// ---------------------------------------------------------------------
// Paso 2 — Último internamiento + Reingreso/desenlaces (colapsable) +
// Subjetivo/Objetivo
// ---------------------------------------------------------------------

export function renderInternamientoHtml(entry) {
  var e = entry || {};
  var body = row(
    fieldHtml(
      'Último internamiento (fecha)',
      '<input type="date" class="ea-input rpc-date-input" data-hf-consulta="ultimoInternamientoFecha" value="' +
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
          '">'
      )
  );
  return sectionDiv('Último internamiento y escalada de diuréticos', body);
}

/** TA is stored as one string field (`entry.ta`, e.g. "120/80") but entered
 * as two side-by-side number inputs (sistólica/diastólica) — see
 * `handleConsultaTaChange` in consulta-ic-wire.mjs, which reads both
 * siblings on change and joins them back into the single stored field. */
function taFieldHtml(entry) {
  var e = entry || {};
  var parts = String(e.ta || '').split('/');
  var sis = parts[0] || '';
  var dia = parts[1] || '';
  return fieldHtml(
    'TA',
    '<div style="display:flex;align-items:center;gap:4px">' +
      '<input type="number" step="any" class="ea-input" data-hf-consulta-ta="sistolica" value="' + escAttr(sis) + '">' +
      '<span>/</span>' +
      '<input type="number" step="any" class="ea-input" data-hf-consulta-ta="diastolica" value="' + escAttr(dia) + '">' +
      '</div>'
  );
}

function reingresoDesenlacesBody(entry) {
  var e = entry || {};
  return row(
    taFieldHtml(e) +
      fieldHtml('Reingreso hospitalario', triSelect('hf-consulta-tri', 'reingresoHospitalario', e.reingresoHospitalario)) +
      fieldHtml('Causa del reingreso', enumSelect('hf-consulta', 'causaReingreso', e.causaReingreso, CAUSA_REINGRESO)) +
      fieldHtml('Muerte', triSelect('hf-consulta-tri', 'muerte', e.muerte)) +
      fieldHtml('Causa de muerte', enumSelect('hf-consulta', 'causaMuerte', e.causaMuerte, CAUSA_MUERTE)) +
      fieldHtml(
        'Especificar causa de muerte',
        '<input type="text" class="ea-input" data-hf-consulta="causaMuerteNota" value="' + escAttr(e.causaMuerteNota) + '">'
      )
  );
}

function reingresoDesenlacesHasData(entry) {
  var e = entry || {};
  return (
    !!(e.ta && String(e.ta).trim()) ||
    e.reingresoHospitalario != null ||
    !!e.causaReingreso ||
    e.muerte != null ||
    !!e.causaMuerte ||
    !!(e.causaMuerteNota && String(e.causaMuerteNota).trim())
  );
}

/** Collapsed by default (used where this shares a step with other content);
 * `renderReingresoTmoStepHtml` below renders it always-open instead, since
 * on its own dedicated step there's no need to hide it behind a toggle. */
export function renderReingresoDesenlacesHtml(entry) {
  return collapsibleSectionDiv('Reingreso y desenlaces', reingresoDesenlacesBody(entry), reingresoDesenlacesHasData(entry));
}

// ---------------------------------------------------------------------
// Subjetivo/Objetivo — structured checklists (north star: "structured over
// free text"). A pre-existing entry whose subjetivo/objetivo is still the
// old free-text string (legacy data, or any test/demo patient recorded
// before this change) is shown read-only instead of parsed into checkboxes
// — see `mergeNarrativeObject` in `consulta-seguimiento.mjs` for how it
// becomes structured the first time a checklist field is actually edited.
// ---------------------------------------------------------------------

var SUBJETIVO_SINTOMA_FIELDS = [
  ['disneaEsfuerzo', 'Disnea de esfuerzo'],
  ['disneaReposo', 'Disnea de reposo'],
  ['ortopnea', 'Ortopnea'],
  ['edema', 'Edema (referido)'],
  ['fatiga', 'Fatiga'],
  ['palpitaciones', 'Palpitaciones'],
];

function legacyNarrativeHtml(label, text) {
  return (
    '<div class="hf-legacy-narrative">' +
    '<span class="ea-label">' +
    escHtml(label) +
    ' (texto libre previo, solo lectura)</span>' +
    '<p class="ea-muted" style="margin:2px 0 0">' +
    escHtml(text) +
    '</p>' +
    '</div>'
  );
}

/** NYHA is entered once, in the Scores step (`cardio.scores[].nyha`) — shown
 * here read-only so the resident sees it without re-entering it and it
 * stays the single source of truth. `scores` is `ctx.scores` from
 * `renderConsultaIcHtml` (`{ previo, actual, draft }`). */
function subjetivoNyhaGlanceHtml(scores) {
  var actual = (scores && scores.actual) || {};
  var nyha = actual.nyha ? String(actual.nyha) : '—';
  return (
    '<div class="hf-consulta-nyha-glance">' +
    '<span class="ea-snapshot-label">NYHA actual</span> <b>' +
    escHtml(nyha) +
    '</b>' +
    '<span class="ea-muted"> (editar en el paso "Labs y Scores")</span>' +
    '</div>'
  );
}

/** Compact, unlabeled "Nota" input (placeholder instead of a label line) —
 * saves the ~20px label row that `fieldHtml`'s own "Nota" label would add,
 * which is what pushed this step ~28px over budget (confirmed via the
 * `run` skill). */
function notaInputHtml(dataAttr, val) {
  return (
    '<input type="text" class="ea-input" placeholder="Nota (opcional)" data-' +
    dataAttr +
    '="nota" value="' +
    escAttr(val) +
    '" style="width:100%;margin-top:2px">'
  );
}

function subjetivoChecklistHtml(subjetivo) {
  var s = subjetivo || {};
  var fields = SUBJETIVO_SINTOMA_FIELDS.map(function (f) {
    return fieldHtml(f[1], enumSelect('hf-consulta-subj', f[0], s[f[0]], SEVERIDAD_SINTOMA));
  }).join('');
  return row(fields) + notaInputHtml('hf-consulta-subj', s.nota);
}

function objetivoChecklistHtml(objetivo, entry) {
  var o = objetivo || {};
  var e = entry || {};
  var body = row(
    fieldHtml('Ingurgitación yugular', triSelect('hf-consulta-obj-tri', 'ingurgitacionYugular', o.ingurgitacionYugular)) +
      fieldHtml('Ruidos cardiacos', enumSelect('hf-consulta-obj', 'ruidosCardiacos', o.ruidosCardiacos, RUIDOS_CARDIACOS)) +
      fieldHtml('Estertores', triSelect('hf-consulta-obj-tri', 'estertores', o.estertores)) +
      fieldHtml('Edema MI', enumSelect('hf-consulta-obj', 'edemaMi', o.edemaMi, EDEMA_MI_GRADO)) +
      fieldHtml(
        'TA (paso Reingreso)',
        '<span class="ea-muted">' + (e.ta == null || e.ta === '' ? '—' : escHtml(String(e.ta))) + '</span>'
      ) +
      fieldHtml('FC', '<input type="number" step="any" class="ea-input" data-hf-consulta-obj="fc" value="' + escAttr(o.fc) + '">')
  );
  return body + notaInputHtml('hf-consulta-obj', o.nota);
}

/** @param {any} entry @param {{ previo: any, actual: any, draft: any }} [scores] `ctx.scores` */
export function renderSubjetivoObjetivoHtml(entry, scores) {
  var e = entry || {};
  var isLegacySubjetivo = typeof e.subjetivo === 'string';
  var isLegacyObjetivo = typeof e.objetivo === 'string';
  var subjetivoBody = isLegacySubjetivo
    ? legacyNarrativeHtml('Subjetivo', e.subjetivo)
    : subjetivoNyhaGlanceHtml(scores) + subjetivoChecklistHtml(e.subjetivo);
  var objetivoBody = isLegacyObjetivo ? legacyNarrativeHtml('Objetivo', e.objetivo) : objetivoChecklistHtml(e.objetivo, e);
  // Side by side (not stacked) — same "two columns instead of stacked" move
  // as `renderEcoStepHtml`'s ECG/Dispositivo split: stacked, Subjetivo +
  // Objetivo's checklists measured ~246px over budget live (confirmed via
  // the `run` skill). Side by side replaces the sum of both sections'
  // heights with the max of the two, even though each section wraps to more
  // rows at half width.
  return (
    '<div class="hf-consulta-subjobj-cols" style="display:flex;gap:12px;align-items:flex-start">' +
    '<div style="flex:1 1 0;min-width:0">' +
    sectionDiv('Subjetivo', subjetivoBody) +
    '</div><div style="flex:1 1 0;min-width:0">' +
    sectionDiv('Objetivo', objetivoBody) +
    '</div></div>'
  );
}

export function renderInternamientoStepHtml(entry, scores) {
  return renderInternamientoHtml(entry) + renderSubjetivoObjetivoHtml(entry, scores);
}

/** Paso 7 — Reingreso y desenlaces (visible; it's a dedicated step now, no
 * need to hide it behind a toggle here) + TMO y apego (still collapsible,
 * closed unless it has data). */
export function renderReingresoTmoStepHtml(entry) {
  return sectionDiv('Reingreso y desenlaces', reingresoDesenlacesBody(entry)) + renderTmoHtml(entry);
}

// ---------------------------------------------------------------------
// Paso 3 — Workup: 9 subsystems as an in-step segmented control (one
// subsystem's short form visible at a time — content swap, no step
// advance, no page transition).
// ---------------------------------------------------------------------

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

var WORKUP_GROUPS = [
  {
    title: 'Hierro',
    html: function (w) {
      var hierro = (w && w.hierro) || {};
      return row(
        workupField('Estado de estudio', 'hierro', 'estadoEstudio', hierro.estadoEstudio, ESTADO_ESTUDIO) +
          workupNum('Ferritina', 'hierro', 'ferritina', hierro.ferritina) +
          workupNum('Sat. transferrina', 'hierro', 'satTransferrina', hierro.satTransferrina) +
          workupTri('Deficiencia de hierro', 'hierro', 'deficienciaHierro', hierro.deficienciaHierro) +
          workupText('Tratamiento', 'hierro', 'tratamiento', hierro.tratamiento)
      );
    },
  },
  {
    title: 'Tiroideo',
    html: function (w) {
      var tiroideo = (w && w.tiroideo) || {};
      return row(
        workupField('Estado de estudio', 'tiroideo', 'estadoEstudio', tiroideo.estadoEstudio, ESTADO_ESTUDIO) +
          workupNum('TSH', 'tiroideo', 'tsh', tiroideo.tsh) +
          workupNum('T4L', 'tiroideo', 't4l', tiroideo.t4l) +
          workupTri('Alteración', 'tiroideo', 'alteracion', tiroideo.alteracion)
      );
    },
  },
  {
    title: 'Proteinuria',
    html: function (w) {
      var proteinuria = (w && w.proteinuria) || {};
      return row(
        workupField('Estado de estudio', 'proteinuria', 'estadoEstudio', proteinuria.estadoEstudio, ESTADO_ESTUDIO) +
          workupNum('Relación prot/Cr', 'proteinuria', 'relacionProtCr', proteinuria.relacionProtCr) +
          workupTri('Microalbuminuria', 'proteinuria', 'microalbuminuria', proteinuria.microalbuminuria)
      );
    },
  },
  {
    title: 'Amiloidosis',
    html: function (w) {
      var amiloidosis = (w && w.amiloidosis) || {};
      return row(
        workupTri('Sospecha', 'amiloidosis', 'sospecha', amiloidosis.sospecha) +
          workupField('Estado de estudio', 'amiloidosis', 'estadoEstudio', amiloidosis.estadoEstudio, ESTADO_ESTUDIO) +
          workupField('Perugini', 'amiloidosis', 'perugini', amiloidosis.perugini, PERUGINI) +
          workupTri('Biopsia confirmada', 'amiloidosis', 'biopsiaConfirmada', amiloidosis.biopsiaConfirmada)
      );
    },
  },
  {
    title: 'Infiltración',
    html: function (w) {
      var infiltracion = (w && w.infiltracion) || {};
      return row(
        workupTri('Sospecha', 'infiltracion', 'sospecha', infiltracion.sospecha) +
          workupField('Estado de estudio', 'infiltracion', 'estadoEstudio', infiltracion.estadoEstudio, ESTADO_ESTUDIO) +
          workupText('Nota', 'infiltracion', 'nota', infiltracion.nota)
      );
    },
  },
  {
    title: 'Enfermedad coronaria',
    html: function (w) {
      var coronaria = (w && w.coronaria) || {};
      return row(
        workupField('Estado', 'coronaria', 'estado', coronaria.estado, ENFERMEDAD_CORONARIA_ESTADO) +
          workupField('Método', 'coronaria', 'metodo', coronaria.metodo, METODO_CORONARIO) +
          fieldHtml(
            'Fecha',
            '<input type="date" class="ea-input rpc-date-input" data-hf-workup="coronaria.fecha" value="' + escAttr(coronaria.fecha) + '">'
          ) +
          workupText('Hallazgos', 'coronaria', 'hallazgos', coronaria.hallazgos)
      );
    },
  },
  {
    title: 'FA / Anticoagulación',
    html: function (w) {
      var fa = (w && w.fa) || {};
      return row(
        workupTri('FA presente', 'fa', 'presente', fa.presente) +
          workupField('Estrategia', 'fa', 'estrategia', fa.estrategia, ESTRATEGIA_FA) +
          workupField('CHA₂DS₂-VASc', 'fa', 'cha2ds2vasc', fa.cha2ds2vasc, CHA2DS2VASC_RANGE) +
          workupField('HAS-BLED', 'fa', 'hasbled', fa.hasbled, HASBLED_RANGE) +
          workupField('Anticoagulante', 'fa', 'anticoagulante', fa.anticoagulante, ANTICOAGULANTES)
      );
    },
  },
  {
    title: 'Sueño',
    html: function (w) {
      var sueno = (w && w.sueno) || {};
      return row(
        workupField('Trastorno', 'sueno', 'trastorno', sueno.trastorno, TRASTORNO_SUENO) +
          workupField('STOP-BANG', 'sueno', 'stopbang', sueno.stopbang, STOPBANG_RANGE) +
          workupField('Tratamiento', 'sueno', 'tratamiento', sueno.tratamiento, TRATAMIENTO_SUENO)
      );
    },
  },
  {
    title: 'Valvular',
    html: function (w) {
      var valvular = (w && w.valvular) || {};
      return row(
        workupText('Lesión', 'valvular', 'lesion', valvular.lesion) +
          workupField('Severidad', 'valvular', 'severidad', valvular.severidad, SEVERIDAD_VALVULAR) +
          workupText('Nota', 'valvular', 'nota', valvular.nota)
      );
    },
  },
];
export var WORKUP_GROUP_COUNT = WORKUP_GROUPS.length;
export var WORKUP_GROUP_TITLES = WORKUP_GROUPS.map(function (g) {
  return g.title;
});

/**
 * @param {any} workup
 * @param {number} activeIndex which of the 9 subsystems is showing
 */
export function renderWorkupTabsHtml(workup, activeIndex) {
  var active = Math.max(0, Math.min(WORKUP_GROUP_COUNT - 1, Number(activeIndex) || 0));
  var tabs = WORKUP_GROUPS.map(function (g, i) {
    return (
      '<button type="button" role="tab" aria-selected="' +
      (i === active ? 'true' : 'false') +
      '" class="hf-seg-tab' +
      (i === active ? ' hf-seg-tab--active' : '') +
      '" data-hf-workup-tab="' +
      i +
      '">' +
      escHtml(g.title) +
      '</button>'
    );
  }).join('');
  var panel = WORKUP_GROUPS[active].html(workup);
  return '<div class="hf-seg-tabs" role="tablist">' + tabs + '</div>' + panel;
}

// ---------------------------------------------------------------------
// Paso 4 — Labs: glance cards + modals ("ver tabla completa" /
// "nueva medición")
// ---------------------------------------------------------------------

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

function glanceVal(v, unit) {
  if (v == null || v === '') return '—';
  return escHtml(String(v)) + (unit ? ' ' + unit : '');
}

function glanceCard(title, glanceText, modalKey) {
  return (
    '<button type="button" class="hf-glance-card" data-hf-modal-open="' +
    modalKey +
    '">' +
    '<span class="hf-glance-card-title">' +
    escHtml(title) +
    '</span>' +
    '<span class="hf-glance-card-glance">' +
    glanceText +
    '</span>' +
    '</button>'
  );
}

export function renderLabsStepHtml(model) {
  var m = model || {};
  var previoVals = (m.previo && m.previo.values) || {};
  var actualVals = (m.actual && m.actual.values) || {};
  var pctChange = ntProBnpPercentChange(m.previo, m.actual);
  var headline =
    'Cr ' +
    glanceVal(actualVals.cr, 'mg/dL') +
    ' · TFGe ' +
    glanceVal(actualVals.tfge, 'mL/min') +
    ' · NT-proBNP ' +
    glanceVal(actualVals.ntProBnp, 'pg/mL') +
    (pctChange != null ? ' (' + pctChange.toFixed(1) + '%)' : '');
  var draftDate = m.draft && m.draft.date;
  return (
    '<div class="hf-glance-cards">' +
    glanceCard('Labs Previo / Actual', headline, 'labs-table') +
    glanceCard('+ Nueva medición', draftDate ? 'Borrador: ' + escHtml(draftDate) : 'Registrar nuevos labs', 'labs-new') +
    '</div>'
  );
}

function labsTableModalBodyHtml(model) {
  var m = model || {};
  var previoVals = (m.previo && m.previo.values) || {};
  var actualVals = (m.actual && m.actual.values) || {};
  var pctChange = ntProBnpPercentChange(m.previo, m.actual);
  return (
    prevActualTableColumns(LAB_ROWS_DEF, previoVals, actualVals, 2) +
    (pctChange != null
      ? '<p class="ea-muted">% cambio NT-proBNP (previo → actual): ' + escHtml(pctChange.toFixed(1)) + '%</p>'
      : '')
  );
}

function labsNewModalBodyHtml(model) {
  var m = model || {};
  var draft = m.draft || {};
  var fields = LAB_ROWS_DEF.map(function (r) {
    return newEntryNumField('hf-lab-new', r, draft[r.key]);
  }).join('');
  return (
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-hf-lab-action="prefill">Prefill desde laboratorios importados</button>' +
    '</div>' +
    row(fieldHtml('Fecha', '<input type="date" class="ea-input rpc-date-input" data-hf-lab-new="date" value="' + escAttr(draft.date) + '">') + fields)
  );
}

// ---------------------------------------------------------------------
// Paso 5 — Eco/ECG/Dispositivo: glance cards + modals for the echo table
// (the worst offender pre-redesign, 34 rows / ~2076px combined with
// ECG/device), ECG/Dispositivo stay inline (short).
// ---------------------------------------------------------------------

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
  ['jvValsalva', 'JV valsalva', ''],
  ['jvEspiracion', 'JV espiración', ''],
  ['gradienteReversoVt', 'Gradiente reverso VT', ''],
  ['sVd', "S´ del VD", ''],
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

var ECHO_ENUM_OR_TEXT_KEYS = [
  'it',
  'im',
  'iao',
  'ip',
  'estenosis',
  'estenosisSeveridad',
  'vciColapso',
  'dopplerHepaticas',
  'pulsatilidadPorta',
  'dopplerRenal',
  'vexus',
  'patronPulmonar',
  'lineasBPorCampo',
];

var ECHO_NEW_FIELD_PRODUCERS = ECHO_NUM_FIELDS.map(function (f) {
  return function (draft) {
    return newEntryNumField('hf-echo-new', { key: f[0], label: f[1], unit: f[2] }, draft[f[0]]);
  };
}).concat([
  function (draft) {
    return fieldHtml('IT', enumSelect('hf-echo-new', 'it', draft.it, SEVERIDAD_VALVULAR));
  },
  function (draft) {
    return fieldHtml('IM', enumSelect('hf-echo-new', 'im', draft.im, SEVERIDAD_VALVULAR));
  },
  function (draft) {
    return fieldHtml('IAo', enumSelect('hf-echo-new', 'iao', draft.iao, SEVERIDAD_VALVULAR));
  },
  function (draft) {
    return fieldHtml('IP', enumSelect('hf-echo-new', 'ip', draft.ip, SEVERIDAD_VALVULAR));
  },
  function (draft) {
    return fieldHtml(
      'Estenosis',
      '<input type="text" class="ea-input" data-hf-echo-new="estenosis" value="' + escAttr(draft.estenosis) + '">'
    );
  },
  function (draft) {
    return fieldHtml(
      'Severidad estenosis',
      enumSelect('hf-echo-new', 'estenosisSeveridad', draft.estenosisSeveridad, SEVERIDAD_VALVULAR)
    );
  },
  function (draft) {
    return fieldHtml(
      'Colapso VCI',
      '<input type="text" class="ea-input" data-hf-echo-new="vciColapso" value="' + escAttr(draft.vciColapso) + '">'
    );
  },
  function (draft) {
    return fieldHtml(
      'Doppler suprahepático',
      enumSelect('hf-echo-new', 'dopplerHepaticas', draft.dopplerHepaticas, DOPPLER_SUPRAHEPATICO)
    );
  },
  function (draft) {
    return fieldHtml('Pulsatilidad portal', enumSelect('hf-echo-new', 'pulsatilidadPorta', draft.pulsatilidadPorta, PULSATILIDAD_PORTAL));
  },
  function (draft) {
    return fieldHtml('Doppler renal', enumSelect('hf-echo-new', 'dopplerRenal', draft.dopplerRenal, DOPPLER_RENAL));
  },
  function (draft) {
    return fieldHtml('VExUS', enumSelect('hf-echo-new', 'vexus', draft.vexus, VEXUS_GRADES));
  },
  function (draft) {
    return fieldHtml(
      'Patrón pulmonar',
      '<input type="text" class="ea-input" data-hf-echo-new="patronPulmonar" value="' + escAttr(draft.patronPulmonar) + '">'
    );
  },
  function (draft) {
    return fieldHtml('Líneas B por campo', enumSelect('hf-echo-new', 'lineasBPorCampo', draft.lineasBPorCampo, LINEAS_B_CAMPO));
  },
  function (draft) {
    return fieldHtml(
      '¿FEVI recuperada?',
      triSelect('hf-echo-new', 'feviRecuperada', parseTriState(String(draft.feviRecuperada || '')))
    );
  },
]);

export function renderEcoStepHtml(model, device, entry) {
  var m = model || {};
  var previoVals = m.previo || {};
  var actualVals = m.actual || {};
  var headline =
    'FEVI ' +
    glanceVal(actualVals.fevi, '%') +
    ' · TAPSE ' +
    glanceVal(actualVals.tapse, 'mm') +
    ' · PSAP ' +
    glanceVal(actualVals.psap, 'mmHg');
  var draftDate = m.draft && m.draft.date;
  var cards =
    '<div class="hf-glance-cards">' +
    glanceCard('Eco Previo / Actual', headline, 'eco-table') +
    glanceCard('+ Nuevo estudio', draftDate ? 'Borrador: ' + escHtml(draftDate) : 'Registrar nuevo estudio', 'eco-new') +
    '</div>' +
    cardioImageAttachHtml({ kind: 'pocus' });
  // ECG + Dispositivo side by side (not stacked) — stacked, the two
  // sections plus the glance-card row measured 242px over budget live
  // (confirmed via the `run` skill); side by side roughly halves their
  // combined height, same "two columns instead of stacked" move as
  // `.hf-lung-grid` uses elsewhere.
  // Equal-width (50/50) columns, not a content-proportional split — a
  // visibly asymmetric card pair (previously 32/68) read as "uneven"
  // rather than deliberate. Dispositivo's 8 fields wrap to 2 rows instead
  // of 4 columns x 1 row (`.hf-eco-device-col` narrows the field-grid's
  // minmax so it still gets ~4-5 columns per row at half width, instead of
  // degrading to 2 — see estado-actual.css).
  return (
    cards +
    '<div style="display:flex;gap:12px;align-items:flex-start">' +
    '<div class="hf-eco-ecg-col" style="flex:1 1 0;min-width:0">' +
    renderEcgHtml(entry) +
    '</div><div class="hf-eco-device-col" style="flex:1 1 0;min-width:0">' +
    renderDeviceHtml(device) +
    '</div></div>'
  );
}

function ecoTableModalBodyHtml(model) {
  var m = model || {};
  return prevActualTableColumns(ECHO_ROWS_DEF, m.previo || {}, m.actual || {}, 3);
}

function ecoNewModalBodyHtml(model) {
  var m = model || {};
  var draft = m.draft || {};
  var fields = ECHO_NEW_FIELD_PRODUCERS.map(function (fn) {
    return fn(draft);
  }).join('');
  return (
    row(fieldHtml('Fecha', '<input type="date" class="ea-input rpc-date-input" data-hf-echo-new="date" value="' + escAttr(draft.date) + '">') + fields) +
    narrativeTextarea('hf-echo-new', 'nota', draft.nota, 'Nota', { rows: 2 })
  );
}

export function renderEcgHtml(entry) {
  var e = entry || {};
  var body =
    narrativeTextarea('hf-consulta', 'ekgDescripcion', e.ekgDescripcion, 'Descripción', { rows: 2 }) +
    row(
      fieldHtml(
        'Fecha',
        '<input type="date" class="ea-input rpc-date-input" data-hf-consulta="ekgFecha" value="' + escAttr(e.ekgFecha) + '">'
      ) + fieldHtml('¿Es previo?', triSelect('hf-consulta-tri', 'ekgEsPrevio', e.ekgEsPrevio))
    ) +
    cardioImageAttachHtml({ kind: 'ekg' });
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
        '<input type="date" class="ea-input rpc-date-input" data-hf-device="fechaColocacion" value="' + escAttr(d.fechaColocacion) + '">'
      ) +
      fieldHtml(
        'Fecha última revisión',
        '<input type="date" class="ea-input rpc-date-input" data-hf-device="fechaUltimaRevision" value="' + escAttr(d.fechaUltimaRevision) + '">'
      ) +
      fieldHtml(
        'Parámetros',
        '<input type="text" class="ea-input" data-hf-device="parametros" value="' + escAttr(d.parametros) + '">'
      )
  );
  return sectionDiv('Dispositivo', body);
}

// ---------------------------------------------------------------------
// Paso 6 — Tratamiento actual: GDMT (read-only) + "dosis máxima tolerada"
// + TMO y apego (moved here from the closing step — titration status
// belongs with GDMT, not with reingreso/muerte/apreciativo).
// ---------------------------------------------------------------------

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
    '<table class="hf-prev-actual-table hf-prev-actual-table--tight"><thead><tr><th>Clase</th><th>Fármaco</th><th>Dosis</th></tr></thead><tbody>' +
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

var DOSIS_TITULADA_FIELDS = [
  ['bb', 'Betabloqueador'],
  ['iecaAraArni', 'IECA/ARA/ARNI'],
  ['arm', 'ARM'],
  ['isglt2', 'iSGLT2'],
];

/**
 * @param {Array<any>} fantasticos read-only
 * @param {any} entry consulta entry — reads `gdmtMaxTolerada`
 */
export function renderTratamientoActualHtml(fantasticos, entry) {
  var e = entry || {};
  var gdmt = e.gdmtMaxTolerada || {};
  // Short label (class name only) — the accordion's own summary already
  // says "¿A dosis máxima tolerada?"; repeating that per-field wrapped to 2
  // lines at this field width and was most of Paso 6's measured overflow.
  var toleradaFields = GDMT_TOLERADA_FIELDS.map(function (f) {
    return fieldHtml(f[1], triSelect('hf-consulta-gdmt', f[0], gdmt[f[0]]));
  }).join('');
  var toleradaHasData = GDMT_TOLERADA_FIELDS.some(function (f) {
    return gdmt[f[0]] != null;
  });
  var body =
    fantasticosReadOnlyHtml(fantasticos) +
    collapsibleInline('¿A dosis máxima tolerada?', row(toleradaFields), toleradaHasData) +
    '<div style="display:flex;margin-top:8px"><button type="button" class="ea-btn" data-hf-goto-manejo>Editar en Manejo</button></div>';
  return sectionDiv('Tratamiento actual', body);
}

/** TMO y apego (titration-status group) — its own collapsible on Paso 7
 * (Reingreso y desenlaces), not on "Tratamiento actual": both live-tested
 * combinations (with GDMT, and with reingreso) were tried against a demo
 * patient via the `run` skill — pairing with reingreso is the one that
 * fits without overflow, since "Tratamiento actual" is visited every
 * consulta (GDMT table always renders) while TMO is occasional, and
 * reingreso is occasional too — two occasional/collapsible groups share a
 * step better than one occasional group crowding an always-rendered one. */
export function renderTmoHtml(entry) {
  var e = entry || {};
  var dosisTitulada = e.dosisTitulada || {};
  var tmoBody = row(
    fieldHtml(
      'Score TMO',
      '<input type="number" step="any" class="ea-input" data-hf-consulta="scoreTmo" value="' +
        (e.scoreTmo == null ? '' : escAttr(String(e.scoreTmo))) +
        '">'
    ) +
      fieldHtml('Mal apego', triSelect('hf-consulta-tri', 'malApego', e.malApego)) +
      fieldHtml(
        'Tiempo impl. (sem.)',
        '<input type="number" step="any" class="ea-input" data-hf-consulta="tiempoImplementacionSemanas" value="' +
          (e.tiempoImplementacionSemanas == null ? '' : escAttr(String(e.tiempoImplementacionSemanas))) +
          '">'
      ) +
      fieldHtml('Implementación completa', triSelect('hf-consulta-tri', 'implementacionCompleta', e.implementacionCompleta)) +
      fieldHtml('BB/ARNI/ARM/iSGLT2 máx.', triSelect('hf-consulta-tri', 'bbArniArmSglt2DosisMaxima', e.bbArniArmSglt2DosisMaxima)) +
      // Short label (class name only, no "Dosis titulada —" prefix) — the
      // full label wrapped to 2 lines at this field width and was part of
      // Paso 7's measured overflow (confirmed via the `run` skill), same
      // fix as the "dosis máxima tolerada" fields in Tratamiento actual.
      DOSIS_TITULADA_FIELDS.map(function (f) {
        return fieldHtml(f[1], enumSelect('hf-consulta-dosis-titulada', f[0], dosisTitulada[f[0]], TITULACION_DOSIS));
      }).join('')
  );
  var tmoHasData =
    e.scoreTmo != null ||
    e.malApego != null ||
    e.tiempoImplementacionSemanas != null ||
    e.implementacionCompleta != null ||
    e.bbArniArmSglt2DosisMaxima != null ||
    DOSIS_TITULADA_FIELDS.some(function (f) {
      return !!dosisTitulada[f[0]];
    });
  return collapsibleSectionDiv('TMO y apego', tmoBody, tmoHasData);
}

// ---------------------------------------------------------------------
// Scores: one glance card + modal (table is only 7 rows, small enough that
// view + entry fit together in one modal without needing to split into
// two). Shares "Labs y Scores" (Paso 4) with the Labs glance cards — see
// the step-list comment below for why it landed there and not next to
// "Tratamiento actual".
// ---------------------------------------------------------------------

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

export function renderScoresStepHtml(model) {
  var m = model || {};
  var a = m.actual || {};
  var headline = 'NYHA ' + glanceVal(a.nyha) + ' · KCCQ ' + glanceVal(a.kccq) + ' · 6MWT ' + glanceVal(a.sixMwtMeters, 'm');
  return '<div class="hf-glance-cards">' + glanceCard('Scores Previo / Actual', headline, 'scores') + '</div>';
}

function scoresModalBodyHtml(model) {
  var m = model || {};
  var draft = m.draft || {};
  var table = prevActualTable(SCORE_ROWS_DEF, m.previo, m.actual);
  var numFields = SCORE_ROWS_DEF.filter(function (r) {
    return r.key !== 'nyha';
  })
    .map(function (r) {
      return newEntryNumField('hf-score-new', r, draft[r.key]);
    })
    .join('');
  var entryFields = row(
    fieldHtml('Fecha', '<input type="date" class="ea-input rpc-date-input" data-hf-score-new="date" value="' + escAttr(draft.date) + '">') +
      fieldHtml('NYHA', enumSelect('hf-score-new', 'nyha', draft.nyha, NYHA)) +
      numFields
  );
  return table + entryFields;
}

// ---------------------------------------------------------------------
// Paso 8 — Impresión / Plan (Apreciativo colapsado, Plan siempre visible)
// ---------------------------------------------------------------------

/** "Cerrar consulta" — data/UI seam for Track D's Agenda/Directorio
 * migration (see `handleCerrarConsulta` in consulta-ic-wire.mjs). Shows the
 * next-appointment date once set instead of the button, since a closed
 * consulta shouldn't be reopened from here. */
function cerrarConsultaHtml(entry) {
  var e = entry || {};
  if (e.cerrada) {
    return (
      '<p class="ea-muted">Consulta cerrada. Próxima consulta: ' +
      escHtml(e.proximaConsultaFecha || '—') +
      '</p>'
    );
  }
  return (
    '<div style="display:flex;margin-top:8px">' +
    '<button type="button" class="ea-btn ea-btn--primary" data-hf-cerrar-consulta>Cerrar consulta y agendar próxima</button>' +
    '</div>'
  );
}

export function renderApreciativoPlanHtml(entry) {
  var e = entry || {};
  var apreciativoBody = narrativeTextarea('hf-consulta', 'apreciativo', e.apreciativo, 'Apreciativo', { rows: 3 });
  var planBody = narrativeTextarea('hf-consulta', 'plan', e.plan, 'Plan', { rows: 3 });
  return (
    collapsibleSectionDiv('Apreciativo', apreciativoBody, !!(e.apreciativo && String(e.apreciativo).trim())) +
    sectionDiv('Plan', planBody) +
    cerrarConsultaHtml(e)
  );
}

// ---------------------------------------------------------------------
// Modal shell — reused for every "ver tabla completa"/"nueva
// medición"/"nuevo estudio"/"scores" modal. Same chrome as the
// Congestión/POCUS modal (`.modal-backdrop` / `.modal.ea-registro-modal`),
// widened via `.hf-consulta-modal` (see estado-actual.css) since a
// Previo/Actual table split into columns needs more than the default
// 820px to fit with no scroll in either axis. The body is a plain padded
// div (`.hf-consulta-modal-body-pad`), never `.ea-registro-form-scroll`
// (that class scrolls).
// ---------------------------------------------------------------------

var MODAL_DEFS = {
  'labs-table': {
    title: 'Labs — Previo / Actual',
    body: function (c) {
      return labsTableModalBodyHtml(c.labs);
    },
    foot: '',
  },
  'labs-new': {
    title: 'Labs — nueva medición',
    body: function (c) {
      return labsNewModalBodyHtml(c.labs);
    },
    foot: '<button type="button" class="ea-btn ea-btn--primary" data-hf-lab-action="save">Guardar medición</button>',
  },
  'eco-table': {
    title: 'Eco — Previo / Actual',
    body: function (c) {
      return ecoTableModalBodyHtml(c.echo);
    },
    foot: '',
  },
  'eco-new': {
    title: 'Eco — nuevo estudio',
    body: function (c) {
      return ecoNewModalBodyHtml(c.echo);
    },
    foot: '<button type="button" class="ea-btn ea-btn--primary" data-hf-echo-action="save">Guardar estudio</button>',
  },
  scores: {
    title: 'Scores',
    body: function (c) {
      return scoresModalBodyHtml(c.scores);
    },
    foot: '<button type="button" class="ea-btn ea-btn--primary" data-hf-score-action="save">Guardar score</button>',
  },
  'cerrar-consulta': {
    title: 'Cerrar consulta',
    body: function (c) {
      return row(
        fieldHtml(
          'Próxima consulta (fecha)',
          '<input type="date" class="ea-input rpc-date-input" data-hf-cerrar-consulta-date value="' +
            escAttr((c.cerrarConsultaDraft && c.cerrarConsultaDraft.date) || '') +
            '">'
        )
      );
    },
    foot: '<button type="button" class="ea-btn ea-btn--primary" data-hf-cerrar-consulta-confirm>Confirmar</button>',
  },
};

function renderModalHtml(key, ctx) {
  var def = MODAL_DEFS[key];
  if (!def) return '';
  return (
    '<div class="modal-backdrop open" data-hf-modal-backdrop aria-hidden="false">' +
    '<div class="modal ea-registro-modal hf-consulta-modal" role="dialog" aria-modal="true">' +
    '<header class="ea-registro-modal-head"><div class="ea-registro-modal-head-text"><h3>' +
    escHtml(def.title) +
    '</h3></div></header>' +
    '<div class="ea-registro-modal-body"><div class="hf-consulta-modal-body-pad">' +
    def.body(ctx) +
    '</div></div>' +
    '<footer class="ea-registro-modal-foot"><div class="modal-actions ea-registro-modal-actions">' +
    def.foot +
    '<button type="button" class="ea-btn" data-hf-modal-close>Cerrar</button>' +
    '</div></footer>' +
    '</div></div>'
  );
}

// ---------------------------------------------------------------------
// 8-step wizard
// ---------------------------------------------------------------------

var CONSULTA_IC_STEPS = [
  { title: 'Fase y comorbilidades', body: function (c, e) { return renderFaseComorbilidadesStepHtml(e); } },
  { title: 'Último internamiento y Subjetivo/Objetivo', body: function (c, e) { return renderInternamientoStepHtml(e, c.scores); } },
  { title: 'Workup', body: function (c) { return renderWorkupTabsHtml(c.workup, c.workupTab); } },
  {
    // Scores' glance card lives here, not with "Tratamiento actual" — Labs
    // is the lightest step (just two glance cards) and had by far the most
    // slack; "Tratamiento actual" alone (GDMT table + an open "dosis
    // máxima tolerada" accordion) already used the whole budget on a demo
    // patient with real GDMT-tolerance data, confirmed via the `run` skill.
    title: 'Labs y Scores',
    body: function (c) { return renderLabsStepHtml(c.labs) + renderScoresStepHtml(c.scores); },
  },
  { title: 'Eco / ECG / Dispositivo', body: function (c, e) { return renderEcoStepHtml(c.echo, c.device, e); } },
  { title: 'Tratamiento actual', body: function (c, e) { return renderTratamientoActualHtml(c.fantasticos, e); } },
  { title: 'Reingreso y TMO', body: function (c, e) { return renderReingresoTmoStepHtml(e); } },
  { title: 'Impresión / Plan', body: function (c, e) { return renderApreciativoPlanHtml(e); } },
];

export var CONSULTA_IC_STEP_TITLES = CONSULTA_IC_STEPS.map(function (s) {
  return s.title;
});
export var CONSULTA_IC_STEP_COUNT = CONSULTA_IC_STEPS.length;

function stepBodyHtml(step, c, e) {
  var s = CONSULTA_IC_STEPS[step];
  return s ? s.body(c, e) : '';
}

/**
 * Clickable step pills — same `.hf-wizard-steps`/`.hf-wizard-step` classes
 * and markup shape as `evaluacion-inicial-html.mjs`'s `stepPillsHtml` (see
 * `estado-actual.css`, the two wizards deliberately share this visual
 * pattern). Not a linear gate — every pill is clickable regardless of which
 * steps have been visited. Numbers only (not titles), to stay a single
 * compact row and not reopen this wizard's carefully-tuned no-scroll
 * step budgets; the full title still shows in the step head below.
 */
function stepPillsHtml(step) {
  return (
    '<div class="hf-wizard-steps" role="tablist" aria-label="Pasos">' +
    CONSULTA_IC_STEP_TITLES.map(function (title, i) {
      var current = i === step;
      return (
        '<button type="button" class="hf-wizard-step' +
        (current ? ' is-current' : '') +
        '" data-hf-consulta-step-jump="' +
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
 *   workupTab?: number,
 *   device: any,
 *   labs: { previo: any, actual: any, draft: any },
 *   echo: { previo: any, actual: any, draft: any },
 *   scores: { previo: any, actual: any, draft: any },
 *   fantasticos: any[],
 *   step?: number,
 *   openModal?: string | null,
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
    lockBannerHtml(!!c.locked) +
    stepPillsHtml(s) +
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
    (c.openModal ? renderModalHtml(c.openModal, c) : '') +
    '</div>'
  );
}
