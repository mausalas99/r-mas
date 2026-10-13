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

export var TRIAGE_LABELS = {
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
    '<button type="button" class="ic-cf-svc" aria-label="' + (trimmed ? escHtml(trimmed) : 'Elegir') + ', servicio solicitante" data-ic-req-trigger>' +
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
    (c.triage === 'seguimiento' ? '' : timeFieldHtml('Recibida', 'receivedAt', c.receivedAt) + timeFieldHtml('Respondida', 'answeredAt', c.answeredAt)) +
    teamFieldHtml(teamCtx) +
    '</div>'
  );
}

/** Local HH:MM of an ISO string, '' when empty or invalid. */
function hhmm(iso) {
  var d = new Date(iso || '');
  if (!iso || isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function timeFieldHtml(label, key, iso) {
  return (
    '<div class="ic-cf" data-label="' + label + '">' +
    '<input type="time" class="ic-consult-input" data-consult-time="' + key + '" aria-label="' + label + '" value="' + hhmm(iso) + '">' +
    '</div>'
  );
}

/** HH:MM typed in the band → ISO UTC, on the day of the old value (else today). '' clears. */
export function isoFromTimeInput(value, oldIso) {
  var m = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!m) return '';
  var d = new Date(oldIso || Date.now());
  if (isNaN(d.getTime())) d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
}

// --- Interconsulta response timer ---
// The user taps "Recibida" then "Respondida"; both times live in `patient.consultInfo` as
// ISO UTC strings (`receivedAt`, `answeredAt`), the same contract the iOS app writes.

const WEEK_MS = 7 * 24 * 3600 * 1000;

function toMs(iso) {
  const t = Date.parse(String(iso || ''));
  return Number.isFinite(t) ? t : null;
}

export function icTimes(patient) {
  const raw = (patient && patient.consultInfo) || {};
  return { received: toMs(raw.receivedAt), answered: toMs(raw.answeredAt) };
}

export function formatElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}

/** Text tag for the triage group (VPO / IC / ...). Empty when no group is set. */
export function icTriageTagHtml(patient) {
  const key = getConsultInfo(patient).triage;
  const label = TRIAGE_LABELS[key];
  return label ? '<span class="ic-tag ic-tag--' + key + '">' + escHtml(label) + '</span>' : '';
}

/** Footer of a board card. Buttons sit beside the card button, never inside it. */
export function icTimerHtml(patient, nowMs = Date.now()) {
  const id = escHtml(String(patient.id));
  if (getConsultInfo(patient).triage === 'seguimiento') return '';
  const { received, answered } = icTimes(patient);
  if (received == null) {
    return (
      '<div class="ic-timer"><button type="button" class="ic-timer__btn ic-timer__btn--go" data-ic-timer="start" data-ic-timer-id="' + id + '">Recibida</button>' +
      '<button type="button" class="ic-timer__link" data-ic-timer="followup" data-ic-timer-id="' + id + '">Es seguimiento</button></div>'
    );
  }
  if (answered == null) {
    return (
      '<div class="ic-timer"><span class="ic-timer__t" data-ic-since="' + received + '">' + formatElapsed(nowMs - received) + '</span>' +
      '<button type="button" class="ic-timer__btn" data-ic-timer="stop" data-ic-timer-id="' + id + '">Respondida</button></div>'
    );
  }
  return '<div class="ic-timer"><span class="ic-timer__t is-done">' + formatElapsed(answered - received) + '</span><span class="ic-timer__s">Respondida</span></div>';
}

/** Header pills: average minutes answered in the last 7 days, overall + VPO + IC. */
export function icTimerStatsHtml(patients, nowMs = Date.now()) {
  const sums = { all: [0, 0], vpo: [0, 0], ic: [0, 0] };
  for (const p of patients || []) {
    const { received, answered } = icTimes(p);
    if (getConsultInfo(p).triage === 'seguimiento' || received == null || answered == null || answered < received || answered < nowMs - WEEK_MS) continue;
    const keys = ['all'].concat(sums[getConsultInfo(p).triage] ? [getConsultInfo(p).triage] : []);
    for (const k of keys) {
      sums[k][0] += answered - received;
      sums[k][1] += 1;
    }
  }
  if (!sums.all[1]) return '';
  const pill = (label, [total, n]) =>
    n ? '<span class="ic-stat"><i>' + label + '</i> ' + formatElapsed(total / n) + '</span>' : '';
  return '<span class="ic-stats">' + pill('Promedio 7 días', sums.all) + pill('VPO', sums.vpo) + pill('IC', sums.ic) + '</span>';
}
