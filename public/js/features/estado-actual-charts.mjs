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
const EA_CHART_VITALS_CANVAS_HEIGHT = 210;

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
 * @param {number} length
 * @param {number} [maxPoints]
 * @returns {number[]}
 */
function buildEaDisplayIndices(length, maxPoints) {
  var slots = maxPoints == null ? EA_CHART_DISPLAY_POINTS : maxPoints;
  if (length <= slots) {
    /** @type {number[]} */
    var all = [];
    for (var i = 0; i < length; i += 1) all.push(i);
    return all;
  }
  /** @type {number[]} */
  var out = [];
  for (var j = 0; j < slots; j += 1) {
    out.push(Math.round((j * (length - 1)) / (slots - 1)));
  }
  return out;
}

/**
 * @param {string[]} labels
 * @param {(number | null)[]} values
 * @param {boolean[]} [alteredFlags]
 * @param {number} [maxPoints]
 */
export function downsampleEaChartSeries(labels, values, alteredFlags, maxPoints) {
  var indices = buildEaDisplayIndices(labels.length, maxPoints);
  return {
    labels: indices.map(function (i) {
      return labels[i];
    }),
    values: indices.map(function (i) {
      return values[i];
    }),
    alteredFlags: alteredFlags
      ? indices.map(function (i) {
          return !!alteredFlags[i];
        })
      : [],
    sourceIndices: indices,
    fullLabels: labels,
    fullValues: values,
  };
}

/**
 * @param {object} ds
 * @param {string[]} fullLabels
 * @param {Array<number | null>} fullValues
 * @param {number[]} sourceIndices
 */
function attachEaSeriesMetadata(ds, fullLabels, fullValues, sourceIndices) {
  ds._eaFullLabels = fullLabels;
  ds._eaFullValues = fullValues;
  ds._eaSourceIndices = sourceIndices;
}

/**
 * @param {{ labels: string[], datasets: object[] }} famData
 */
function displayVitalsFamilyData(famData) {
  if (famData.labels.length <= EA_CHART_DISPLAY_POINTS) {
    famData.datasets.forEach(function (ds) {
      var indices = buildEaDisplayIndices(famData.labels.length);
      attachEaSeriesMetadata(ds, famData.labels, ds.data, indices);
    });
    return famData;
  }
  var indices = buildEaDisplayIndices(famData.labels.length);
  var labels = indices.map(function (i) {
    return famData.labels[i];
  });
  var datasets = famData.datasets.map(function (ds) {
    var next = Object.assign({}, ds);
    next.data = indices.map(function (i) {
      return ds.data[i];
    });
    if (Array.isArray(ds.pointRadius)) {
      next.pointRadius = indices.map(function (i) {
        return ds.pointRadius[i];
      });
    }
    if (Array.isArray(ds.pointBackgroundColor)) {
      next.pointBackgroundColor = indices.map(function (i) {
        return ds.pointBackgroundColor[i];
      });
      next.pointBorderColor = next.pointBackgroundColor;
    }
    attachEaSeriesMetadata(next, famData.labels, ds.data, indices);
    return next;
  });
  return { labels: labels, datasets: datasets };
}

/**
 * @param {{ labels: string[], datasets: object[] }} gluData
 */
function displayGluChartData(gluData) {
  var ds = gluData.datasets[0];
  if (!ds) return gluData;
  var alteredFlags = Array.isArray(gluData._alteredFlags) ? gluData._alteredFlags : [];
  var sampled = downsampleEaChartSeries(
    gluData.labels,
    /** @type {number[]} */ (ds.data),
    alteredFlags,
    EA_CHART_DISPLAY_POINTS
  );
  var nextDs = lineDataset(
    sampled.labels,
    sampled.values,
    sampled.alteredFlags,
    ds.borderColor || chartColor('--ea-chart-glu')
  );
  nextDs.label = ds.label || 'Glu (mg/dL)';
  attachEaSeriesMetadata(nextDs, sampled.fullLabels, sampled.fullValues, sampled.sourceIndices);
  return { labels: sampled.labels, datasets: [nextDs] };
}

/**
 * @param {{ labels: string[], datasets: object[] }} ioSlot
 */
