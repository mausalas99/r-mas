/** Snapshot / historial HTML fragments — extracted from estado-actual-panel-snapshot.mjs */
import { isIoNumericValue } from './estado-actual-data.mjs';
import {
  formatEgresoPartsForText,
  formatEvacForText,
  formatIoBalanceDisplay,
  toEaSalidaText,
  ioTurnosBreakdown,
  formatIoTurnoEvent,
} from './estado-actual-io.mjs';
import { isGlucometriaMarkedAltered, isVitalAltered } from './estado-actual-ranges.mjs';
import {
  formatEaVitalStampDateOnly,
  formatEaVitalStampForSnapshot,
} from './estado-actual-registro-defaults.mjs';
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';
import { VITAL_KEYS, VITAL_LABELS, VITAL_UNITS } from './estado-actual-panel-constants.mjs';
import { formatInsulinPumpAlgoritmoLabel } from '../insulin-pump-some-detect.mjs';
import { pad2, displayValue, displayBalance, escHtml, escAttr } from './estado-actual-panel-format.mjs';

/**
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: Array<{ label?: string, value?: unknown }>, evac?: unknown }} io
 * @returns {string}
 */
export function formatSnapshotEgresos(io) {
  io = io || {};
  if (Array.isArray(io.egrParts) && io.egrParts.length) {
    return escHtml(formatEgresoPartsForText(io.egrParts, { showTurnCount: false }).join(' · '));
  }
  var egr = io.egr;
  if (egr == null || egr === '') return '—';
  if (isIoNumericValue(egr)) return escHtml(String(egr) + ' CC (DIURESIS)');
  return escHtml(toEaSalidaText(egr));
}

/**
 * @param {unknown} ing
 * @returns {string}
 */
function formatSnapshotIngresos(ing) {
  if (ing === 'NC' || String(ing || '').toUpperCase() === 'NC') return escHtml('NC');
  if (ing == null || ing === '') return escHtml('—');
  return escHtml(String(ing) + ' CC');
}

/** Vitals shown as individual cards in the snapshot strip (T/A is combined). */
var SNAPSHOT_STRIP_VITAL_KEYS = ['fc', 'fr', 'temp', 'sat'];

/** Labels in the snapshot strip. */
var SNAPSHOT_STRIP_LABELS = {
  fc: VITAL_LABELS.fc,
  fr: VITAL_LABELS.fr,
  temp: VITAL_LABELS.temp,
  sat: 'SatO₂',
};

var VITAL_HISTORY_TITLES = {
  bp: 'T/A',
  fc: VITAL_LABELS.fc,
  fr: VITAL_LABELS.fr,
  temp: VITAL_LABELS.temp,
  sat: VITAL_LABELS.sat,
};

/**
 * @param {string} vitalKey
 */
export function vitalHistoryTitle(vitalKey) {
  return VITAL_HISTORY_TITLES[vitalKey] || vitalKey;
}

/**
 * @param {string} vitalKey
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function getVitalHistoryEntries(vitalKey, snapshot) {
  if (vitalKey === 'bp') {
    var pairs = Array.isArray(snapshot.bpPairs) ? snapshot.bpPairs.slice() : [];
    return pairs
      .slice()
      .reverse()
      .map(function (p) {
        return {
          value: formatBpPairValue(p.tas, p.tad),
          unit: 'mmHg',
          stamp: formatEaVitalStampForSnapshot(p.recordedAt, p.time),
          altered: isVitalAltered('tas', p.tas) || isVitalAltered('tad', p.tad),
        };
      });
  }
  var series =
    snapshot.vitalSeries && Array.isArray(snapshot.vitalSeries[vitalKey])
      ? snapshot.vitalSeries[vitalKey].slice()
      : [];
  return series
    .slice()
    .reverse()
    .map(function (reading) {
      return {
        value: displayValue(reading.value),
        unit: VITAL_UNITS[vitalKey] || '',
        stamp: formatEaVitalStampForSnapshot(reading.recordedAt, reading.time),
        altered: isVitalAltered(vitalKey, reading.value),
      };
    });
}

/**
 * @param {string} vitalKey
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function vitalHasHistory(vitalKey, snapshot) {
  return getVitalHistoryEntries(vitalKey, snapshot).length > 1;
}

/**
 * @param {Array<{ value: string, unit?: string, stamp?: string, altered?: boolean }>} entries
 */
