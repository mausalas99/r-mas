import { isVitalAltered, isGlucometriaMarkedAltered } from './estado-actual-ranges.mjs';
import { gluPointMs, isGluPointInRegistroWindow } from './estado-actual-registro-defaults.mjs';
import { vitalSeriesFromMedicion } from './estado-actual-vital-series.mjs';

/** @type {readonly { id: string, title: string, keys: readonly string[] }[]} */
const VITAL_FAMILIES = [
  { id: 'hemo', title: 'Hemodinámico', keys: ['tas', 'tad', 'fc'] },
  { id: 'resp', title: 'Respiratorio', keys: ['fr', 'sat'] },
  { id: 'metab', title: 'Metabólico', keys: ['temp'] },
];

const CHART_TOKEN_FALLBACKS = {
  '--ea-chart-vital-1': 'var(--color-accent)',
  '--ea-chart-vital-2': '#c62828',
  '--ea-chart-vital-3': '#047857',
  '--ea-chart-vital-4': '#b45309',
  '--ea-chart-vital-5': '#0891b2',
  '--ea-chart-vital-6': '#7c3aed',
  '--ea-chart-glu': '#047857',
  '--ea-chart-io-ing': '#60a5fa',
  '--ea-chart-io-egr': '#f87171',
  '--ea-chart-io-balance': '#6f97d6',
  '--ea-chart-sign': '#6f97d6',
  '--ea-chart-altered': '#b45309',
};

/** @type {Record<string, string> | null} */
var chartColorCache = null;

function ensureChartColorCache() {
  if (chartColorCache) return chartColorCache;
  /** @type {Record<string, string>} */
  var out = {};
  Object.keys(CHART_TOKEN_FALLBACKS).forEach(function (token) {
    var fallback = CHART_TOKEN_FALLBACKS[token] || 'var(--color-accent)';
    if (typeof document === 'undefined') {
      out[token] = fallback;
      return;
    }
    var value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    out[token] = value || fallback;
  });
  chartColorCache = out;
  return out;
}

/**
 * @param {string} token
 * @returns {string}
 */
