/**
 * Read-only Nube / sala / equipo strip for Modo Guardia (no daily Cambiar equipo).
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { escapeHtml } from '../dom-escape.mjs';
import { filterJoinedTeams } from './clinical-teams/shared.mjs';
import { isCloudSyncActive } from './cloud-sync/nube-sync-policy.mjs';
import { getCloudSyncRoomSnapshot } from './cloud-sync/settings.mjs';

/**
 * @param {{
 *   cloudActive?: boolean,
 *   room?: { sala?: string, turnKey?: string, name?: string }|null,
 *   userSala?: string,
 *   teamName?: string,
 * }} [input]
 * @returns {{ connected: boolean, chips: Array<{ label: string, tone: 'ok'|'muted'|'warn' }> }}
 */
function roomSalaTurn(room, userSala) {
  var sala = String((room && room.sala) || userSala || '').trim();
  var turn = String((room && room.turnKey) || '').trim();
  return [sala, turn].filter(Boolean).join(' · ');
}

export function resolveGuardiaTrustStripModel(input) {
  var cloudActive = !!(input && input.cloudActive);
  var teamName = String((input && input.teamName) || '').trim();
  var salaTurn = roomSalaTurn(
    (input && input.room) || null,
    String((input && input.userSala) || '').trim()
  );
  var chips = [
    cloudActive
      ? { label: 'Nube · conectado', tone: 'ok' }
      : { label: 'Sin Nube', tone: 'warn' },
  ];
  if (salaTurn) chips.push({ label: salaTurn, tone: 'muted' });
  chips.push({ label: teamName || 'Sin equipo', tone: 'muted' });
  return { connected: cloudActive, chips: chips };
}

/**
 * @returns {ReturnType<typeof resolveGuardiaTrustStripModel>}
 */
export function buildGuardiaTrustStripFromSession() {
  var user = clinicalSessionContext.user || {};
  var joined = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  var team = joined[0] || null;
  return resolveGuardiaTrustStripModel({
    cloudActive: isCloudSyncActive(),
    room: getCloudSyncRoomSnapshot(),
    userSala: String(user.sala || '').trim(),
    teamName: team ? String(team.name || team.service || '').trim() : '',
  });
}

/**
 * @param {ReturnType<typeof resolveGuardiaTrustStripModel>} model
 * @returns {string}
 */
export function buildGuardiaTrustStripHtml(model) {
  var chips = (model && model.chips) || [];
  return chips
    .map(function (c) {
      var tone = c.tone === 'ok' ? 'ok' : c.tone === 'warn' ? 'warn' : 'muted';
      var dot = tone === 'ok' ? '<span class="guardia-trust-dot" aria-hidden="true"></span>' : '';
      return (
        '<span class="guardia-trust-chip guardia-trust-chip--' +
        tone +
        '">' +
        dot +
        escapeHtml(c.label) +
        '</span>'
      );
    })
    .join('');
}

export function syncGuardiaTrustStrip() {
  if (typeof document === 'undefined') return;
  var host = document.getElementById('guardia-trust-strip');
  if (!host) return;
  var model = buildGuardiaTrustStripFromSession();
  host.innerHTML = buildGuardiaTrustStripHtml(model);
  host.hidden = false;
  host.setAttribute('aria-label', 'Estado Nube, sala y equipo');
}