export function renderVitalHistoryListHtml(entries) {
  if (!entries.length) {
    return '<p class="ea-muted">Sin lecturas registradas.</p>';
  }
  return (
    '<ol class="ea-vital-history-list">' +
    entries
      .map(function (entry, idx) {
        var cls = 'ea-vital-history-row' + (idx === 0 ? ' ea-vital-history-row--latest' : '');
        if (entry.altered) cls += ' ea-vital-history-row--altered';
        var badge =
          idx === 0 ? '<span class="ea-vital-history-badge">Actual</span>' : '';
        var unitHtml = entry.unit
          ? '<span class="ea-vital-history-unit">' + escHtml(entry.unit) + '</span>'
          : '';
        var stampHtml = entry.stamp
          ? '<span class="ea-vital-history-stamp">' + escHtml(entry.stamp) + '</span>'
          : '';
        return (
          '<li class="' +
          cls +
          '">' +
          '<div class="ea-vital-history-metric">' +
          '<span class="ea-vital-history-value">' +
          escHtml(entry.value) +
          '</span>' +
          unitHtml +
          '</div>' +
          '<div class="ea-vital-history-meta">' +
          stampHtml +
          badge +
          '</div>' +
          '</li>'
        );
      })
      .join('') +
    '</ol>'
  );
}

/**
 * @param {string} vitalKey
 * @param {boolean} hasHistory
 */
function snapshotItemInteractionAttrs(vitalKey, hasHistory) {
  if (!hasHistory) return '';
  var keyArgs = escAttr(JSON.stringify([String(vitalKey)]));
  return (
    ' role="button" tabindex="0" data-ea-vital-history="' +
    escAttr(vitalKey) +
    '" data-onclick="openEaVitalHistoryModal" data-onclick-args=\'' +
    keyArgs +
    '\' data-onkeydown="openEaVitalHistoryModal" data-onkeydown-args=\'' +
    keyArgs +
    '\' data-onkeydown-keys="Enter,Space" data-onkeydown-prevent title="Ver historial del turno"'
  );
}

/**
 * @param {number | null | undefined} tas
 * @param {number | null | undefined} tad
 */
function formatBpPairValue(tas, tad) {
  return displayValue(tas) + '/' + displayValue(tad);
}

/**
 * @param {{ recordedAt?: string, time?: string } | null | undefined} reading
 * @param {string} [fallbackKey]
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
function resolveVitalStamp(reading, fallbackKey, snapshot) {
  if (reading && reading.recordedAt) {
    return formatEaVitalStampDateOnly(reading.recordedAt, reading.time);
  }
  if (fallbackKey && snapshot.alteredAt) {
    return formatEaVitalStampDateOnly('', snapshot.alteredAt[fallbackKey]);
  }
  return '';
}

/**
 * @param {{ label: string, value: string, unit: string, stamp: string, vitalKey: string, altered: boolean, hasHistory: boolean }} opts
 */
function renderSnapshotVitalRow(opts) {
  var cls =
    'ea-snapshot-row' +
    (opts.altered ? ' ea-snapshot-row--altered' : '') +
    (opts.hasHistory ? ' ea-snapshot-row--interactive' : '');
  var unitHtml = opts.unit
    ? '<span class="ea-snapshot-row-unit">' + escHtml(opts.unit) + '</span>'
    : '';
  var stampHtml = opts.stamp
    ? '<span class="ea-snapshot-row-stamp">' + escHtml(opts.stamp) + '</span>'
    : '<span class="ea-snapshot-row-stamp ea-snapshot-row-stamp--empty" aria-hidden="true"></span>';
  return (
    '<div class="' +
    cls +
    '"' +
    snapshotItemInteractionAttrs(opts.vitalKey, opts.hasHistory) +
    '>' +
    '<span class="ea-snapshot-row-label">' +
    escHtml(opts.label) +
    '</span>' +
    '<span class="ea-snapshot-row-reading">' +
    '<span class="ea-snapshot-row-value">' +
    escHtml(opts.value) +
    '</span>' +
    unitHtml +
    '</span>' +
    stampHtml +
    '</div>'
  );
}

