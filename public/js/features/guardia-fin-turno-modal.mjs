/**
 * Fin de guardia sheet — open estudios grouped by source team; Enviar resolves coverings.
 * Ending the local clock never deletes pendientes (see finalizeGuardiaTurno).
 */
import { patients } from '../app-state.mjs';
import {
  clinicalSessionContext,
  refreshGuardiaCensusFromDb,
} from '../clinical-access-runtime.mjs';
import { teamLabelById } from '../patient-team-assign-ui.mjs';
import { deactivateTurnoActivo } from './entrega-roster-panel.mjs';
import { pushClinicalOpsLanNow } from './lan/push-clinical-ops.mjs';
import { buildFinTurnoSheetHtml } from './guardia-fin-turno-html.mjs';
import {
  collectOpenPendientesBySourceTeam,
  resolveGuardiasForSourceTeam,
} from './guardia-fin-turno-model.mjs';

let wired = false;

function toast(msg, type) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type || 'info');
  }
}

function backdropEl() {
  return typeof document !== 'undefined'
    ? document.getElementById('guardia-fin-turno-backdrop')
    : null;
}

function bodyEl() {
  return typeof document !== 'undefined'
    ? document.getElementById('guardia-fin-turno-body')
    : null;
}

function dbApi() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
}

function closeFinTurnoSheet() {
  var bd = backdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  bd._rpcFinTurnoGroups = null;
  var body = bodyEl();
  if (body) body.innerHTML = '';
}

/**
 * @param {ReturnType<typeof collectOpenPendientesBySourceTeam>} groups
 * @param {{ settings?: Record<string, unknown>|null }} [opts]
 */
export function openFinTurnoSheet(groups, opts) {
  wireFinTurnoSheet();
  var bd = backdropEl();
  var body = bodyEl();
  if (!bd || !body) {
    toast('No se pudo abrir el cierre de guardia.', 'error');
    return false;
  }
  bd._rpcFinTurnoGroups = groups;
  bd._rpcFinTurnoSettings = opts && opts.settings != null ? opts.settings : null;
  body.innerHTML = buildFinTurnoSheetHtml(groups);
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  return true;
}

async function sendGroupByTeamKey(teamKey, settings) {
  var bd = backdropEl();
  var groups = (bd && bd._rpcFinTurnoGroups) || [];
  var group = groups.find(function (g) {
    var key = g.sourceTeamId || '__none__';
    return key === teamKey;
  });
  if (!group) return;
  var api = dbApi();
  if (!api || typeof api.dbGuardiaResolve !== 'function') {
    toast('Base clínica no disponible.', 'error');
    return;
  }
  var result = await resolveGuardiasForSourceTeam(group, {
    resolveOne: function (opts) {
      return api.dbGuardiaResolve(opts);
    },
  });
  try {
    await pushClinicalOpsLanNow();
  } catch {
    /* offline / LAN opt-in */
  }
  await refreshGuardiaCensusFromDb(settings);
  if (result.resolved > 0) {
    toast(
      result.resolved === 1
        ? '1 cobertura enviada al equipo de origen.'
        : result.resolved + ' coberturas enviadas al equipo de origen.',
      'success'
    );
  }
  if (result.failed > 0) {
    toast('No se pudieron enviar ' + result.failed + '.', 'warn');
  }
  var uid = String(clinicalSessionContext.user?.user_id || '');
  var next = collectOpenPendientesBySourceTeam(
    clinicalSessionContext.guardias || [],
    patients,
    { coveringUserId: uid, teamLabelById: teamLabelById }
  );
  if (!next.length) {
    closeFinTurnoSheet();
    return;
  }
  openFinTurnoSheet(next, { settings: settings });
}

export function wireFinTurnoSheet() {
  if (wired || typeof document === 'undefined') return;
  var bd = backdropEl();
  if (!bd) return;
  wired = true;
  bd.addEventListener('click', function (ev) {
    if (ev.target === bd) closeFinTurnoSheet();
  });
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== 'function') return;
    if (t.closest('#guardia-fin-turno-dismiss') || t.closest('#guardia-fin-turno-cancel')) {
      ev.preventDefault();
      closeFinTurnoSheet();
      return;
    }
    var sendBtn = t.closest('.guardia-fin-turno-send');
    if (sendBtn && bd.classList.contains('open')) {
      ev.preventDefault();
      var key = String(sendBtn.getAttribute('data-source-team') || '');
      var settings = bd._rpcFinTurnoSettings;
      sendBtn.disabled = true;
      void sendGroupByTeamKey(key, settings).finally(function () {
        sendBtn.disabled = false;
      });
    }
  });
}

/**
 * End local turno clock, then open return sheet if open estudios remain.
 * @param {{
 *   settings?: Record<string, unknown>|null,
 *   renderGuardiaBoard?: (s: unknown) => void,
 *   stopTurnoClock?: () => void,
 * }} [callbacks]
 */
export function finalizeGuardiaTurno(callbacks) {
  var uid = String(clinicalSessionContext.user?.user_id || '');
  var groups = collectOpenPendientesBySourceTeam(
    clinicalSessionContext.guardias || [],
    patients,
    { coveringUserId: uid, teamLabelById: teamLabelById }
  );

  deactivateTurnoActivo();
  if (typeof callbacks?.stopTurnoClock === 'function') callbacks.stopTurnoClock();
  callbacks?.renderGuardiaBoard?.(callbacks.settings);

  if (!groups.length) {
    toast('Turno finalizado.', 'success');
    return { openedSheet: false, groups: groups };
  }
  openFinTurnoSheet(groups, { settings: callbacks?.settings });
  return { openedSheet: true, groups: groups };
}

export { closeFinTurnoSheet };
