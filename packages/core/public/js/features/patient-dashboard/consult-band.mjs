/**
 * Interconsulta — consult info band shown above the Resumen patient summary
 * (design handoff screen 10b). Servicio solicitante / motivo / seguimiento.
 *
 * Storage: `{requestingService, reason, followUpStatus, triage}` lives as a JSON
 * field (`patient.consultInfo`) on the patient record, the same pattern
 * already used for `patient.interconsultServiceIds`
 * (see ./interconsult-catalog.mjs) — this app persists most per-patient
 * clinical metadata as JSON via persistClinicalState() rather than adding
 * SQL columns, so no lib/db/schema.mjs bump is needed here.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { INTERCONSULT_SERVICES, hueForRequestingService } from './interconsult-catalog.mjs';
import { buildTeamSelectOptions } from '../clinical-teams/team-select-options.mjs';

/** Triage group, set on desktop and on the iOS app. Order = board order. */
export var TRIAGE_GROUPS = ['vpo', 'critico', 'ic', 'seguimiento'];

var TRIAGE_LABELS = {
  vpo: 'VPO',
  critico: 'Críticos',
  ic: 'IC',
  seguimiento: 'Seguimiento',
};

/** @returns {{requestingService: string, reason: string, followUpStatus: string, triage: string}} */
export function getConsultInfo(patient) {
  var info = patient && patient.consultInfo;
  if (!info || typeof info !== 'object') {
    return { requestingService: '', reason: '', followUpStatus: '', triage: '' };
  }
  return {
    requestingService: String(info.requestingService || ''),
    reason: String(info.reason || ''),
    followUpStatus: String(info.followUpStatus || ''),
    triage: String(info.triage || ''),
  };
}

/** Mutates `patient.consultInfo` with a merge of `patch`, returns the new value.
 * Keys this file does not know (written by a newer app) are kept. */
export function setConsultInfo(patient, patch) {
  if (!patient) return null;
  var raw = patient.consultInfo && typeof patient.consultInfo === 'object' ? patient.consultInfo : {};
  var next = Object.assign({}, raw, getConsultInfo(patient));
  var p = patch || {};
  Object.keys(p).forEach(function (k) {
    next[k] = String(p[k] || '');
  });
  patient.consultInfo = next;
  return next;
}

/** Board sort rank: VPO first, no group last. */
export function triageRank(patient) {
  var i = TRIAGE_GROUPS.indexOf(getConsultInfo(patient).triage);
  return i < 0 ? TRIAGE_GROUPS.length : i;
}

function renderTriageOptionsHtml(key) {
  var opts = ['<option value=""' + (key ? '' : ' selected') + '>Sin grupo</option>'];
  TRIAGE_GROUPS.forEach(function (g) {
    opts.push(
      '<option value="' + g + '"' + (g === key ? ' selected' : '') + '>' + escHtml(TRIAGE_LABELS[g]) + '</option>'
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
    '<button type="button" class="ic-cf-svc" aria-label="Servicio solicitante" data-ic-req-trigger>' +
    (trimmed ? escHtml(trimmed) : 'Elegir') +
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
    '<div class="ic-cf" data-label="Equipo">' +
    '<select class="ic-consult-input" aria-label="Equipo" data-consult-team-select>' +
    '<option value="">Sin asignar</option>' +
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
 * @param {{requestingService: string, reason: string, followUpStatus: string, triage: string}} info
 * @param {{ teams: object[], currentTeamId?: string, groupBySala?: boolean }} [teamCtx]
 */
export function renderConsultBandHtml(info, teamCtx) {
  var c = info || {};
  var svcName = String(c.requestingService || '').trim();
  var svc = INTERCONSULT_SERVICES.find(function (x) { return x.name === svcName; });
  var svcStyle = svc ? ' style="--h:' + hueForRequestingService(svc) + '"' : '';
  return (
    '<div class="ic-consult-band">' +
    '<div class="ic-cf ic-cf--svc' + (svcName ? ' is-picked' : '') + '" data-label="Servicio"' + svcStyle + '>' +
    requestingServiceTriggerHtml(c.requestingService) +
    '</div>' +
    '<div class="ic-cf ic-cf--reason" data-label="Motivo">' +
    '<input type="text" class="ic-consult-input" data-consult-field="reason" aria-label="Motivo de consulta" ' +
    'value="' + escAttr(c.reason) + '" placeholder="Agregar">' +
    '</div>' +
    '<div class="ic-cf ic-cf--triage" data-label="Seguimiento">' +
    '<select class="ic-consult-input" data-consult-field="triage" aria-label="Seguimiento">' +
    renderTriageOptionsHtml(String(c.triage || '')) +
    '</select>' +
    '</div>' +
    teamFieldHtml(teamCtx) +
    '</div>'
  );
}