/**
 * @param {string} key
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
function renderVitalSnapshotItem(key, snapshot) {
  var unit = VITAL_UNITS[key] || '';
  var series =
    snapshot.vitalSeries && Array.isArray(snapshot.vitalSeries[key]) ? snapshot.vitalSeries[key] : [];
  var latestVal = snapshot.vitals[key];
  var latestFromSeries = series.length ? series[series.length - 1] : null;
  var displayVal =
    latestVal != null && latestVal !== ''
      ? latestVal
      : latestFromSeries && latestFromSeries.value != null
        ? latestFromSeries.value
        : null;

  return renderSnapshotVitalRow({
    label: SNAPSHOT_STRIP_LABELS[key] || VITAL_LABELS[key] || key,
    value: displayValue(displayVal),
    unit: unit,
    stamp: resolveVitalStamp(latestFromSeries, key, snapshot),
    vitalKey: key,
    altered: isVitalAltered(key, displayVal),
    hasHistory: vitalHasHistory(key, snapshot),
  });
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
function renderBpSnapshotItem(snapshot) {
  /** @type {Array<{ tas: number | null, tad: number | null, recordedAt?: string, time?: string }>} */
  var pairs = Array.isArray(snapshot.bpPairs) ? snapshot.bpPairs : [];
  if (!pairs.length) {
    var tasOnly = snapshot.vitals.tas;
    var tadOnly = snapshot.vitals.tad;
    if ((tasOnly != null && tasOnly !== '') || (tadOnly != null && tadOnly !== '')) {
      pairs = [{ tas: tasOnly, tad: tadOnly, recordedAt: '', time: undefined }];
    }
  }
  if (!pairs.length) {
    return renderSnapshotVitalRow({
      label: 'T/A',
      value: '—',
      unit: 'mmHg',
      stamp: '',
      vitalKey: 'bp',
      altered: false,
      hasHistory: false,
    });
  }

  var latest = pairs[pairs.length - 1];
  return renderSnapshotVitalRow({
    label: 'T/A',
    value: formatBpPairValue(latest.tas, latest.tad),
    unit: 'mmHg',
    stamp: formatEaVitalStampDateOnly(latest.recordedAt, latest.time),
    vitalKey: 'bp',
    altered: isVitalAltered('tas', latest.tas) || isVitalAltered('tad', latest.tad),
    hasHistory: vitalHasHistory('bp', snapshot),
  });
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function renderSnapshotVitalsHtml(snapshot) {
  var html = renderBpSnapshotItem(snapshot);
  for (var ki = 0; ki < SNAPSHOT_STRIP_VITAL_KEYS.length; ki++) {
    html += renderVitalSnapshotItem(SNAPSHOT_STRIP_VITAL_KEYS[ki], snapshot);
  }
  return html;
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
export function renderSnapshotGluZoneTitle(snapshot) {
  var alg = snapshot.bombaInsulinaAlgoritmo;
  if (alg != null && Number.isFinite(Number(alg))) {
    return formatInsulinPumpAlgoritmoLabel(Number(alg)) || 'Glucometrías';
  }
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) return 'Bomba de insulina';
  return 'Glucometrías';
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function renderSnapshotGluHtml(snapshot) {
  var algLabel =
    snapshot.bombaInsulinaAlgoritmo != null && Number.isFinite(Number(snapshot.bombaInsulinaAlgoritmo))
      ? formatInsulinPumpAlgoritmoLabel(Number(snapshot.bombaInsulinaAlgoritmo))
      : '';
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) {
    var chips = snapshot.bombaInsulina.map(renderBombaChip).join('');
    if (algLabel) {
      return (
        '<span class="ea-snapshot-glu-alg-badge ea-muted">' + escHtml(algLabel) + '</span>' + chips
      );
    }
    return chips;
  }
  if (algLabel) {
    return '<span class="ea-snapshot-glu-alg-badge ea-muted">' + escHtml(algLabel) + '</span>';
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
    formatSnapshotIngresos(snapshot.io.ing) +
    '</span></div>' +
    '<div class="ea-snapshot-io-egr">' +
    '<span class="ea-snapshot-label">Egresos</span>' +
    '<span class="ea-snapshot-io-val">' +
    formatSnapshotEgresos(snapshot.io) +
    '</span></div>' +
    evacHtml +
    '<div class="ea-snapshot-row--interactive" role="button" tabindex="0" data-onclick="openEaTurnosBalanceModal" data-onkeydown="openEaTurnosBalanceModal" data-onkeydown-keys="Enter,Space" data-onkeydown-prevent title="Ver T1, T2 y T3 y eventos del turno">' +
    '<span class="ea-snapshot-label">Turno <span aria-hidden="true">›</span>' +
    (snapshot.io.turnos && hasIoTurnoEvents(snapshot.io.turnos) ? ' <span class="ea-turno-event-dot" aria-label="con eventos">●</span>' : '') +
    '</span><span class="ea-snapshot-io-val">' +
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
    parts.push(formatEgresoPartsForText(io.egrParts, { showTurnCount: false }).join(', '));
  } else if (io.egr != null && io.egr !== '') {
    parts.push('Egr ' + io.egr);
  }
  if (io.evac != null && io.evac !== '') parts.push('Evac ' + formatEvacForText(io.evac));
  (Array.isArray(io.eventos) ? io.eventos : []).forEach(function (ev) {
    var t = formatIoTurnoEvent(ev);
    if (t) parts.push(t);
  });
}

