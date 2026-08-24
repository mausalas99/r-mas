/**
 * Consulta Externa mode — HF follow-up band shown above the Resumen patient
 * summary (design handoff screen 10b). Previously rendered IM interconsult
 * fields (servicio solicitante/motivo/seguimiento); now shows the cardiology
 * outpatient follow-up snapshot instead: fase de seguimiento (editable),
 * fenotipo/etiología, último internamiento, and última consulta — sourced
 * from `patient.cardio` (top-level identity fields + `cardio.consultas[]`,
 * see lib/cardio/consulta-seguimiento.mjs).
 *
 * `getConsultInfo`/`setConsultInfo` and the old `patient.consultInfo` JSON
 * field are kept for backward compat (existing callers/tests) but are no
 * longer rendered by this band.
 */
import { escHtml } from '../../dom-escape.mjs';
import { FASES_SEGUIMIENTO } from '../../../../lib/cardio/hf-enums.mjs';
import { upsertConsultaEntry, emptyConsultaEntry } from '../../../../lib/cardio/consulta-seguimiento.mjs';

export var FOLLOW_UP_STATUSES = ['pendiente', 'en_curso', 'resuelta'];

var FOLLOW_UP_LABELS = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  resuelta: 'Resuelta',
};

/** @returns {{requestingService: string, reason: string, followUpStatus: string}} */
export function getConsultInfo(patient) {
  var info = patient && patient.consultInfo;
  if (!info || typeof info !== 'object') {
    return { requestingService: '', reason: '', followUpStatus: '' };
  }
  return {
    requestingService: String(info.requestingService || ''),
    reason: String(info.reason || ''),
    followUpStatus: String(info.followUpStatus || ''),
  };
}

/** Mutates `patient.consultInfo` with a merge of `patch`, returns the new value. */
export function setConsultInfo(patient, patch) {
  if (!patient) return null;
  var cur = getConsultInfo(patient);
  var p = patch || {};
  var next = {
    requestingService: 'requestingService' in p ? String(p.requestingService || '') : cur.requestingService,
    reason: 'reason' in p ? String(p.reason || '') : cur.reason,
    followUpStatus: 'followUpStatus' in p ? String(p.followUpStatus || '') : cur.followUpStatus,
  };
  patient.consultInfo = next;
  return next;
}

/** kept for reference/back-compat call sites; not used by the new band. */
export function renderConsultBandHtml(info) {
  var c = info || {};
  var statusKey = String(c.followUpStatus || '');
  var statusLabel = FOLLOW_UP_LABELS[statusKey] || (statusKey ? statusKey : 'Sin definir');
  var empty = '<span class="ic-consult-empty">Sin dato</span>';
  return (
    '<div class="ic-consult-band">' +
    '<div class="ic-consult-field">' +
    '<span class="ic-consult-label">Servicio solicitante</span>' +
    '<span class="ic-consult-value">' +
    (c.requestingService ? escHtml(c.requestingService) : empty) +
    '</span></div>' +
    '<div class="ic-consult-field ic-consult-field--reason">' +
    '<span class="ic-consult-label">Motivo de consulta</span>' +
    '<span class="ic-consult-value">' +
    (c.reason ? escHtml(c.reason) : empty) +
    '</span></div>' +
    '<div class="ic-consult-field">' +
    '<span class="ic-consult-label">Seguimiento</span>' +
    '<span class="ic-consult-value ic-consult-status ic-consult-status--' +
    escHtml(statusKey || 'sin_definir') +
    '">' +
    escHtml(statusLabel) +
    '</span></div>' +
    '</div>'
  );
}

var FASE_LABELS = FASES_SEGUIMIENTO.reduce(function (acc, f) {
  acc[f.value] = f.label;
  return acc;
}, {});

function todayYmd() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * `cardio.consultas[]` is kept sorted ascending by date (see
 * upsertConsultaEntry in lib/cardio/consulta-seguimiento.mjs), so the last
 * item is the most recent — whether it's a closed past visit or today's
 * in-progress draft.
 */
function latestConsultaEntry(cardio) {
  var list = cardio && Array.isArray(cardio.consultas) ? cardio.consultas : [];
  return list.length ? list[list.length - 1] : null;
}

/** @param {unknown} patient */
export function buildHfFollowUpBandModel(patient) {
  var cardio = patient && typeof patient === 'object' ? /** @type {any} */ (patient).cardio : null;
  cardio = cardio && typeof cardio === 'object' ? cardio : {};
  var latest = latestConsultaEntry(cardio);
  return {
    faseSeguimiento: String((latest && latest.faseSeguimiento) || ''),
    fenotipo: String(cardio.fenotipo || ''),
    etiologia: String(cardio.etiologia || ''),
    ultimoInternamientoFecha: String((latest && latest.ultimoInternamientoFecha) || ''),
    ultimoInternamientoCausa: String((latest && latest.ultimoInternamientoCausa) || ''),
    ultimaConsultaFecha: String((latest && latest.date) || ''),
  };
}

