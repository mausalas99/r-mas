/** Snapshot / historial HTML fragments — extracted from estado-actual-panel-snapshot.mjs */
import { isIoNumericValue } from './estado-actual-data.mjs';
import {
  formatEgresoPartForText,
  formatEvacForText,
  formatIoBalanceDisplay,
  toEaSalidaText,
} from './estado-actual-io.mjs';
import { isGlucometriaMarkedAltered } from './estado-actual-ranges.mjs';
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';
import { VITAL_KEYS, VITAL_LABELS, VITAL_UNITS } from './estado-actual-panel-constants.mjs';
import { pad2, displayValue, displayBalance, escHtml } from './estado-actual-panel-format.mjs';
import { formatSnapshotEgresos } from './estado-actual-panel-snapshot-format.mjs';

/**
 * @param {string} key
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
function renderVitalSnapshotItem(key, snapshot) {
  var val = snapshot.vitals[key];
  var altered = snapshot.alteredAt && snapshot.alteredAt[key];
  var cls = 'ea-snapshot-item' + (altered ? ' ea-snapshot-item--altered' : '');
  var meta = altered ? '<span class="ea-snapshot-altered-at">' + altered + '</span>' : '';
  var fakeMed = { vitals: snapshot.vitals, alteredAt: snapshot.alteredAt, vitalSeries: snapshot.vitalSeries };
  var series = vitalSeriesFromMedicion(fakeMed)[key] || [];
  var display =
    series.length > 0
      ? series
          .map(function (rd) {
            var bit = displayValue(rd.value);
            if (rd.time) bit += ' @ ' + escHtml(rd.time);
            return bit;
          })
          .join(' · ')
      : displayValue(val);
  return (
    '<div class="' +
    cls +
    '">' +
    '<span class="ea-snapshot-label">' +
    VITAL_LABELS[key] +
    '</span>' +
    '<span class="ea-snapshot-value">' +
    display +
    '</span>' +
    '<span class="ea-snapshot-unit">' +
    (VITAL_UNITS[key] || '') +
    '</span>' +
    meta +
    '</div>'
  );
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function renderSnapshotVitalsHtml(snapshot) {
  return VITAL_KEYS.map(function (key) {
    return renderVitalSnapshotItem(key, snapshot);
  }).join('');
}

function renderBombaChip(b) {
  var t = b.time ? ' <span class="ea-snapshot-glu-time">' + b.time + '</span>' : '';
  var u =
    b.units != null && b.units !== '' && Number(b.units) !== 0
      ? ' <span class="ea-snapshot-glu-units">(' + displayValue(b.units) + ' U)</span>'
      : '';
  return (
    '<span class="ea-snapshot-glu-chip ea-snapshot-glu-chip--bomba">' +
    displayValue(b.value) +
    ' MG/DL' +
    u +
    t +
    '</span>'
  );
}

function renderGluChip(g) {
  var t = g.time ? ' <span class="ea-snapshot-glu-time">' + g.time + '</span>' : '';
  var rescue =
    g.rescueUnits != null && g.rescueUnits !== '' && Number(g.rescueUnits) !== 0
      ? ' <span class="ea-snapshot-glu-rescue">(' + displayValue(g.rescueUnits) + ' U rescate)</span>'
      : '';
  var postRescue =
    g.postRescueValue != null && g.postRescueValue !== ''
      ? ' <span class="ea-snapshot-glu-post">→ ' + displayValue(g.postRescueValue) + ' MG/DL</span>'
      : '';
  var alteredCls = isGlucometriaMarkedAltered(g) ? ' ea-snapshot-glu-chip--altered' : '';
  return (
    '<span class="ea-snapshot-glu-chip' +
    alteredCls +
    '">' +
    displayValue(g.value) +
    ' MG/DL' +
    rescue +
    postRescue +
    t +
    '</span>'
  );
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function renderSnapshotGluHtml(snapshot) {
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) {
    return snapshot.bombaInsulina.map(renderBombaChip).join('');
  }
  if (snapshot.glucometrias && snapshot.glucometrias.length) {
    return snapshot.glucometrias.map(renderGluChip).join('');
  }
  return '<span class="ea-muted">—</span>';
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 * @param {number} balGlobal
 */