export function chartColor(token) {
  var cache = ensureChartColorCache();
  return cache[token] || CHART_TOKEN_FALLBACKS[token] || 'var(--color-accent)';
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatChartLabel(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return formatChartLocalDateTime(d);
}

/**
 * @param {Date} d
 * @returns {string}
 */
function formatChartLocalDateTime(d) {
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/**
 * @param {number} ms
 * @returns {string}
 */
export function formatChartLabelFromMs(ms) {
  if (!ms) return '';
  var d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return formatChartLocalDateTime(d);
}

/**
 * @param {unknown} v
 */
function hasIoPair(io) {
  if (!io || typeof io !== 'object') return false;
  var ing = /** @type {{ ing?: unknown, egr?: unknown }} */ (io).ing;
  var egr = /** @type {{ ing?: unknown, egr?: unknown }} */ (io).egr;
  if (ing == null || ing === '' || egr == null || egr === '') return false;
  var ingN = Number(ing);
  var egrN = Number(egr);
  return Number.isFinite(ingN) && Number.isFinite(egrN);
}

/**
 * @param {unknown[]} historial
 * @returns {unknown[]}
 */
export function historialSortedAsc(historial) {
  return historial.slice().sort(function (a, b) {
    var ra =
      typeof a === 'object' && a && 'recordedAt' in a ? String(/** @type {any} */ (a).recordedAt) : '';
    var rb =
      typeof b === 'object' && b && 'recordedAt' in b ? String(/** @type {any} */ (b).recordedAt) : '';
    return ra.localeCompare(rb);
  });
}

/**
 * @param {unknown[]} histAsc
 */
export function buildIoChartData(histAsc) {
  /** @type {string[]} */
  var labels = [];
  /** @type {number[]} */
  var ing = [];
  /** @type {number[]} */
  var egr = [];
  /** @type {number[]} */
  var turnBalance = [];
  /** @type {number[]} */
  var globalBalance = [];
  var running = 0;

  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    var io =
      /** @type {any} */ (row).io && typeof /** @type {any} */ (row).io === 'object'
        ? /** @type {any} */ (/** @type {any} */ (row).io)
        : {};
    if (!hasIoPair(io)) continue;
    var ingN = Number(io.ing);
    var egrN = Number(io.egr);
    var turn = ingN - egrN;
    running += turn;
    labels.push(formatChartLabel(/** @type {any} */ (row).recordedAt));
    ing.push(ingN);
    egr.push(egrN);
    turnBalance.push(turn);
    globalBalance.push(running);
  }

  return { labels, ing, egr, turnBalance, globalBalance };
}

/**
 * @param {Array<{ ms: number, label: string, value: number, altered: boolean }>} points
 * @param {string} recordedAt
 * @param {unknown[]} readings
 * @param {Date} [now]
 * @param {{ forCharts?: boolean } | undefined} [opts]
 */
function pushGluReadingPoints(points, recordedAt, readings, now, opts) {
  opts = opts || {};
  var forCharts = opts.forCharts === true;
  for (var g = 0; g < readings.length; g++) {
    var glu = readings[g];
    if (!glu || typeof glu !== 'object') continue;
    var val = Number(/** @type {any} */ (glu).value);
    if (!Number.isFinite(val)) continue;
    var timeHm = /** @type {any} */ (glu).time ? String(/** @type {any} */ (glu).time) : '';
    var ms = gluPointMs(recordedAt, timeHm);
    if (!forCharts && !isGluPointInRegistroWindow(ms, now)) continue;
    points.push({
      ms: ms,
      label: formatChartLabelFromMs(ms),
      value: val,
      altered: isGlucometriaMarkedAltered(/** @type {{ altered?: boolean, value?: unknown }} */ (glu)),
    });
  }
}

export function buildGluSeries(histAsc, now, seriesOpts) {
  /** @type {Array<{ ms: number, label: string, value: number, altered: boolean }>} */
  var points = [];

  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    var recordedAt = String(/** @type {any} */ (row).recordedAt || '');
    var glus = Array.isArray(/** @type {any} */ (row).glucometrias)
      ? /** @type {any} */ (/** @type {any} */ (row).glucometrias)
      : [];
    pushGluReadingPoints(points, recordedAt, glus, now, seriesOpts);
    var bombas = Array.isArray(/** @type {any} */ (row).bombaInsulina)
      ? /** @type {any} */ (/** @type {any} */ (row).bombaInsulina)
      : [];
    pushGluReadingPoints(points, recordedAt, bombas, now, seriesOpts);
  }

  points.sort(function (a, b) {
    return a.ms - b.ms;
  });

  return {
    labels: points.map(function (p) {
      return p.label;
    }),
    values: points.map(function (p) {
      return p.value;
    }),
    alteredFlags: points.map(function (p) {
      return p.altered;
    }),
  };
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function glucometriaSignature(rows) {
  return rows
    .map(function (g) {
      if (!g || typeof g !== 'object') return '';
      return String(/** @type {any} */ (g).time || '') + '@' + String(/** @type {any} */ (g).value || '');
    })
    .join(';');
}

function vitalsFingerprint(vit) {
  return (
    String(vit.tas || '') +
    '/' +
    String(vit.tad || '') +
    '/' +
    String(vit.fc || '') +
    '/' +
    String(vit.fr || '') +
    '/' +
    String(vit.temp || '') +
    '/' +
    String(vit.sat || '')
  );
}

function eaHistorialRowFingerprint(row) {
  if (!row || typeof row !== 'object') return '';
  /** @type {any} */
  var r = row;
  var vit = r.vitals && typeof r.vitals === 'object' ? r.vitals : {};
  var io = r.io && typeof r.io === 'object' ? r.io : {};
  var gluSig = glucometriaSignature(Array.isArray(r.glucometrias) ? r.glucometrias : []);
  var bombaSig = glucometriaSignature(Array.isArray(r.bombaInsulina) ? r.bombaInsulina : []);
  return (
    String(r.id || '') +
    '@' +
    String(r.recordedAt || '') +
    ':' +
    vitalsFingerprint(vit) +
    JSON.stringify(r.vitalSeries || '') +
    ':' +
    String(io.ing || '') +
    '/' +
    String(io.egr || '') +
    ':' +
    gluSig +
    ':' +
    bombaSig
  );
}

/**
 * @param {unknown[]} hist
 * @returns {string}
 */
export function historialChartRevision(hist) {
  var n = hist.length;
  if (!n) return '0';
  var parts = ['n' + n];
  for (var i = Math.max(0, n - 4); i < n; i += 1) {
    parts.push(eaHistorialRowFingerprint(hist[i]));
  }
  return parts.join('|');
}

function countVitalPointValues(points, key) {
  var count = 0;
  for (var j = 0; j < points.length; j++) {
    if (points[j].vitalPoint[key]) count += 1;
  }
  return count;
}

function scanFamilyChartReady(histAsc, keys) {
  var points = buildSharedVitalRows(histAsc, keys);
  if (points.length < 2) return false;
  for (var k = 0; k < keys.length; k++) {
    if (countVitalPointValues(points, keys[k]) >= 2) return true;
  }
  return false;
}

/** All vital keys that appear as a graphable row in the Gráficas modal. */
const EA_ALL_VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/**
 * One chart point per registered reading, ascending by time: the shared time
 * axis for a group of rows that must line up under one crosshair. Reading N of
 * each sign in a registro lands on the same point; a reading with an «Alterado»
 * time sits at that time, the rest at the registro time.
 * @param {unknown[]} histAsc
 * @param {readonly string[]} [keys]
 * @returns {{ recordedAt: string, ms: number, vitalPoint: Record<string, { value: number, altered: boolean }> }[]}
 */
export function buildSharedVitalRows(histAsc, keys) {
  var use = keys || EA_ALL_VITAL_KEYS;
  var points = [];
  for (var ri = 0; ri < histAsc.length; ri++) {
    var row = /** @type {any} */ (histAsc[ri]);
    if (!row || typeof row !== 'object') continue;
    var series = vitalSeriesFromMedicion(row);
    var n = 0;
    use.forEach(function (k) {
      n = Math.max(n, (series[k] || []).length);
    });
    for (var i = 0; i < n; i++) {
      var vitalPoint = {};
      var found = false;
      var time = '';
      use.forEach(function (k) {
        var rd = (series[k] || [])[i];
        if (!rd || !Number.isFinite(rd.value)) return;
        vitalPoint[k] = { value: rd.value, altered: isVitalAltered(k, rd.value) || !!rd.time };
        found = true;
        if (!time && rd.time) time = rd.time;
      });
      if (!found) continue;
      var ms = gluPointMs(row.recordedAt != null ? String(row.recordedAt) : '', time, true);
      points.push({
        recordedAt: ms ? new Date(ms).toISOString() : String(row.recordedAt || ''),
        ms: ms,
        vitalPoint: vitalPoint,
      });
    }
  }
  // Array.sort is stable: readings with the same time keep their registro order.
  return points.sort(function (a, b) {
    return a.ms - b.ms;
  });
}

/**
 * One vital's values aligned to `rows` (null where that point has no value for
 * this key, so every row in a shared-axis group stays index-aligned).
 * @param {ReturnType<typeof buildSharedVitalRows>} rows
 * @param {string} key
 * @returns {{ values: (number | null)[], altered: boolean[] }}
 */
export function buildAlignedVitalSeries(rows, key) {
  /** @type {(number | null)[]} */
  var values = [];
  /** @type {boolean[]} */
  var altered = [];
  for (var i = 0; i < rows.length; i++) {
    var pt = rows[i].vitalPoint[key];
    values.push(pt ? pt.value : null);
    altered.push(pt ? pt.altered : false);
  }
  return { values: values, altered: altered };
}

/**
 * Axis tick text for a shared row of "dd/mm hh:mm" labels: the day is
 * written only the first time it appears, and the hour only on days that
 * have more than one reading (avoids repeating "23/09 00:00" per row).
 * @param {string[]} labels
 * @returns {{ day: string, hour: string }[]}
 */
export function buildEaAxisTicks(labels) {
  /** @type {Record<string, number>} */
  var perDay = {};
  for (var i = 0; i < labels.length; i++) {
    var d0 = String(labels[i] || '').slice(0, 5);
    perDay[d0] = (perDay[d0] || 0) + 1;
  }
  /** @type {Record<string, boolean>} */
  var seen = {};
  return labels.map(function (l) {
    var s = String(l || '');
    var day = s.slice(0, 5);
    var hour = s.slice(6);
    var first = !seen[day];
    seen[day] = true;
    return { day: first ? day : '', hour: perDay[day] > 1 ? hour : '' };
  });
}

/**
 * Balance hídrico grouped by calendar day (not per-turn): totals in/out per
 * day, the day's net, and the running (cumulative) total since ingreso.
 * @param {unknown[]} histAsc
 * @returns {{ days: string[], ing: number[], egr: number[], net: number[], cumulative: number[] }}
 */
export function buildDailyBalanceSeries(histAsc) {
  /** @type {string[]} */
  var days = [];
  /** @type {Record<string, { ing: number, egr: number }>} */
  var map = {};
  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    var io =
      /** @type {any} */ (row).io && typeof /** @type {any} */ (row).io === 'object'
        ? /** @type {any} */ (row).io
        : {};
    if (!hasIoPair(io)) continue;
    var day = formatChartLabel(/** @type {any} */ (row).recordedAt).slice(0, 5);
    if (!map[day]) {
      map[day] = { ing: 0, egr: 0 };
      days.push(day);
    }
    map[day].ing += Number(io.ing);
    map[day].egr += Number(io.egr);
  }
  var ing = days.map(function (d) {
    return map[d].ing;
  });
  var egr = days.map(function (d) {
    return map[d].egr;
  });
  var net = ing.map(function (v, i2) {
    return v - egr[i2];
  });
  var running = 0;
  var cumulative = net.map(function (v) {
    running += v;
    return running;
  });
  return { days: days, ing: ing, egr: egr, net: net, cumulative: cumulative };
}

/**
 * Lightweight readiness scan — no Chart.js datasets (panel summary strip).
 * @param {unknown} monitoreo
 */
export function scanEaChartsSummary(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var vitalsReady = false;
  for (var fi = 0; fi < VITAL_FAMILIES.length; fi += 1) {
    if (scanFamilyChartReady(histAsc, VITAL_FAMILIES[fi].keys)) {
      vitalsReady = true;
      break;
    }
  }
  var gluSeries = buildGluSeries(histAsc, undefined, { forCharts: true });
  var ioData = buildIoChartData(histAsc);
  return {
    measurementCount: histAsc.length,
    vitalsReady: vitalsReady,
    gluReady: gluSeries.values.length >= 2,
    gluLatest: gluSeries.values.length ? gluSeries.values[gluSeries.values.length - 1] : null,
    gluPointCount: gluSeries.values.length,
    ioReady: ioData.labels.length >= 2,
    ioPointCount: ioData.labels.length,
    ioTurn:
      ioData.labels.length >= 2 && ioData.turnBalance.length
        ? ioData.turnBalance[ioData.turnBalance.length - 1]
        : null,
  };
}