/** Writes `faseSeguimiento` onto the latest consulta entry if it's today's
 * in-progress draft, otherwise starts a new draft entry dated today. */
export function setConsultaFaseSeguimiento(patient, value) {
  if (!patient || typeof patient !== 'object') return null;
  var p = /** @type {any} */ (patient);
  if (!p.cardio || typeof p.cardio !== 'object') p.cardio = {};
  if (!Array.isArray(p.cardio.consultas)) p.cardio.consultas = [];
  var today = todayYmd();
  var latest = latestConsultaEntry(p.cardio);
  var base = latest && latest.date === today ? latest : emptyConsultaEntry();
  var entry = Object.assign({}, base, { date: today, faseSeguimiento: String(value || '') });
  p.cardio.consultas = upsertConsultaEntry(p.cardio.consultas, entry);
  return p.cardio.consultas;
}

function faseSelectOptionsHtml(currentValue) {
  var options = ['<option value="">Sin definir</option>'];
  var known = false;
  FASES_SEGUIMIENTO.forEach(function (f) {
    if (f.value === currentValue) known = true;
    options.push(
      '<option value="' +
        escHtml(f.value) +
        '"' +
        (f.value === currentValue ? ' selected' : '') +
        '>' +
        escHtml(f.label) +
        '</option>'
    );
  });
  if (currentValue && !known) {
    options.push('<option value="' + escHtml(currentValue) + '" selected>' + escHtml(currentValue) + ' (valor previo)</option>');
  }
  return options.join('');
}

export function renderHfFollowUpBandHtml(model) {
  var m = model || {};
  var empty = '<span class="ic-consult-empty">Sin dato</span>';
  var fenotipoEtiologia =
    m.fenotipo || m.etiologia
      ? escHtml(m.fenotipo || '—') + ' &middot; ' + escHtml(m.etiologia || '—')
      : empty;
  var ultimoInternamiento = m.ultimoInternamientoFecha
    ? escHtml(m.ultimoInternamientoFecha) +
      (m.ultimoInternamientoCausa ? ' — ' + escHtml(m.ultimoInternamientoCausa) : '')
    : empty;
  var ultimaConsulta = m.ultimaConsultaFecha ? escHtml(m.ultimaConsultaFecha) : empty;
  return (
    '<div class="ic-consult-band">' +
    '<div class="ic-consult-field">' +
    '<span class="ic-consult-label">Fase de seguimiento</span>' +
    '<select class="ic-consult-fase-select" data-hf-fase-select>' +
    faseSelectOptionsHtml(String(m.faseSeguimiento || '')) +
    '</select></div>' +
    '<div class="ic-consult-field">' +
    '<span class="ic-consult-label">Fenotipo / Etiología</span>' +
    '<span class="ic-consult-value">' +
    fenotipoEtiologia +
    '</span></div>' +
    '<div class="ic-consult-field">' +
    '<span class="ic-consult-label">Último internamiento</span>' +
    '<span class="ic-consult-value">' +
    ultimoInternamiento +
    '</span></div>' +
    '<div class="ic-consult-field">' +
    '<span class="ic-consult-label">Última consulta</span>' +
    '<span class="ic-consult-value">' +
    ultimaConsulta +
    '</span></div>' +
    '<div class="ic-consult-field ic-consult-field--action">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-hf-open-consulta-ic>Abrir consulta de hoy</button>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {unknown} patient
 * @param {{ onChange?: () => void, onOpenConsultaHoy?: () => void }} [opts]
 */
export function wireHfFollowUpBand(container, patient, opts) {
  if (!container) return;
  var o = opts || {};
  var select = container.querySelector('[data-hf-fase-select]');
  if (select) {
    select.addEventListener('change', function () {
      setConsultaFaseSeguimiento(patient, select.value);
      if (typeof o.onChange === 'function') o.onChange();
    });
  }
  var openBtn = container.querySelector('[data-hf-open-consulta-ic]');
  if (openBtn) {
    openBtn.addEventListener('click', function () {
      if (typeof o.onOpenConsultaHoy === 'function') {
        o.onOpenConsultaHoy();
      } else {
        // Phase 4 (Consulta IC screen) isn't built yet — no segment to open.
        console.log('[R+ HF] Consulta IC screen no disponible todavía (Fase 4).');
      }
    });
  }
}
