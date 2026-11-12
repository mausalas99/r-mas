/** Snapshot / historial data helpers (the markup lives in estado-actual-panel-snapshot-view.jsx). */
import { isIoNumericValue } from './estado-actual-data.mjs';
import {
  formatEgresoPartsForText,
  formatEvacForText,
  toEaSalidaText,
  formatIoTurnoEvent,
} from './estado-actual-io.mjs';
import { isVitalAltered } from './estado-actual-ranges.mjs';
import {
  formatEaVitalStampDateOnly,
  formatEaVitalStampForSnapshot,
  isOpenShiftRow,
} from './estado-actual-registro-defaults.mjs';
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';
import { VITAL_KEYS, VITAL_LABELS, VITAL_UNITS } from './estado-actual-panel-constants.mjs';
import { formatInsulinPumpAlgoritmoLabel } from '../insulin-pump-some-detect.mjs';
import { pad2, displayValue } from './estado-actual-panel-format.mjs';

/**
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: Array<{ label?: string, value?: unknown }>, evac?: unknown }} io
 * @returns {string}
 */
export function formatSnapshotEgresos(io) {
  io = io || {};
  if (Array.isArray(io.egrParts) && io.egrParts.length) {
    return formatEgresoPartsForText(io.egrParts, { showTurnCount: false }).join(' · ');
  }
  var egr = io.egr;
  if (egr == null || egr === '') return '—';
  if (isIoNumericValue(egr)) return String(egr) + ' CC (DIURESIS)';
  return toEaSalidaText(egr);
}

/**
 * @param {unknown} ing
 * @returns {string}
 */
export function formatSnapshotIngresos(ing) {
  if (ing === 'NC' || String(ing || '').toUpperCase() === 'NC') return 'NC';
  if (ing == null || ing === '') return '—';
  return String(ing) + ' CC';
}

/** Vitals shown as individual cards in the snapshot strip (T/A is combined). */
var SNAPSHOT_STRIP_VITAL_KEYS = ['fc', 'fr', 'temp', 'sat'];

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

/** @param {Date} [now] */
export function todayDayMonth(now) {
  var d = now || new Date();
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

/**
 * @param {string} key
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
function vitalSnapshotRowOpts(key, snapshot) {
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

  return {
    label: SNAPSHOT_STRIP_LABELS[key] || VITAL_LABELS[key] || key,
    value: displayValue(displayVal),
    unit: unit,
    stamp: resolveVitalStamp(latestFromSeries, key, snapshot),
    vitalKey: key,
    altered: isVitalAltered(key, displayVal),
    hasHistory: vitalHasHistory(key, snapshot),
  };
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
function bpSnapshotRowOpts(snapshot) {
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
    return {
      label: 'T/A',
      value: '—',
      unit: 'mmHg',
      stamp: '',
      vitalKey: 'bp',
      altered: false,
      hasHistory: false,
    };
  }

  var latest = pairs[pairs.length - 1];
  return {
    label: 'T/A',
    value: formatBpPairValue(latest.tas, latest.tad),
    unit: 'mmHg',
    stamp: formatEaVitalStampDateOnly(latest.recordedAt, latest.time),
    vitalKey: 'bp',
    altered: isVitalAltered('tas', latest.tas) || isVitalAltered('tad', latest.tad),
    hasHistory: vitalHasHistory('bp', snapshot),
  };
}

/**
 * @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot
 */
export function snapshotVitalRowsOpts(snapshot) {
  return [bpSnapshotRowOpts(snapshot)].concat(
    SNAPSHOT_STRIP_VITAL_KEYS.map(function (key) {
      return vitalSnapshotRowOpts(key, snapshot);
    }),
  );
}

/** Most common dd/mm among the vital rows (today included), or ''. */
export function vitalsHeadStamp(rows) {
  /** @type {Record<string, number>} */
  var counts = {};
  var best = '';
  rows.forEach(function (r) {
    if (!r.stamp) return;
    counts[r.stamp] = (counts[r.stamp] || 0) + 1;
    if (!best || counts[r.stamp] > counts[best]) best = r.stamp;
  });
  return best;
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

/** @param {ReturnType<typeof import('./estado-actual-data.mjs').deriveSnapshot>} snapshot */
export function snapshotInsulinPumpAlgLabel(snapshot) {
  return snapshot.bombaInsulinaAlgoritmo != null && Number.isFinite(Number(snapshot.bombaInsulinaAlgoritmo))
    ? formatInsulinPumpAlgoritmoLabel(Number(snapshot.bombaInsulinaAlgoritmo))
    : '';
}

/**
 * @param {string | undefined} recordedAt
 * @param {Date} [now]
 */
export function formatHistorialWhen(recordedAt, now) {
  var d = new Date(recordedAt || '');
  if (isNaN(d.getTime())) return '—';
  if (isOpenShiftRow({ recordedAt: recordedAt }, now)) return 'Turno en curso (hoy)';
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
export function hasIoTurnoEvents(turnos) {
  return Array.isArray(turnos.eventos) && turnos.eventos.length > 0;
}