function displayIoChartData(ioSlot) {
  if (ioSlot.labels.length <= EA_CHART_DISPLAY_POINTS) return ioSlot;
  var indices = buildEaDisplayIndices(ioSlot.labels.length);
  var pick = function (arr) {
    return indices.map(function (i) {
      return arr[i];
    });
  };
  var fullLabels = ioSlot.labels;
  var fullIng = ioSlot.datasets[0].data;
  var fullEgr = ioSlot.datasets[1].data;
  var fullBal = ioSlot.datasets[2].data;
  var meta = { _eaFullLabels: fullLabels, _eaSourceIndices: indices };
  return {
    labels: pick(fullLabels),
    datasets: [
      Object.assign({ label: 'Ingresos', data: pick(fullIng) }, meta, { _eaFullValues: fullIng }),
      Object.assign({ label: 'Egresos', data: pick(fullEgr) }, meta, { _eaFullValues: fullEgr }),
      Object.assign(
        { type: 'line', label: 'Balance global', data: pick(fullBal) },
        meta,
        { _eaFullValues: fullBal }
      ),
    ],
  };
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
 * @param {HTMLElement} mountEl
 * @returns {Record<string, { layoutKey: string, charts: unknown[], slotIds: string[] }>}
 */
function ensureEaTabChartStores(mountEl) {
  if (!mountEl._eaTabChartStores || typeof mountEl._eaTabChartStores !== 'object') {
    mountEl._eaTabChartStores = {};
  }
  return mountEl._eaTabChartStores;
}

/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 * @param {string} tab
 * @returns {string}
 */
function eaTabLayoutKey(tab, slotData) {
  if (tab === 'vitals') {
    return VITAL_FAMILIES.map(function (fam) {
      return fam.id + ':' + (slotData['vital:' + fam.id] ? '1' : '0');
    }).join('|');
  }
  if (tab === 'glu') {
    return 'g' + (slotData.glu ? String(slotData.glu.labels.length) : '0');
  }
  if (tab === 'io') {
    return 'i' + (slotData.io ? String(slotData.io.labels.length) : '0');
  }
  return '';
}

/**
 * @param {HTMLElement} mountEl
 * @param {string} tab
 */
function destroyEaTabCharts(mountEl, tab) {
  var stores = ensureEaTabChartStores(mountEl);
  var entry = stores[tab];
  if (!entry || !Array.isArray(entry.charts)) {
    delete stores[tab];
    return;
  }
  entry.charts.forEach(function (ch) {
    try {
      if (ch && typeof ch.destroy === 'function') ch.destroy();
    } catch (_e) {
      /* ignore */
    }
  });
  delete stores[tab];
}

/**
 * @param {HTMLElement} mountEl
 */
function destroyAllEaTabCharts(mountEl) {
  var stores = mountEl._eaTabChartStores;
  if (!stores || typeof stores !== 'object') return;
  Object.keys(stores).forEach(function (tab) {
    destroyEaTabCharts(mountEl, tab);
  });
  mountEl._eaTabChartStores = {};
}

/**
 * @param {unknown[]} charts
 */
function resizeEaCharts(charts) {
  if (!Array.isArray(charts)) return;
  charts.forEach(function (ch) {
    try {
      if (ch && typeof ch.resize === 'function') ch.resize();
    } catch (_e) {
      /* ignore */
    }
  });
}

/**
 * @param {HTMLElement} mountEl
 * @param {string} tab
 */
function syncActiveEaChartsRef(mountEl, tab) {
  var stores = ensureEaTabChartStores(mountEl);
  var entry = stores[tab];
  if (!entry) {
    mountEl._eaCharts = [];
    mountEl._eaChartSlotIds = [];
    return;
  }
  mountEl._eaCharts = entry.charts;
  mountEl._eaChartSlotIds = entry.slotIds;
}

/**
 * @param {HTMLElement} mountEl
 * @param {string} tab
 * @param {string} tabLayoutKey
 * @param {unknown[]} chartStore
 */
function saveEaTabChartStore(mountEl, tab, tabLayoutKey, chartStore) {
  var slotIds = chartStore
    .map(function (ch) {
      return ch && /** @type {any} */ (ch)._eaSlotId ? String(/** @type {any} */ (ch)._eaSlotId) : '';
    })
    .filter(Boolean);
  ensureEaTabChartStores(mountEl)[tab] = {
    layoutKey: tabLayoutKey,
    charts: chartStore,
    slotIds: slotIds,
  };
  syncActiveEaChartsRef(mountEl, tab);
}

export function destroyEstadoActualCharts(mountEl) {
  if (!mountEl) return;
  destroyAllEaTabCharts(mountEl);
  mountEl._eaCharts = [];
  mountEl._eaChartSlotIds = [];
  mountEl._eaChartsSig = '';
  mountEl._eaChartsLayoutKey = '';
  mountEl._eaActiveChartTab = '';
  mountEl._eaChartsTabsWired = false;
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
  /** @type {Record<string, { labels: string[], datasets: object[] }>} */
  var slotData = {};
  var layoutParts = [];
  var vitalsReady = false;

  VITAL_FAMILIES.forEach(function (fam) {
    var famData = buildVitalsFamilyData(histAsc, fam.keys);
    layoutParts.push(fam.id + ':' + (famData ? '1' : '0'));
    if (famData) {
      vitalsReady = true;
      slotData['vital:' + fam.id] = { labels: famData.labels, datasets: famData.datasets };
    }
  });

  var gluSeries = buildGluSeries(histAsc, undefined, { forCharts: true });
  layoutParts.push('g' + gluSeries.values.length);
  if (gluSeries.values.length >= 2) {
    var gluColor = chartColor('--ea-chart-glu');
    var gluDs = lineDataset(gluSeries.labels, gluSeries.values, gluSeries.alteredFlags || [], gluColor);
    gluDs.label = 'Glu (mg/dL)';
    slotData.glu = {
      labels: gluSeries.labels,
      datasets: [gluDs],
      _alteredFlags: gluSeries.alteredFlags || [],
    };
  }

  var ioData = buildIoChartData(histAsc);
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
  m._eaChartsSummaryRev = historialChartRevision(hist);
  m._eaChartsSummary = summary;

  return {
    histAsc: histAsc,
    slotData: slotData,
    layoutKey: layoutParts.join('|'),
    signature: buildEaChartsSignatureFromHist(histAsc),
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
/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 * @param {string} slotId
 */
function displaySlotForChart(slotData, slotId) {
  if (slotId.indexOf('vital:') === 0) {
    var fam = slotData[slotId];
    return fam ? displayVitalsFamilyData(fam) : null;
  }
  if (slotId === 'glu') {
    return slotData.glu ? displayGluChartData(slotData.glu) : null;
  }
  if (slotId === 'io') {
    return slotData.io ? displayIoChartData(slotData.io) : null;
  }
  return slotData[slotId] || null;
}

/**
 * @param {unknown} chart
 * @param {string} slotId
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 * @returns {boolean}
 */
function patchEaChartFromSlot(chart, slotId, slotData) {
  /** @type {any} */
  var ch = chart;
  var next = displaySlotForChart(slotData, slotId);
  if (!ch || !ch.data || !next) return false;
  ch.data.labels = next.labels;
  var dsIn = next.datasets || [];
  for (var d = 0; d < dsIn.length; d += 1) {
    if (!ch.data.datasets[d]) {
      ch.data.datasets[d] = dsIn[d];
    } else {
      var target = ch.data.datasets[d];
      var patch = dsIn[d];
      target.data = patch.data;
      if (patch.label != null) target.label = patch.label;
      if (patch.borderColor != null) target.borderColor = patch.borderColor;
      if (patch.backgroundColor != null) target.backgroundColor = patch.backgroundColor;
      if (patch.type != null) target.type = patch.type;
      if (patch.borderDash != null) target.borderDash = patch.borderDash;
      if (patch.yAxisID != null) target.yAxisID = patch.yAxisID;
      if (patch.pointRadius != null) target.pointRadius = patch.pointRadius;
      if (patch.pointBackgroundColor != null) target.pointBackgroundColor = patch.pointBackgroundColor;
      if (patch.pointBorderColor != null) target.pointBorderColor = patch.pointBorderColor;
      if (patch.tension != null) target.tension = patch.tension;
    }
  }
  if (typeof ch.update === 'function') ch.update('none');
  return true;
}

export function updateEstadoActualChartsInPlace(mountEl, monitoreo, slotDataIn) {
  var slotData = slotDataIn || getCachedEaChartBundle(monitoreo).slotData;
  var stores = mountEl._eaTabChartStores;
  if (stores && typeof stores === 'object') {
    var storeKeys = Object.keys(stores);
    if (storeKeys.length) {
      for (var sk = 0; sk < storeKeys.length; sk += 1) {
        var entry = stores[storeKeys[sk]];
        if (!entry || !Array.isArray(entry.charts) || !Array.isArray(entry.slotIds)) return false;
        if (entry.charts.length !== entry.slotIds.length) return false;
        for (var i = 0; i < entry.charts.length; i += 1) {
          if (!patchEaChartFromSlot(entry.charts[i], entry.slotIds[i], slotData)) return false;
        }
      }
      syncActiveEaChartsRef(mountEl, mountEl._eaActiveChartTab || '');
      return true;
    }
  }

  var charts = mountEl._eaCharts;
  var slotIds = mountEl._eaChartSlotIds;
  if (!Array.isArray(charts) || !Array.isArray(slotIds) || charts.length !== slotIds.length) {
    return false;
  }
  for (var j = 0; j < charts.length; j += 1) {
    if (!patchEaChartFromSlot(charts[j], slotIds[j], slotData)) return false;
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

function eaChartDevicePixelRatio() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

function eaChartTooltipPlugin() {
  return {
    tooltip: {
      animation: false,
      callbacks: {
        title: function (items) {
          if (!items || !items.length) return '';
          var ds = items[0].dataset;
          var idx = items[0].dataIndex;
          var src =
            ds._eaSourceIndices && ds._eaSourceIndices[idx] != null ? ds._eaSourceIndices[idx] : idx;
          if (ds._eaFullLabels && ds._eaFullLabels[src] != null) return String(ds._eaFullLabels[src]);
          return String(items[0].label || '');
        },
        label: function (ctx) {
          var ds = ctx.dataset;
          var idx = ctx.dataIndex;
          var src =
            ds._eaSourceIndices && ds._eaSourceIndices[idx] != null ? ds._eaSourceIndices[idx] : idx;
          var val =
            ds._eaFullValues && ds._eaFullValues[src] != null ? ds._eaFullValues[src] : ctx.parsed.y;
          var label = ds.label || '';
          return label ? label + ': ' + val : String(val);
        },
      },
    },
  };
}

/** @param {object} [extra] */
function eaLineChartOptions(extra) {
  return Object.assign(
    {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      devicePixelRatio: eaChartDevicePixelRatio(),
      interaction: { mode: 'index', axis: 'x', intersect: false },
      layout: { padding: { bottom: 2 } },
      plugins: Object.assign(
        {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11 }, padding: 10 },
          },
        },
        eaChartTooltipPlugin()
      ),
      elements: {
        point: { radius: 2, hoverRadius: 4 },
        line: { borderWidth: 2 },
      },
      scales: {
        y: { grace: '5%', ticks: { font: { size: 11 }, maxTicksLimit: 6 } },
        x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
      },
    },
    extra || {}
  );
}

/**
 * @param {HTMLElement} wrap
 * @param {number} height
 * @returns {number}
 */
function eaChartCanvasWidth(wrap, height) {
  var box = wrap.querySelector('.ea-chart-canvas-wrap');
  var width = box && box.clientWidth > 0 ? box.clientWidth : wrap.clientWidth || 480;
  if (box) box.style.height = height + 'px';
  return width;
}

/**
 * @param {HTMLElement} wrap
 * @param {string} title
 * @param {unknown} ChartCtor
 * @param {object} config
 * @param {HTMLElement} mountEl
 * @param {unknown[]} chartStore
 */
function mountChart(wrap, title, ChartCtor, config, mountEl, chartStore, slotId, canvasHeight) {
  wrap.innerHTML =
    '<h4 class="ea-chart-subtitle">' +
    title +
    '</h4>' +
    '<div class="ea-chart-canvas-wrap"><canvas></canvas></div>';
  var canvas = /** @type {HTMLCanvasElement | null} */ (wrap.querySelector('canvas'));
  if (!canvas) return;
  try {
    eaChartCanvasWidth(wrap, canvasHeight || EA_CHART_CANVAS_HEIGHT);
    config.options = Object.assign({}, config.options, {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      devicePixelRatio: eaChartDevicePixelRatio(),
    });
    var chart = new /** @type {any} */ (ChartCtor)(canvas, config);
    chart._eaSlotId = slotId;
    chartStore.push(chart);
    mountEl._eaCharts = chartStore;
  } catch (_e) {
    wrap.innerHTML = '<p class="ea-muted">No se pudo dibujar la gráfica.</p>';
  }
}

/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 * @param {string} tab
 */
function eaChartTabHasData(slotData, tab) {
  if (tab === 'vitals') {
    return VITAL_FAMILIES.some(function (fam) {
      return !!slotData['vital:' + fam.id];
    });
  }
  if (tab === 'glu') return !!slotData.glu;
  if (tab === 'io') return !!slotData.io;
  return false;
}

/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 */
function defaultEaChartTab(slotData) {
  if (eaChartTabHasData(slotData, 'vitals')) return 'vitals';
  if (eaChartTabHasData(slotData, 'glu')) return 'glu';
  return 'io';
}

/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 */
function buildEaChartsTabShell(slotData) {
  /** @type {Array<{ id: string, label: string }>} */
  var tabs = [
    { id: 'vitals', label: 'Signos vitales' },
    { id: 'glu', label: 'Glucometrías' },
    { id: 'io', label: 'Balance hídrico' },
  ];
  var nav = tabs
    .map(function (t) {
      var has = eaChartTabHasData(slotData, t.id);
      return (
        '<button type="button" role="tab" class="ea-charts-tab" data-ea-chart-tab="' +
        t.id +
        '" aria-selected="false"' +
        (has ? '' : ' disabled') +
        '>' +
        t.label +
        '</button>'
      );
    })
    .join('');
  var panels = tabs
    .map(function (t) {
      return (
        '<div class="ea-charts-tabpanel" role="tabpanel" data-ea-chart-panel="' +
        t.id +
        '" hidden></div>'
      );
    })
    .join('');
  return (
    '<nav class="ea-charts-tabs" role="tablist" aria-label="Gráficas de monitoreo">' +
    nav +
    '</nav>' +
    '<div class="ea-charts-tabpanels">' +
    panels +
    '</div>'
  );
}

/**
 * @param {HTMLElement} mountEl
 * @param {string} tab
 * @param {ReturnType<typeof prepareEaChartBundle>} bundle
 * @param {unknown} ChartCtor
 * @param {string} layoutKey
 */
function activateEaChartTab(mountEl, tab, bundle, ChartCtor, layoutKey) {
  if (!mountEl || !ChartCtor || !eaChartTabHasData(bundle.slotData, tab)) return;

  mountEl._eaActiveChartTab = tab;

  mountEl.querySelectorAll('.ea-charts-tab').forEach(function (btn) {
    var id = btn.getAttribute('data-ea-chart-tab');
    var active = id === tab;
    btn.classList.toggle('ea-charts-tab--active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  mountEl.querySelectorAll('.ea-charts-tabpanel').forEach(function (panel) {
    var id = panel.getAttribute('data-ea-chart-panel');
    var active = id === tab;
    panel.hidden = !active;
    panel.classList.toggle('ea-charts-tabpanel--active', active);
  });

  var panel = mountEl.querySelector('[data-ea-chart-panel="' + tab + '"]');
  if (!panel) return;

  var slotData = bundle.slotData;
  var tabLayout = eaTabLayoutKey(tab, slotData);
  var cached = ensureEaTabChartStores(mountEl)[tab];
  if (cached && cached.layoutKey === tabLayout && panel.querySelector('canvas')) {
    syncActiveEaChartsRef(mountEl, tab);
    mountEl._eaChartsLayoutKey = layoutKey;
    mountEl._eaChartsSig = bundle.signature;
    requestAnimationFrame(function () {
      resizeEaCharts(cached.charts);
    });
    return;
  }

  destroyEaTabCharts(mountEl, tab);

  /** @type {unknown[]} */
  var chartStore = [];
  /** @type {Array<{ wrap: HTMLElement, title: string, config: object, slotId: string, height: number }>} */
  var queue = [];

  if (tab === 'vitals') {
    panel.innerHTML = '<div class="ea-chart-family-grid"></div>';
    var svGrid = panel.querySelector('.ea-chart-family-grid');
    VITAL_FAMILIES.forEach(function (fam) {
      var raw = slotData['vital:' + fam.id];
      if (!raw || !svGrid) return;
      var famData = displayVitalsFamilyData(raw);
      var famWrap = document.createElement('div');
      famWrap.className = 'ea-chart-wrap';
      svGrid.appendChild(famWrap);
      queue.push({
        wrap: famWrap,
        title: fam.title,
        slotId: 'vital:' + fam.id,
        height: EA_CHART_VITALS_CANVAS_HEIGHT,
        config: {
          type: 'line',
          data: { labels: famData.labels, datasets: famData.datasets },
          options: eaLineChartOptions(),
        },
      });
    });
    if (!queue.length && svGrid) {
      svGrid.innerHTML =
        '<p class="ea-muted">Sin suficientes puntos de signos vitales (mín. 2 por parámetro).</p>';
    }
  } else if (tab === 'glu') {
    var gluRaw = slotData.glu;
    if (gluRaw) {
      var gluDisplay = displayGluChartData(gluRaw);
      panel.innerHTML = '<div class="ea-chart-wrap ea-chart-wrap--glu"></div>';
      var gluWrap = panel.querySelector('.ea-chart-wrap');
      if (gluWrap) {
        queue.push({
          wrap: gluWrap,
          title: 'Serie temporal',
          slotId: 'glu',
          height: EA_CHART_IO_CANVAS_HEIGHT,
          config: {
            type: 'line',
            data: gluDisplay,
            options: eaLineChartOptions({
              plugins: Object.assign({ legend: { display: false } }, eaChartTooltipPlugin()),
              scales: {
                y: { grace: '5%', title: { display: true, text: 'mg/dL', font: { size: 11 } } },
                x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 12 } },
              },
            }),
          },
        });
      }
    } else {
      panel.innerHTML = '<p class="ea-muted">Sin suficientes glucometrías (mín. 2 puntos).</p>';
    }
  } else if (tab === 'io') {
    var ioRaw = slotData.io;
    if (ioRaw) {
      var ioDisplay = displayIoChartData(ioRaw);
      panel.innerHTML = '<div class="ea-chart-wrap ea-chart-wrap--io"></div>';
      var ioWrap = panel.querySelector('.ea-chart-wrap');
      if (ioWrap) {
        queue.push({
          wrap: ioWrap,
          title: 'Ingresos / egresos y balance global',
          slotId: 'io',
          height: EA_CHART_IO_CANVAS_HEIGHT,
          config: {
            type: 'bar',
            data: {
              labels: ioDisplay.labels,
              datasets: [
                {
                  label: 'Ingresos',
                  data: ioDisplay.datasets[0].data,
                  backgroundColor: chartColor('--ea-chart-io-ing'),
                  borderRadius: 4,
                  order: 2,
                },
                {
                  label: 'Egresos',
                  data: ioDisplay.datasets[1].data,
                  backgroundColor: chartColor('--ea-chart-io-egr'),
                  borderRadius: 4,
                  order: 2,
                },
                {
                  type: 'line',
                  label: 'Balance global',
                  data: ioDisplay.datasets[2].data,
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
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              devicePixelRatio: eaChartDevicePixelRatio(),
              interaction: { mode: 'index', axis: 'x', intersect: false },
              plugins: Object.assign(
                { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                eaChartTooltipPlugin()
              ),
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
                x: { ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
              },
            },
          },
        });
      }
    } else {
      panel.innerHTML =
        '<p class="ea-muted">Sin suficientes registros de I/O con ingreso y egreso (mín. 2).</p>';
    }
  }

  function finalize() {
    saveEaTabChartStore(mountEl, tab, tabLayout, chartStore);
    mountEl._eaChartsLayoutKey = layoutKey;
    mountEl._eaChartsSig = bundle.signature;
  }

  if (!queue.length) {
    finalize();
    return;
  }

  var mountBatch = tab === 'vitals' ? 1 : 2;
  var jobIndex = 0;

  function runMountBatch() {
    var end = Math.min(jobIndex + mountBatch, queue.length);
    for (; jobIndex < end; jobIndex += 1) {
      var job = queue[jobIndex];
      mountChart(
        job.wrap,
        job.title,
        ChartCtor,
        job.config,
        mountEl,
        chartStore,
        job.slotId,
        job.height
      );
    }
    if (jobIndex < queue.length) requestAnimationFrame(runMountBatch);
    else finalize();
  }

  // Wait until the tab panel is visible and laid out (avoids 0×0 canvas on tab switch).
  requestAnimationFrame(function () {
    requestAnimationFrame(runMountBatch);
  });
}

/**
 * @param {HTMLElement} mountEl
 * @param {ReturnType<typeof prepareEaChartBundle>} bundle
 * @param {unknown} ChartCtor
 * @param {string} layoutKey
 */
function wireEaChartsTabs(mountEl, bundle, ChartCtor, layoutKey) {
  mountEl._eaChartBundle = bundle;
  mountEl._eaChartLayoutKey = layoutKey;
  mountEl._eaChartCtor = ChartCtor;
  if (mountEl._eaChartsTabsWired) return;
  mountEl._eaChartsTabsWired = true;
  mountEl.addEventListener('click', function (ev) {
    var target = /** @type {HTMLElement | null} */ (ev.target);
    var btn =
      target && typeof target.closest === 'function'
        ? /** @type {HTMLElement | null} */ (target.closest('[data-ea-chart-tab]'))
        : null;
    if (!btn || !mountEl.contains(btn) || btn.disabled) return;
    var tab = btn.getAttribute('data-ea-chart-tab');
    if (!tab || tab === mountEl._eaActiveChartTab) return;
    var liveBundle = mountEl._eaChartBundle || bundle;
    var liveChart = mountEl._eaChartCtor || resolveChartCtor(null);
    var liveLayoutKey = mountEl._eaChartLayoutKey || layoutKey;
    activateEaChartTab(mountEl, tab, liveBundle, liveChart, liveLayoutKey);
  });
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
/**
 * @param {unknown} monitoreo
 */
function getCachedEaChartsSummary(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var rev = historialChartRevision(hist);
  if (m._eaChartsSummary && m._eaChartsSummaryRev === rev) {
    return m._eaChartsSummary;
  }
  var summary = scanEaChartsSummary(monitoreo);
  m._eaChartsSummaryRev = rev;
  m._eaChartsSummary = summary;
  return summary;
}

export function renderEaChartsSummarySection(monitoreo) {
  var summary = getCachedEaChartsSummary(monitoreo);
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
  if (mountEl._eaChartsSig === sig && mountEl.querySelector('.ea-charts-tabs')) {
    mountEl._eaChartBundle = bundle;
    var activeTab = mountEl._eaActiveChartTab || defaultEaChartTab(slotData);
    var activePanel = mountEl.querySelector('[data-ea-chart-panel="' + activeTab + '"]');
    if (activePanel && !activePanel.querySelector('canvas') && eaChartTabHasData(slotData, activeTab)) {
      var ChartRemount = resolveChartCtor(ChartCtor);
      if (ChartRemount) {
        activateEaChartTab(mountEl, activeTab, bundle, ChartRemount, bundle.layoutKey);
      }
    }
    return;
  }
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
  mountEl.innerHTML = titleHtml + '<div class="ea-charts-shell">' + buildEaChartsTabShell(slotData) + '</div>';
  mountEl._eaChartBundle = bundle;

  wireEaChartsTabs(mountEl, bundle, Chart, layoutKey);
  activateEaChartTab(mountEl, defaultEaChartTab(slotData), bundle, Chart, layoutKey);
}
