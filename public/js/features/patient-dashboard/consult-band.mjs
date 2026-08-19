/**
 * Interconsulta — consult info band shown above the Resumen patient summary
 * (design handoff screen 10b). Servicio solicitante / motivo / seguimiento.
 *
 * Storage: `{requestingService, reason, followUpStatus}` lives as a JSON
 * field (`patient.consultInfo`) on the patient record, the same pattern
 * already used for `patient.interconsultServiceIds`
 * (see ./interconsult-catalog.mjs) — this app persists most per-patient
 * clinical metadata as JSON via persistClinicalState() rather than adding
 * SQL columns, so no lib/db/schema.mjs bump is needed here.
 */
import { escHtml } from '../../dom-escape.mjs';

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
