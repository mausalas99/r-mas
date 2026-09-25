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
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { INTERCONSULT_SERVICES, hueForRequestingService } from './interconsult-catalog.mjs';
import { buildTeamSelectOptions } from '../clinical-teams/team-select-options.mjs';

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

function renderStatusOptionsHtml(statusKey) {
  var opts = ['<option value=""' + (statusKey ? '' : ' selected') + '>Sin definir</option>'];
  FOLLOW_UP_STATUSES.forEach(function (key) {
    opts.push(
      '<option value="' + key + '"' + (key === statusKey ? ' selected' : '') + '>' +
      escHtml(FOLLOW_UP_LABELS[key]) +
      '</option>'
    );
  });
  return opts.join('');
}

function requestingServiceTriggerHtml(name) {
  var trimmed = String(name || '').trim();
  var svc = INTERCONSULT_SERVICES.find(function (s) {
    return s.name === trimmed;
  });
  var hue = svc ? hueForRequestingService(svc) : 220;
  return (
    '<button type="button" class="svc" style="--h:' + hue + '" data-ic-req-trigger>' +
    (trimmed ? escHtml(trimmed) : 'Elegir servicio') +
    '</button>'
  );
}

/**
 * @param {{ teams: object[], currentTeamId?: string, groupBySala?: boolean }} [teamCtx]
 */
function teamFieldHtml(teamCtx) {
  var teams = (teamCtx && teamCtx.teams) || [];
  if (!teams.length) return '';
  var currentTeamId = (teamCtx && teamCtx.currentTeamId) || '';
  return (
    '<div class="ic-consult-field">' +
    '<label class="ic-consult-label">Equipo</label>' +
    '<select class="ic-consult-input" data-consult-team-select>' +
    '<option value="">— Sin asignar —</option>' +
    buildTeamSelectOptions(teams, currentTeamId, { groupBySala: !!(teamCtx && teamCtx.groupBySala) }) +
    '</select>' +
    '</div>'
  );
}

/** Editable — Servicio solicitante opens the categorized catalog picker
 * (data-ic-req-trigger, wired in interconsulta-mode-chrome.mjs), Motivo de
 * consulta is free text, Seguimiento and Equipo are selects. Inputs/selects
 * carry `data-consult-field`/`data-consult-team-select` for the change
 * delegation wired in interconsulta-mode-chrome.mjs (renderer has no
 * per-field handlers here).
 * @param {{requestingService: string, reason: string, followUpStatus: string}} info
 * @param {{ teams: object[], currentTeamId?: string, groupBySala?: boolean }} [teamCtx]
 */
export function renderConsultBandHtml(info, teamCtx) {
  var c = info || {};
  var statusKey = String(c.followUpStatus || '');
  return (
    '<div class="ic-consult-band">' +
    '<div class="ic-consult-field">' +
    '<label class="ic-consult-label">Servicio solicitante</label>' +
    requestingServiceTriggerHtml(c.requestingService) +
    '</div>' +
    '<div class="ic-consult-field ic-consult-field--reason">' +
    '<label class="ic-consult-label">Motivo de consulta</label>' +
    '<input type="text" class="ic-consult-input" data-consult-field="reason" ' +
    'value="' + escAttr(c.reason) + '" placeholder="Sin dato">' +
    '</div>' +
    '<div class="ic-consult-field">' +
    '<label class="ic-consult-label">Seguimiento</label>' +
    '<select class="ic-consult-input ic-consult-status ic-consult-status--' + escHtml(statusKey || 'sin_definir') + '" ' +
    'data-consult-field="followUpStatus">' +
    renderStatusOptionsHtml(statusKey) +
    '</select>' +
    '</div>' +
    teamFieldHtml(teamCtx) +
    '</div>'
  );
}