export function renderSnapshotIoHtml(snapshot, balGlobal) {
  var evacHtml =
    snapshot.io.evac != null && snapshot.io.evac !== ''
      ? '<div><span class="ea-snapshot-label">Evacuaciones</span><span class="ea-snapshot-io-val">' +
        escHtml(formatEvacForText(snapshot.io.evac)) +
        '</span></div>'
      : '';
  return (
    '<div class="ea-snapshot-io">' +
    '<div><span class="ea-snapshot-label">Ingresos</span><span class="ea-snapshot-io-val">' +
    displayValue(snapshot.io.ing) +
    ' CC</span></div>' +
    '<div class="ea-snapshot-io-egr">' +
    '<span class="ea-snapshot-label">Egresos</span>' +
    '<span class="ea-snapshot-io-val">' +
    formatSnapshotEgresos(snapshot.io) +
    '</span></div>' +
    evacHtml +
    '<div><span class="ea-snapshot-label">Turno</span><span class="ea-snapshot-io-val">' +
    formatIoBalanceDisplay(snapshot.io.ing, snapshot.io) +
    '</span></div>' +
    '<div><span class="ea-snapshot-label">Global</span><span class="ea-snapshot-io-val">' +
    displayBalance(balGlobal) +
    '</span></div>' +
    '</div>'
  );
}

/**
 * @param {string | undefined} recordedAt
 */
export function formatHistorialWhen(recordedAt) {
  var d = new Date(recordedAt || '');
  if (isNaN(d.getTime())) return '—';
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/**
 * @param {{ vitals?: Record<string, unknown>, glucometrias?: unknown[], bombaInsulina?: unknown[], io?: { ing?: unknown, egr?: unknown, egrParts?: unknown[], evac?: unknown } }} row
 */
export function buildHistorialRowParts(row) {
  var parts = [];
  var rowSeries = vitalSeriesFromMedicion(row);
  VITAL_KEYS.forEach(function (vk) {
    var list = rowSeries[vk] || [];
    for (var rsi = 0; rsi < list.length; rsi++) {
      var rd = list[rsi];
      var part = (VITAL_LABELS[vk] || vk) + ' ' + rd.value;
      if (rd.time) part += ' @ ' + rd.time;
      parts.push(part);
    }
  });
  appendHistorialGluParts(parts, row);
  appendHistorialIoParts(parts, row.io || {});
  return parts;
}

/**
 * @param {string[]} parts
 * @param {{ glucometrias?: unknown[], bombaInsulina?: unknown[] }} row
 */
function appendHistorialGluParts(parts, row) {
  var bombas = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
  if (bombas.length) {
    bombas.forEach(function (b) {
      if (!b || typeof b !== 'object' || b.value == null || b.value === '') return;
      var bp = 'Bomba Glu ' + b.value;
      if (b.units != null && b.units !== '') bp += ' (' + b.units + ' U)';
      if (b.time) bp += ' @ ' + b.time;
      parts.push(bp);
    });
    return;
  }
  var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
  glus.forEach(function (g) {
    if (!g || g.value == null || g.value === '') return;
    var gp = 'Glu ' + g.value;
    if (g.altered) gp += ' alterada';
    if (g.rescueUnits != null && g.rescueUnits !== '' && Number(g.rescueUnits) !== 0) {
      gp += ' (' + g.rescueUnits + ' U rescate)';
    }
    if (g.postRescueValue != null && g.postRescueValue !== '') gp += ' → DXT ' + g.postRescueValue;
    parts.push(gp + (g.time ? ' @ ' + g.time : ''));
  });
}

/**
 * @param {string[]} parts
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: unknown[], evac?: unknown }} io
 */
function appendHistorialIoParts(parts, io) {
  if (io.ing != null && io.ing !== '') parts.push('Ing ' + io.ing);
  if (Array.isArray(io.egrParts) && io.egrParts.length) {
    parts.push(io.egrParts.map(formatEgresoPartForText).join(', '));
  } else if (io.egr != null && io.egr !== '') {
    parts.push('Egr ' + io.egr);
  }
  if (io.evac != null && io.evac !== '') parts.push('Evac ' + formatEvacForText(io.evac));
}

export { isIoNumericValue, toEaSalidaText };
