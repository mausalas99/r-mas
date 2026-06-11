import { isVitalAltered, isGlucometriaMarkedAltered } from './estado-actual-ranges.mjs';
import { gluPointMs, isGluPointInRegistroWindow } from './estado-actual-registro-defaults.mjs';

/** @type {readonly string[]} */
const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/** @type {Record<string, string>} */
const VITAL_LABELS = {
  tas: 'TAS',
  tad: 'TAD',
  fc: 'FC',
  fr: 'FR',
  temp: 'Temp',
  sat: 'SatO₂',
};

/** @type {readonly { id: string, title: string, keys: readonly string[] }[]} */
const VITAL_FAMILIES = [
  { id: 'hemo', title: 'Hemodinámico', keys: ['tas', 'tad', 'fc'] },
  { id: 'resp', title: 'Respiratorio', keys: ['fr', 'sat'] },
  { id: 'metab', title: 'Metabólico', keys: ['temp'] },
];

const VITAL_COLOR_TOKENS = [
  '--ea-chart-vital-1',
  '--ea-chart-vital-2',
  '--ea-chart-vital-3',
  '--ea-chart-vital-4',
  '--ea-chart-vital-5',
  '--ea-chart-vital-6',
];

/** Display cap (like TREND_DETAIL_DOWNSAMPLE) — full series kept for tooltips. */
const EA_CHART_DISPLAY_POINTS = 100;

const EA_CHART_CANVAS_HEIGHT = 200;
const EA_CHART_IO_CANVAS_HEIGHT = 260;
const EA_CHART_VITALS_CANVAS_HEIGHT = 220;

const CHART_TOKEN_FALLBACKS = {
  '--ea-chart-vital-1': '#4a52e8',
  '--ea-chart-vital-2': '#c62828',
  '--ea-chart-vital-3': '#047857',
  '--ea-chart-vital-4': '#b45309',
  '--ea-chart-vital-5': '#0891b2',
  '--ea-chart-vital-6': '#7c3aed',
  '--ea-chart-glu': '#047857',
  '--ea-chart-io-ing': '#60a5fa',
  '--ea-chart-io-egr': '#f87171',
  '--ea-chart-io-balance': '#4a52e8',
  '--ea-chart-altered': '#b45309',
};

/** @type {Record<string, string> | null} */
var chartColorCache = null;