export { isIoNumericValue, toEaSalidaText };

/** @param {{ eventos?: unknown[] }} turnos */
function hasIoTurnoEvents(turnos) {
  return Array.isArray(turnos.eventos) && turnos.eventos.length > 0;
}

/** @param {number | 'NC' | null} v */
function turnoCell(v) {
  if (v == null) return '—';
  if (v === 'NC') return 'NC';
  return String(v);
}

/**
 * Tabla T1/T2/T3 del último registro con turnos: ingresos, egresos, balance y eventos.
 * @param {{ ingTurnos?: unknown[], egrTurnos?: unknown[], eventos?: unknown[] } | null | undefined} turnos
 */
export function renderTurnosBalanceHtml(turnos) {
  var rows = ioTurnosBreakdown(turnos);
  return (
    '<table class="ea-turnos-table">' +
    '<thead><tr><th>Turno</th><th>Ingresos</th><th>Egresos</th><th>Balance</th><th>Eventos</th></tr></thead><tbody>' +
    rows
      .map(function (r) {
        var balCls = typeof r.bal === 'number' ? (r.bal > 0 ? ' ea-balance-live--pos' : r.bal < 0 ? ' ea-balance-live--neg' : '') : '';
        return (
          '<tr><th scope="row">' + r.turno + '</th>' +
          '<td>' + turnoCell(r.ing) + '</td>' +
          '<td>' + turnoCell(r.egr) + '</td>' +
          '<td class="ea-turnos-bal' + balCls + '">' +
          (typeof r.bal === 'number' ? (r.bal > 0 ? '+' : '') + r.bal : turnoCell(r.bal)) +
          '</td>' +
          '<td class="ea-turnos-events">' + (r.eventos.length ? r.eventos.map(escHtml).join('<br>') : '') + '</td></tr>'
        );
      })
      .join('') +
    '</tbody></table>' +
    '<p class="ea-muted ea-turnos-foot">' +
    (turnos ? 'Valores en mL del último registro.' : 'Aún no hay ingresos ni egresos por turno.') +
    '</p>' +
    '<button type="button" class="ea-btn ea-turnos-add" data-onclick="closeEaVitalHistoryModal" data-onclick-2="openEstadoActualRegistroModal">Capturar turnos o evento</button>'
  );
}
