/**
 * Fin de guardia sheet markup (pure).
 */
import { escapeHtml } from '../dom-escape.mjs';
import { summarizeFinTurnoGroups } from './guardia-fin-turno-model.mjs';

/**
 * @param {Array<{
 *   sourceTeamId: string,
 *   teamLabel: string,
 *   openCount: number,
 *   patients: Array<{ patientLabel: string, itemLabels: string[] }>,
 * }>} groups
 * @returns {string}
 */
export function buildFinTurnoSheetHtml(groups) {
  var summary = summarizeFinTurnoGroups(groups);
  var lead =
    summary.openCount +
    ' pendiente' +
    (summary.openCount === 1 ? '' : 's') +
    ' abierto' +
    (summary.openCount === 1 ? '' : 's') +
    ' · ' +
    summary.teamCount +
    ' equipo' +
    (summary.teamCount === 1 ? '' : 's');
  var rows = (groups || [])
    .map(function (g) {
      var metaParts = [];
      (g.patients || []).forEach(function (p) {
        var items = (p.itemLabels || []).join(', ') || 'estudio abierto';
        metaParts.push(escapeHtml(p.patientLabel) + ' · ' + escapeHtml(items));
      });
      var teamKey = g.sourceTeamId || '__none__';
      return (
        '<li class="guardia-fin-turno-row">' +
        '<div class="guardia-fin-turno-row-main">' +
        '<strong class="guardia-fin-turno-team">' +
        escapeHtml(g.teamLabel) +
        '</strong>' +
        '<span class="guardia-fin-turno-meta">' +
        metaParts.join('<br>') +
        '</span></div>' +
        '<button type="button" class="btn-med-primary guardia-fin-turno-send" data-source-team="' +
        escapeHtml(teamKey) +
        '">Enviar ' +
        g.openCount +
        '</button></li>'
      );
    })
    .join('');
  return (
    '<p class="guardia-fin-turno-lead">' +
    escapeHtml(lead) +
    '</p>' +
    '<p class="guardia-fin-turno-hint">Envía a los equipos de origen (handoff diurno) para liberar la cobertura. ' +
    'El reloj del turno ya se apagó; los pendientes no se borran solos.</p>' +
    '<ul class="guardia-fin-turno-list">' +
    rows +
    '</ul>'
  );
}
