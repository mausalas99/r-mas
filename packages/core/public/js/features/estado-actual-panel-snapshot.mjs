/** Snapshot strip + historial section HTML for Estado Actual panel. */
import {
  renderSnapshotVitalsByKeys,
  renderSnapshotVitalsZoneTitle,
  renderSnapshotGluHtml,
  renderSnapshotGluZoneTitle,
  renderSnapshotIoHtml,
  formatHistorialWhen,
  buildHistorialRowParts,
} from './estado-actual-panel-snapshot-html.mjs';
import { escAttr, escHtml } from '../dom-escape.mjs';
import { liveHistorial } from './estado-actual-data-model.mjs';

export { formatSnapshotEgresos } from './estado-actual-panel-snapshot-html.mjs';

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 * @param {number} balTurno
 * @param {number} balGlobal
 */
export function renderSnapshotSection(snapshot, balTurno, balGlobal) {
  var stamp = renderSnapshotVitalsZoneTitle(snapshot).replace(/^Signos vitales/, '');
  return (
    '<section class="ea-section ea-sys-grid ea-snapshot-strip" id="ea-snapshot">' +
    sysCard('hemo', 'Hemodinámico' + stamp, '<div class="ea-snapshot-vitals">' + renderSnapshotVitalsByKeys(snapshot, ['bp', 'fc']) + '</div>') +
    sysCard('resp-lectura', 'Respiratorio', '<div class="ea-snapshot-vitals">' + renderSnapshotVitalsByKeys(snapshot, ['fr', 'sat']) + '</div>') +
    sysCard('inf', 'Infeccioso', '<div class="ea-snapshot-vitals">' + renderSnapshotVitalsByKeys(snapshot, ['temp']) + '</div>') +
    sysCard('meta', renderSnapshotGluZoneTitle(snapshot), '<div class="ea-snapshot-glu">' + renderSnapshotGluHtml(snapshot) + '</div>') +
    sysCard('renal', 'Renal y balance', renderSnapshotIoHtml(snapshot, balGlobal)) +
    '</section>'
  );
}

/** One system card: small title, then its readings. */
function sysCard(id, titleHtml, bodyHtml) {
  return (
    '<div class="ea-sys-card ea-sys-card--' + id + '">' +
    '<h4 class="ea-sys-title">' + titleHtml + '</h4>' +
    bodyHtml +
    '</div>'
  );
}

/**
 * @param {Array<{ id?: string, recordedAt?: string }>} historial
 */
export function renderHistorialSection(historial) {
  var sorted = liveHistorial(historial).sort(function (a, b) {
    return String(b.recordedAt || '').localeCompare(String(a.recordedAt || ''));
  });
  var recent = sorted.slice(0, 8);
  if (!recent.length) {
    return (
      '<details class="ea-section ea-card ea-historial" id="ea-historial">' +
      '<summary class="ea-historial-summary">Historial reciente</summary>' +
      '<p class="ea-muted ea-historial-empty">Sin mediciones registradas.</p>' +
      '</details>'
    );
  }

  var rows = recent
    .map(function (row) {
      var when = formatHistorialWhen(row.recordedAt);
      var parts = buildHistorialRowParts(row);
      var summary = parts.length ? parts.join(' · ') : 'Registro vacío';
      var idArgs = escAttr(JSON.stringify([String(row.id || '')]));
      return (
        '<li class="ea-historial-row">' +
        '<div class="ea-historial-main">' +
        '<span class="ea-historial-when">' +
        when +
        '</span>' +
        '<span class="ea-historial-summary">' +
        escHtml(summary) +
        '</span>' +
        '</div>' +
        '<div class="ea-historial-actions">' +
        '<button type="button" class="ea-btn ea-btn--ghost" data-onclick="editarEstadoActualMedicion" data-onclick-args=\'' +
        idArgs +
        '\'>Editar</button>' +
        '<button type="button" class="ea-btn ea-btn--ghost ea-btn--danger" data-onclick="eliminarEstadoActualMedicion" data-onclick-args=\'' +
        idArgs +
        '\'>Eliminar</button>' +
        '</div>' +
        '</li>'
      );
    })
    .join('');

  return (
    '<details class="ea-section ea-card ea-historial" id="ea-historial">' +
    '<summary class="ea-historial-summary">Historial reciente' +
    '<span class="ea-historial-count">' +
    recent.length +
    '</span></summary>' +
    '<ul class="ea-historial-list">' +
    rows +
    '</ul>' +
    '</details>'
  );
}