function ensureChartColorCache() {
  if (chartColorCache) return chartColorCache;
  /** @type {Record<string, string>} */
  var out = {};
  Object.keys(CHART_TOKEN_FALLBACKS).forEach(function (token) {
    var fallback = CHART_TOKEN_FALLBACKS[token] || '#4a52e8';
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
function chartColor(token) {
  var cache = ensureChartColorCache();
  return cache[token] || CHART_TOKEN_FALLBACKS[token] || '#4a52e8';
}

/**
 * @param {number} index
 * @returns {string}
 */
function vitalSeriesColor(index) {
  var token = VITAL_COLOR_TOKENS[index % VITAL_COLOR_TOKENS.length];
  return chartColor(token);
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
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
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
 * @returns {unknown[]}
 */
function sliceHistForCharts(histAsc) {
  if (histAsc.length <= EA_CHART_MAX_MEDICIONES) return histAsc;
  return histAsc.slice(histAsc.length - EA_CHART_MAX_MEDICIONES);
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
 * @param {unknown[]} histAsc
 * @param {string} key
 */
export function buildVitalsSeries(histAsc, key) {
  /** @type {string[]} */
  var labels = [];
  /** @type {(number | null)[]} */
  var values = [];
  /** @type {boolean[]} */
  var alteredFlags = [];

  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    var vit =
      /** @type {any} */ (row).vitals && typeof /** @type {any} */ (row).vitals === 'object'
        ? /** @type {any} */ (/** @type {any} */ (row).vitals)
        : {};
    var raw = vit[key];
    if (raw == null || raw === '') continue;
    var n = Number(raw);
    if (!Number.isFinite(n)) continue;
    var rowAlt =
      /** @type {any} */ (row).alteredAt && typeof /** @type {any} */ (row).alteredAt === 'object'
        ? /** @type {Record<string, string>} */ (/** @type {any} */ (row).alteredAt)
        : {};
    var altered = isVitalAltered(key, raw) || !!(rowAlt && rowAlt[key]);
    var label = formatChartLabel(/** @type {any} */ (row).recordedAt);
    if (rowAlt && rowAlt[key]) {
      label = String(rowAlt[key]) + ' · ' + label;
    }
    labels.push(label);
    values.push(n);
    alteredFlags.push(altered);
  }

  return { labels, values, alteredFlags };
}

/**
 * @param {unknown[]} histAsc
 * @param {readonly string[]} keys
 */
function buildVitalsFamilyData(histAsc, keys) {
  /** @type {unknown[]} */
  var rows = [];
  for (var ri = 0; ri < histAsc.length; ri++) {
    var row = histAsc[ri];
    if (!row || typeof row !== 'object') continue;
    var vit =
      /** @type {any} */ (row).vitals && typeof /** @type {any} */ (row).vitals === 'object'
        ? /** @type {any} */ (/** @type {any} */ (row).vitals)
        : {};
    var hasAny = false;
    for (var ki = 0; ki < keys.length; ki++) {
      var raw = vit[keys[ki]];
      if (raw != null && raw !== '') {
        hasAny = true;
        break;
      }
    }
    if (hasAny) rows.push(row);
  }
  if (rows.length < 2) return null;

  /** @type {string[]} */
  var labels = rows.map(function (r) {
    return formatChartLabel(/** @type {any} */ (r).recordedAt);
  });

  /** @type {object[]} */
  var datasets = [];
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    /** @type {(number | null)[]} */
    var values = [];
    /** @type {boolean[]} */
    var alteredFlags = [];
    var count = 0;
    for (var j = 0; j < rows.length; j++) {
      var r2 = rows[j];
      var vit2 =
        /** @type {any} */ (r2).vitals && typeof /** @type {any} */ (r2).vitals === 'object'
          ? /** @type {any} */ (/** @type {any} */ (r2).vitals)
          : {};
      var raw2 = vit2[key];
      if (raw2 == null || raw2 === '') {
        values.push(null);
        alteredFlags.push(false);
        continue;
      }
      var n = Number(raw2);
      if (!Number.isFinite(n)) {
        values.push(null);
        alteredFlags.push(false);
        continue;
      }
      values.push(n);
      count++;
      var rowAlt =
        /** @type {any} */ (r2).alteredAt && typeof /** @type {any} */ (r2).alteredAt === 'object'
          ? /** @type {Record<string, string>} */ (/** @type {any} */ (r2).alteredAt)
          : {};
      alteredFlags.push(isVitalAltered(key, raw2) || !!(rowAlt && rowAlt[key]));
    }
    if (count < 2) continue;
    var color = vitalSeriesColor(k);
    var ds = lineDataset(labels, values, alteredFlags, color);
    ds.label = VITAL_LABELS[key] || key;
    datasets.push(ds);
  }

  if (!datasets.length) return null;
  return { labels: labels, datasets: datasets };
}

/**
 * @param {unknown[]} histAsc
 * @param {Date} [now]
 */
/**
 * @param {Array<{ ms: number, label: string, value: number, altered: boolean }>} points
 * @param {string} recordedAt
 * @param {unknown[]} readings
 * @param {Date} [now]
 */
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
    var whenLabel = timeHm || formatChartLabel(recordedAt);
    points.push({
      ms: ms,
      label: whenLabel + ' · ' + formatChartLabel(recordedAt),
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
 * @param {HTMLElement | null} mountEl
 */
export function destroyEstadoActualCharts(mountEl) {
  if (!mountEl) return;
  var charts = mountEl._eaCharts;
  if (Array.isArray(charts)) {
    charts.forEach(function (ch) {
      try {
        if (ch && typeof ch.destroy === 'function') ch.destroy();
      } catch (_e) {
        /* ignore */
      }
    });
  }
  mountEl._eaCharts = [];
  mountEl._eaChartsSig = '';
  mountEl._eaChartsLayoutKey = '';
  mountEl._eaChartSlotIds = [];
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function eaHistorialRowFingerprint(row) {
  if (!row || typeof row !== 'object') return '';
  /** @type {any} */
  var r = row;
  var vit = r.vitals && typeof r.vitals === 'object' ? r.vitals : {};
  var io = r.io && typeof r.io === 'object' ? r.io : {};
  var gluN = Array.isArray(r.glucometrias) ? r.glucometrias.length : 0;
  var bombaN = Array.isArray(r.bombaInsulina) ? r.bombaInsulina.length : 0;
  return (
    String(r.id || '') +
    '@' +
    String(r.recordedAt || '') +
    ':' +
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
    String(vit.sat || '') +
    ':' +
    String(io.ing || '') +
    '/' +
    String(io.egr || '') +
    ':' +
    gluN +
    '/' +
    bombaN
  );
}

/**
 * @param {unknown[]} histAsc
 * @returns {string}
 */
function buildEaChartsSignatureFromHist(histAsc) {
  var parts = ['n' + histAsc.length];
  for (var i = 0; i < histAsc.length; i += 1) {
    parts.push(eaHistorialRowFingerprint(histAsc[i]));
  }
  return parts.join('|');
}

/**
 * @param {unknown[]} hist
 * @returns {string}
 */
function historialChartRevision(hist) {
  var n = hist.length;
  if (!n) return '0';
  var parts = ['n' + n];
  for (var i = Math.max(0, n - 4); i < n; i += 1) {
    parts.push(eaHistorialRowFingerprint(hist[i]));
  }
  return parts.join('|');
}

/**
 * @param {unknown[]} histAsc
 * @param {readonly string[]} keys
 * @returns {boolean}
 */
function scanFamilyChartReady(histAsc, keys) {
  /** @type {unknown[]} */
  var rows = [];
  for (var ri = 0; ri < histAsc.length; ri++) {
    var row = histAsc[ri];
    if (!row || typeof row !== 'object') continue;
    var vit =
      /** @type {any} */ (row).vitals && typeof /** @type {any} */ (row).vitals === 'object'
        ? /** @type {any} */ (/** @type {any} */ (row).vitals)
        : {};
    var hasAny = false;
    for (var ki = 0; ki < keys.length; ki++) {
      var raw = vit[keys[ki]];
      if (raw != null && raw !== '') {
        hasAny = true;
        break;
      }
    }
    if (hasAny) rows.push(row);
  }
  if (rows.length < 2) return false;
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var count = 0;
    for (var j = 0; j < rows.length; j++) {
      var r2 = rows[j];
      var vit2 =
        /** @type {any} */ (r2).vitals && typeof /** @type {any} */ (r2).vitals === 'object'
          ? /** @type {any} */ (/** @type {any} */ (r2).vitals)
          : {};
      var raw2 = vit2[key];
      if (raw2 == null || raw2 === '') continue;
      if (!Number.isFinite(Number(raw2))) continue;
      count += 1;
      if (count >= 2) return true;
    }
  }
  return false;
}

/**
 * Lightweight readiness scan — no Chart.js datasets (panel summary strip).
 * @param {unknown} monitoreo
 */
function scanEaChartsSummary(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var chartHist = sliceHistForCharts(histAsc);
  var vitalsReady = false;
  for (var fi = 0; fi < VITAL_FAMILIES.length; fi += 1) {
    if (scanFamilyChartReady(chartHist, VITAL_FAMILIES[fi].keys)) {
      vitalsReady = true;
      break;
    }
  }
  var gluSeries = buildGluSeries(chartHist, undefined, { forCharts: true });
  var ioData = buildIoChartData(chartHist);
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

/**
 * @param {unknown} monitoreo
 * @returns {ReturnType<typeof prepareEaChartBundle>}
 */
function getCachedEaChartBundle(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var rev = historialChartRevision(hist);
  if (m._eaChartBundle && m._eaChartBundleRev === rev) {
    return m._eaChartBundle;
  }
  var bundle = prepareEaChartBundle(monitoreo);
  m._eaChartBundleRev = rev;
  m._eaChartBundle = bundle;
  return bundle;
}

/**
 * @param {unknown} monitoreo
 * @returns {{
 *   histAsc: unknown[],
 *   slotData: Record<string, { labels: string[], datasets: object[] }>,
 *   layoutKey: string,
 *   signature: string,
 *   summary: object
 * }}
 */
function prepareEaChartBundle(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var chartHist = sliceHistForCharts(histAsc);
  /** @type {Record<string, { labels: string[], datasets: object[] }>} */
  var slotData = {};
  var layoutParts = [];
  var vitalsReady = false;

  VITAL_FAMILIES.forEach(function (fam) {
    var famData = buildVitalsFamilyData(chartHist, fam.keys);
    layoutParts.push(fam.id + ':' + (famData ? '1' : '0'));
    if (famData) {
      vitalsReady = true;
      slotData['vital:' + fam.id] = { labels: famData.labels, datasets: famData.datasets };
    }
  });

  var gluSeries = buildGluSeries(chartHist, undefined, { forCharts: true });
  layoutParts.push('g' + gluSeries.values.length);
  if (gluSeries.values.length >= 2) {
    var gluColor = chartColor('--ea-chart-glu');
    var gluDs = lineDataset(gluSeries.labels, gluSeries.values, gluSeries.alteredFlags || [], gluColor);
    gluDs.label = 'Glu (mg/dL)';
    slotData.glu = {
      labels: gluSeries.labels,
      datasets: [gluDs],
    };
  }

  var ioData = buildIoChartData(chartHist);
  layoutParts.push('i' + ioData.labels.length);
  if (ioData.labels.length >= 2) {
    slotData.io = {
      labels: ioData.labels,
      datasets: [
        { label: 'Ingresos', data: ioData.ing },
        { label: 'Egresos', data: ioData.egr },
        {
          type: 'line',
          label: 'Balance global',
          data: ioData.globalBalance,
        },
      ],
    };
  }

  var summary = scanEaChartsSummary(monitoreo);
  summary.vitalsReady = vitalsReady;

  return {
    histAsc: histAsc,
    chartHist: chartHist,
    slotData: slotData,
    layoutKey: layoutParts.join('|'),
    signature: buildEaChartsSignatureFromHist(chartHist),
    summary: summary,
  };
}

/**
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaChartsLayoutKey(monitoreo) {
  return getCachedEaChartBundle(monitoreo).layoutKey;
}

/**
 * @param {HTMLElement} mountEl
 * @param {unknown} monitoreo
 * @returns {boolean}
 */
export function updateEstadoActualChartsInPlace(mountEl, monitoreo, slotDataIn) {
  var charts = mountEl._eaCharts;
  var slotIds = mountEl._eaChartSlotIds;
  if (!Array.isArray(charts) || !Array.isArray(slotIds) || charts.length !== slotIds.length) {
    return false;
  }
  var slotData = slotDataIn || getCachedEaChartBundle(monitoreo).slotData;

  for (var i = 0; i < charts.length; i += 1) {
    var chart = charts[i];
    var slotId = slotIds[i];
    var next = slotData[slotId];
    if (!chart || !chart.data || !next) return false;
    chart.data.labels = next.labels;
    var dsIn = next.datasets || [];
    for (var d = 0; d < dsIn.length; d += 1) {
      if (!chart.data.datasets[d]) {
        chart.data.datasets[d] = dsIn[d];
      } else {
        var target = chart.data.datasets[d];
        var patch = dsIn[d];
        target.data = patch.data;
        if (patch.label != null) target.label = patch.label;
        if (patch.borderColor != null) target.borderColor = patch.borderColor;
        if (patch.backgroundColor != null) target.backgroundColor = patch.backgroundColor;
        if (patch.type != null) target.type = patch.type;
        if (patch.borderDash != null) target.borderDash = patch.borderDash;
        if (patch.yAxisID != null) target.yAxisID = patch.yAxisID;
        if (patch.pointRadius != null) target.pointRadius = patch.pointRadius;
        if (patch.pointBackgroundColor != null) {
          target.pointBackgroundColor = patch.pointBackgroundColor;
        }
        if (patch.pointBorderColor != null) target.pointBorderColor = patch.pointBorderColor;
        if (patch.tension != null) target.tension = patch.tension;
      }
    }
    if (typeof chart.update === 'function') chart.update('none');
  }
  return true;
}

/**
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaChartsSignature(monitoreo) {
  return getCachedEaChartBundle(monitoreo).signature;
}

/**
 * @param {unknown} ChartCtor
 * @returns {unknown}
 */
function resolveChartCtor(ChartCtor) {
  if (ChartCtor) return ChartCtor;
  if (typeof globalThis !== 'undefined' && /** @type {any} */ (globalThis).Chart) {
    return /** @type {any} */ (globalThis).Chart;
  }
  if (typeof window !== 'undefined' && /** @type {any} */ (window).Chart) {
    return /** @type {any} */ (window).Chart;
  }
  return null;
}

/**
 * @param {string[]} labels
 * @param {(number | null)[]} values
 * @param {boolean[]} alteredFlags
 * @param {string} color
 */
function lineDataset(labels, values, alteredFlags, color) {
  var hasAltered = false;
  for (var ai = 0; ai < alteredFlags.length; ai += 1) {
    if (alteredFlags[ai]) {
      hasAltered = true;
      break;
    }
  }
  if (!hasAltered) {
    return {
      label: '',
      data: values,
      borderColor: color,
      backgroundColor: color,
      pointRadius: 3,
      tension: 0.25,
      spanGaps: true,
    };
  }
  var alteredColor = chartColor('--ea-chart-altered');
  var pointRadius = values.map(function (_v, i) {
    return alteredFlags[i] ? 6 : 3;
  });
  var pointBackgroundColor = values.map(function (_v, i) {
    return alteredFlags[i] ? alteredColor : color;
  });
  return {
    label: '',
    data: values,
    borderColor: color,
    backgroundColor: color,
    pointRadius: pointRadius,
    pointBackgroundColor: pointBackgroundColor,
    pointBorderColor: pointBackgroundColor,
    tension: 0.25,
    spanGaps: true,
  };
}

/** @param {object} [extra] */
function eaLineChartOptions(extra) {
  return Object.assign(
    {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      plugins: {
        decimation: { enabled: true, algorithm: 'lttb', samples: 72 },
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: { animation: false },
      },
      elements: {
        point: { radius: 2, hoverRadius: 4 },
        line: { borderWidth: 2 },
      },
      scales: {
        y: { grace: '5%', ticks: { font: { size: 11 }, maxTicksLimit: 6 } },
        x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 8 } },
      },
    },
    extra || {}
  );
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} wrap
 * @param {boolean} [ioChart]
 */
function sizeEaChartCanvas(canvas, wrap, ioChart) {
  var box = wrap.querySelector('.ea-chart-canvas-wrap');
  var width = box && box.clientWidth > 0 ? box.clientWidth : wrap.clientWidth || 320;
  var height = ioChart ? EA_CHART_IO_CANVAS_HEIGHT : EA_CHART_CANVAS_HEIGHT;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
}

/**
 * @param {HTMLElement} wrap
 * @param {string} title
 * @param {unknown} ChartCtor
 * @param {object} config
 * @param {HTMLElement} mountEl
 * @param {unknown[]} chartStore
 */
function mountChart(wrap, title, ChartCtor, config, mountEl, chartStore, slotId, ioChart) {
  wrap.innerHTML =
    '<h4 class="ea-chart-subtitle">' +
    title +
    '</h4>' +
    '<div class="ea-chart-canvas-wrap"><canvas></canvas></div>';
  var canvas = /** @type {HTMLCanvasElement | null} */ (wrap.querySelector('canvas'));
  if (!canvas) return;
  try {
    sizeEaChartCanvas(canvas, wrap, ioChart);
    var chart = new /** @type {any} */ (ChartCtor)(canvas, config);
    chart._eaSlotId = slotId;
    chartStore.push(chart);
    mountEl._eaCharts = chartStore;
  } catch (_e) {
    wrap.innerHTML = '<p class="ea-muted">No se pudo dibujar la gráfica.</p>';
  }
}

/**
 * @param {Array<{ wrap: HTMLElement, title: string, config: object, slotId: string, ioChart?: boolean }>} queue
 * @param {unknown} ChartCtor
 * @param {HTMLElement} mountEl
 * @param {unknown[]} chartStore
 * @param {() => void} [onDone]
 */
function mountChartsProgressive(queue, ChartCtor, mountEl, chartStore, onDone) {
  var index = 0;
  function step() {
    if (index >= queue.length) {
      if (onDone) onDone();
      return;
    }
    var job = queue[index];
    index += 1;
    mountChart(job.wrap, job.title, ChartCtor, job.config, mountEl, chartStore, job.slotId, job.ioChart);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * @param {unknown} monitoreo
 */
export function buildEaChartsSummary(monitoreo) {
  return scanEaChartsSummary(monitoreo);
}

/**
 * Revision for historial-only chart summary invalidation (panel patches).
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaHistorialChartsRevision(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  return historialChartRevision(hist);
}

function eaChartsSummaryTile(label, value, hint) {
  return (
    '<div class="ea-charts-summary-tile">' +
    '<span class="ea-charts-summary-tile-label">' +
    label +
    '</span>' +
    '<span class="ea-charts-summary-tile-value">' +
    value +
    '</span>' +
    (hint ? '<span class="ea-charts-summary-tile-hint">' + hint + '</span>' : '') +
    '</div>'
  );
}

/**
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function renderEaChartsSummarySection(monitoreo) {
  var summary = scanEaChartsSummary(monitoreo);
  var vitalsValue = summary.vitalsReady ? 'Listo' : '—';
  var vitalsHint = summary.vitalsReady
    ? summary.measurementCount + ' mediciones'
    : 'Mín. 2 mediciones con signos';
  var gluValue = summary.gluReady
    ? String(summary.gluLatest) + ' mg/dL'
    : summary.gluPointCount === 1
      ? '1 punto'
      : '—';
  var gluHint = summary.gluReady
    ? summary.gluPointCount + ' puntos'
    : 'Mín. 2 glucometrías';
  var ioValue =
    summary.ioReady && summary.ioTurn != null
      ? (summary.ioTurn >= 0 ? '+' : '') + summary.ioTurn + ' cc'
      : '—';
  var ioHint = summary.ioReady
    ? summary.ioPointCount + ' registros I/O'
    : 'Mín. 2 pares ingreso/egreso';
  var canOpen =
    summary.measurementCount >= 2 &&
    (summary.vitalsReady || summary.gluReady || summary.ioReady);
  return (
    '<section class="ea-section ea-charts-summary" id="ea-charts-summary">' +
    '<div class="ea-charts-summary-head">' +
    '<h3 class="ea-section-title">Gráficas de monitoreo</h3>' +
    (canOpen
      ? '<button type="button" class="ea-btn ea-btn--ghost ea-charts-open-btn" onclick="openEstadoActualChartsModal()">' +
        '<svg class="ea-charts-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3 17l6-6 4 4 8-10"/>' +
        '<path d="M3 12l5-4 4 3 9-7"/>' +
        '</svg>' +
        '<span>Ver gráficas</span></button>'
      : '<span class="ea-muted ea-charts-summary-empty">Registra al menos 2 mediciones para ver gráficas.</span>') +
    '</div>' +
    '<div class="ea-charts-summary-grid">' +
    eaChartsSummaryTile('Signos vitales', vitalsValue, vitalsHint) +
    eaChartsSummaryTile('Glucometrías', gluValue, gluHint) +
    eaChartsSummaryTile('Balance hídrico', ioValue, ioHint) +
    '</div>' +
    '</section>'
  );
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {unknown} monitoreo
 * @param {unknown} [ChartCtor]
 * @param {{ showTitle?: boolean } | undefined} [opts]
 */
export function renderEstadoActualCharts(mountEl, monitoreo, ChartCtor, opts) {
  opts = opts || {};
  var showTitle = opts.showTitle === true;
  if (!mountEl) return;
  var bundle = getCachedEaChartBundle(monitoreo);
  var sig = bundle.signature;
  var slotData = bundle.slotData;
  if (mountEl._eaChartsSig === sig && mountEl.querySelector('.ea-charts-grid')) return;
  var layoutKey = bundle.layoutKey;
  if (
    mountEl._eaChartsLayoutKey === layoutKey &&
    mountEl._eaChartsSig !== sig &&
    updateEstadoActualChartsInPlace(mountEl, monitoreo, slotData)
  ) {
    mountEl._eaChartsSig = sig;
    return;
  }
  destroyEstadoActualCharts(mountEl);

  var Chart = resolveChartCtor(ChartCtor);
  var histAsc = bundle.histAsc;

  var hasEnough = histAsc.length >= 2;
  if (!hasEnough) {
    mountEl.innerHTML =
      '<p class="ea-muted ea-charts-empty">Registra al menos 2 mediciones para ver gráficas.</p>';
    return;
  }

  if (!Chart) {
    mountEl.innerHTML =
      '<p class="ea-muted ea-charts-empty">Chart.js no está disponible. Recarga la aplicación.</p>';
    return;
  }

  var titleHtml = showTitle ? '<h3 class="ea-section-title">Gráficas de monitoreo</h3>' : '';
  mountEl.innerHTML = titleHtml + '<div class="ea-charts-grid"></div>';
  var grid = mountEl.querySelector('.ea-charts-grid');
  if (!grid) {
    return;
  }

  /** @type {unknown[]} */
  var chartStore = [];
  /** @type {Array<{ wrap: HTMLElement, title: string, config: object, slotId: string, ioChart?: boolean }>} */
  var mountQueue = [];

  // --- Signos vitales (por familia) ---
  var svBlock = document.createElement('div');
  svBlock.className = 'ea-chart-block';
  svBlock.innerHTML = '<h4 class="ea-chart-block-title">Signos vitales</h4><div class="ea-chart-family-grid"></div>';
  var svGrid = svBlock.querySelector('.ea-chart-family-grid');
  var svRendered = false;

  VITAL_FAMILIES.forEach(function (fam) {
    var famData = slotData['vital:' + fam.id];
    if (!famData || !svGrid) return;
    svRendered = true;

    var famWrap = document.createElement('div');
    famWrap.className = 'ea-chart-wrap';
    svGrid.appendChild(famWrap);
    mountQueue.push({
      wrap: famWrap,
      title: fam.title,
      slotId: 'vital:' + fam.id,
      config: {
        type: 'line',
        data: { labels: famData.labels, datasets: famData.datasets },
        options: eaLineChartOptions(),
      },
    });
  });

  if (!svRendered && svBlock.querySelector('.ea-chart-family-grid')) {
    svBlock.querySelector('.ea-chart-family-grid').innerHTML =
      '<p class="ea-muted">Sin suficientes puntos de signos vitales (mín. 2 por parámetro).</p>';
  }
  grid.appendChild(svBlock);

  // --- Glucometrías ---
  var gluBlock = document.createElement('div');
  gluBlock.className = 'ea-chart-block';
  gluBlock.innerHTML = '<h4 class="ea-chart-block-title">Glucometrías</h4>';
  var gluData = slotData.glu;
  if (gluData) {
    var gluWrap = document.createElement('div');
    gluWrap.className = 'ea-chart-wrap';
    gluBlock.appendChild(gluWrap);
    mountQueue.push({
      wrap: gluWrap,
      title: 'Serie temporal',
      slotId: 'glu',
      config: {
        type: 'line',
        data: gluData,
        options: eaLineChartOptions({
          plugins: {
            decimation: { enabled: true, algorithm: 'lttb', samples: 96 },
            legend: { display: false },
          },
          scales: {
            y: { grace: '5%', title: { display: true, text: 'mg/dL', font: { size: 11 } } },
            x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
          },
        }),
      },
    });
  } else {
    gluBlock.innerHTML +=
      '<p class="ea-muted">Sin suficientes glucometrías (mín. 2 puntos).</p>';
  }
  grid.appendChild(gluBlock);

  // --- Balance hídrico ---
  var ioBlock = document.createElement('div');
  ioBlock.className = 'ea-chart-block';
  ioBlock.innerHTML = '<h4 class="ea-chart-block-title">Balance hídrico</h4>';
  var ioSlot = slotData.io;
  if (ioSlot) {
    var ioWrap = document.createElement('div');
    ioWrap.className = 'ea-chart-wrap ea-chart-wrap--io';
    ioBlock.appendChild(ioWrap);
    mountQueue.push({
      wrap: ioWrap,
      title: 'Ingresos / egresos y balance global',
      slotId: 'io',
      ioChart: true,
      config: {
        type: 'bar',
        data: {
          labels: ioSlot.labels,
          datasets: [
            {
              label: 'Ingresos',
              data: ioSlot.datasets[0].data,
              backgroundColor: chartColor('--ea-chart-io-ing'),
              borderRadius: 4,
              order: 2,
            },
            {
              label: 'Egresos',
              data: ioSlot.datasets[1].data,
              backgroundColor: chartColor('--ea-chart-io-egr'),
              borderRadius: 4,
              order: 2,
            },
            {
              type: 'line',
              label: 'Balance global',
              data: ioSlot.datasets[2].data,
              borderColor: chartColor('--ea-chart-io-balance'),
              backgroundColor: chartColor('--ea-chart-io-balance'),
              borderDash: [6, 4],
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.25,
              yAxisID: 'y1',
              order: 1,
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'nearest', axis: 'x', intersect: false },
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, tooltip: { animation: false } },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'cc', font: { size: 11 } },
              ticks: { font: { size: 11 }, maxTicksLimit: 6 },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Balance acum.', font: { size: 11 } },
              ticks: { font: { size: 11 }, maxTicksLimit: 6 },
            },
            x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 8 } },
          },
        },
      },
    });
  } else {
    ioBlock.innerHTML +=
      '<p class="ea-muted">Sin suficientes registros de I/O con ingreso y egreso (mín. 2).</p>';
  }
  grid.appendChild(ioBlock);

  if (bundle.chartHist.length < histAsc.length) {
    var note = document.createElement('p');
    note.className = 'ea-muted ea-charts-window-note';
    note.textContent =
      'Mostrando las últimas ' + bundle.chartHist.length + ' de ' + histAsc.length + ' mediciones.';
    grid.insertBefore(note, grid.firstChild);
  }

  function finalizeChartStore() {
    mountEl._eaCharts = chartStore;
    mountEl._eaChartSlotIds = chartStore
      .map(function (ch) {
        return ch && ch._eaSlotId ? String(ch._eaSlotId) : '';
      })
      .filter(Boolean);
    mountEl._eaChartsLayoutKey = layoutKey;
    mountEl._eaChartsSig = sig;
  }

  if (!mountQueue.length) {
    finalizeChartStore();
    return;
  }

  mountChartsProgressive(mountQueue, Chart, mountEl, chartStore, finalizeChartStore);
}
