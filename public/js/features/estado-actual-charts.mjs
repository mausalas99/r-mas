import { isVitalAltered } from './estado-actual-ranges.mjs';
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

/**
 * @param {string} token
 * @returns {string}
 */
function chartColor(token) {
  var fallback = CHART_TOKEN_FALLBACKS[token] || '#4a52e8';
  if (typeof document === 'undefined') return fallback;
  var value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
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
 * @param {Array<{ ms: number, label: string, value: number }>} points
 * @param {string} recordedAt
 * @param {unknown[]} readings
 * @param {Date} [now]
 */
function pushGluReadingPoints(points, recordedAt, readings, now) {
  for (var g = 0; g < readings.length; g++) {
    var glu = readings[g];
    if (!glu || typeof glu !== 'object') continue;
    var val = Number(/** @type {any} */ (glu).value);
    if (!Number.isFinite(val)) continue;
    var timeHm = /** @type {any} */ (glu).time ? String(/** @type {any} */ (glu).time) : '';
    var ms = gluPointMs(recordedAt, timeHm);
    if (!isGluPointInRegistroWindow(ms, now)) continue;
    var whenLabel = timeHm || formatChartLabel(recordedAt);
    points.push({
      ms: ms,
      label: whenLabel + ' · ' + formatChartLabel(recordedAt),
      value: val,
    });
  }
}

export function buildGluSeries(histAsc, now) {
  /** @type {Array<{ ms: number, label: string, value: number }>} */
  var points = [];

  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    var recordedAt = String(/** @type {any} */ (row).recordedAt || '');
    var glus = Array.isArray(/** @type {any} */ (row).glucometrias)
      ? /** @type {any} */ (/** @type {any} */ (row).glucometrias)
      : [];
    pushGluReadingPoints(points, recordedAt, glus, now);
    var bombas = Array.isArray(/** @type {any} */ (row).bombaInsulina)
      ? /** @type {any} */ (/** @type {any} */ (row).bombaInsulina)
      : [];
    pushGluReadingPoints(points, recordedAt, bombas, now);
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
 * @param {unknown} monitoreo
 * @returns {string}
 */
export function buildEaChartsLayoutKey(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var parts = [];
  VITAL_FAMILIES.forEach(function (fam) {
    parts.push(fam.id + ':' + (buildVitalsFamilyData(histAsc, fam.keys) ? '1' : '0'));
  });
  var glu = buildGluSeries(histAsc);
  parts.push('g' + glu.values.length);
  var io = buildIoChartData(histAsc);
  parts.push('i' + io.labels.length);
  return parts.join('|');
}

/**
 * @param {unknown[]} histAsc
 * @returns {Record<string, { labels: string[], datasets: object[] }>}
 */
function buildEaChartSlotData(histAsc) {
  /** @type {Record<string, { labels: string[], datasets: object[] }>} */
  var out = {};
  VITAL_FAMILIES.forEach(function (fam) {
    var famData = buildVitalsFamilyData(histAsc, fam.keys);
    if (famData) {
      out['vital:' + fam.id] = { labels: famData.labels, datasets: famData.datasets };
    }
  });
  var gluSeries = buildGluSeries(histAsc);
  if (gluSeries.values.length >= 2) {
    out.glu = {
      labels: gluSeries.labels,
      datasets: [
        {
          label: 'Glu (mg/dL)',
          data: gluSeries.values,
          borderColor: chartColor('--ea-chart-glu'),
          backgroundColor: chartColor('--ea-chart-glu'),
        },
      ],
    };
  }
  var ioData = buildIoChartData(histAsc);
  if (ioData.labels.length >= 2) {
    out.io = {
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
  return out;
}

/**
 * @param {HTMLElement} mountEl
 * @param {unknown} monitoreo
 * @returns {boolean}
 */
export function updateEstadoActualChartsInPlace(mountEl, monitoreo) {
  var charts = mountEl._eaCharts;
  var slotIds = mountEl._eaChartSlotIds;
  if (!Array.isArray(charts) || !Array.isArray(slotIds) || charts.length !== slotIds.length) {
    return false;
  }
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var slotData = buildEaChartSlotData(histAsc);

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
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var parts = ['n' + histAsc.length];
  for (var i = 0; i < histAsc.length; i += 1) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    parts.push(String(/** @type {any} */ (row).recordedAt || ''));
    parts.push(String(/** @type {any} */ (row).id || ''));
  }
  return parts.join('|');
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
  var pointRadius = values.map(function (_v, i) {
    return alteredFlags[i] ? 6 : 3;
  });
  var alteredColor = chartColor('--ea-chart-altered');
  var pointBackgroundColor = values.map(function (_v, i) {
    return alteredFlags[i] ? alteredColor : color;
  });
  var pointBorderColor = pointBackgroundColor;
  return {
    label: '',
    data: values,
    borderColor: color,
    backgroundColor: color,
    pointRadius: pointRadius,
    pointBackgroundColor: pointBackgroundColor,
    pointBorderColor: pointBorderColor,
    tension: 0.25,
    spanGaps: true,
  };
}

/**
 * @param {HTMLElement} wrap
 * @param {string} title
 * @param {unknown} ChartCtor
 * @param {object} config
 * @param {HTMLElement} mountEl
 * @param {unknown[]} chartStore
 */
function mountChart(wrap, title, ChartCtor, config, mountEl, chartStore, slotId) {
  wrap.innerHTML =
    '<h4 class="ea-chart-subtitle">' +
    title +
    '</h4>' +
    '<div class="ea-chart-canvas-wrap"><canvas></canvas></div>';
  var canvas = /** @type {HTMLCanvasElement | null} */ (wrap.querySelector('canvas'));
  if (!canvas) return;
  try {
    var chart = new /** @type {any} */ (ChartCtor)(canvas, config);
    chart._eaSlotId = slotId;
    chartStore.push(chart);
    mountEl._eaCharts = chartStore;
  } catch (_e) {
    wrap.innerHTML = '<p class="ea-muted">No se pudo dibujar la gráfica.</p>';
  }
}

/**
 * @param {unknown} monitoreo
 */
export function buildEaChartsSummary(monitoreo) {
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);
  var vitalsReady = false;
  VITAL_FAMILIES.forEach(function (fam) {
    if (buildVitalsFamilyData(histAsc, fam.keys)) vitalsReady = true;
  });
  var gluSeries = buildGluSeries(histAsc);
  var gluReady = gluSeries.values.length >= 2;
  var gluLatest = gluSeries.values.length ? gluSeries.values[gluSeries.values.length - 1] : null;
  var ioData = buildIoChartData(histAsc);
  var ioReady = ioData.labels.length >= 2;
  var ioTurn =
    ioReady && ioData.turnBalance.length
      ? ioData.turnBalance[ioData.turnBalance.length - 1]
      : null;
  return {
    measurementCount: histAsc.length,
    vitalsReady: vitalsReady,
    gluReady: gluReady,
    gluLatest: gluLatest,
    gluPointCount: gluSeries.values.length,
    ioReady: ioReady,
    ioPointCount: ioData.labels.length,
    ioTurn: ioTurn,
  };
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
  var summary = buildEaChartsSummary(monitoreo);
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
  var sig = buildEaChartsSignature(monitoreo);
  if (mountEl._eaChartsSig === sig && mountEl.querySelector('.ea-charts-grid')) return;
  var layoutKey = buildEaChartsLayoutKey(monitoreo);
  if (
    mountEl._eaChartsLayoutKey === layoutKey &&
    mountEl._eaChartsSig !== sig &&
    updateEstadoActualChartsInPlace(mountEl, monitoreo)
  ) {
    mountEl._eaChartsSig = sig;
    return;
  }
  destroyEstadoActualCharts(mountEl);

  var Chart = resolveChartCtor(ChartCtor);
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);

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

  // --- Signos vitales (por familia) ---
  var svBlock = document.createElement('div');
  svBlock.className = 'ea-chart-block';
  svBlock.innerHTML = '<h4 class="ea-chart-block-title">Signos vitales</h4><div class="ea-chart-family-grid"></div>';
  var svGrid = svBlock.querySelector('.ea-chart-family-grid');
  var svRendered = false;

  VITAL_FAMILIES.forEach(function (fam) {
    var famData = buildVitalsFamilyData(histAsc, fam.keys);
    if (!famData || !svGrid) return;
    svRendered = true;

    var famWrap = document.createElement('div');
    famWrap.className = 'ea-chart-wrap';
    mountChart(
      famWrap,
      fam.title,
      Chart,
      {
        type: 'line',
        data: { labels: famData.labels, datasets: famData.datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          scales: {
            y: { grace: '5%', ticks: { font: { size: 11 } } },
            x: { ticks: { maxRotation: 45, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
          },
        },
      },
      mountEl,
      chartStore,
      'vital:' + fam.id
    );
    svGrid.appendChild(famWrap);
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
  var gluSeries = buildGluSeries(histAsc);
  if (gluSeries.values.length >= 2) {
    var gluWrap = document.createElement('div');
    gluWrap.className = 'ea-chart-wrap';
    mountChart(
      gluWrap,
      'Serie temporal',
      Chart,
      {
        type: 'line',
        data: {
          labels: gluSeries.labels,
          datasets: [
            {
              label: 'Glu (mg/dL)',
              data: gluSeries.values,
              borderColor: chartColor('--ea-chart-glu'),
              backgroundColor: chartColor('--ea-chart-glu'),
              pointRadius: 4,
              tension: 0.25,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grace: '5%', title: { display: true, text: 'mg/dL', font: { size: 11 } } },
            x: { ticks: { maxRotation: 45, font: { size: 10 }, autoSkip: true, maxTicksLimit: 12 } },
          },
        },
      },
      mountEl,
      chartStore,
      'glu'
    );
    gluBlock.appendChild(gluWrap);
  } else {
    gluBlock.innerHTML +=
      '<p class="ea-muted">Sin suficientes glucometrías (mín. 2 puntos).</p>';
  }
  grid.appendChild(gluBlock);

  // --- Balance hídrico ---
  var ioBlock = document.createElement('div');
  ioBlock.className = 'ea-chart-block';
  ioBlock.innerHTML = '<h4 class="ea-chart-block-title">Balance hídrico</h4>';
  var ioData = buildIoChartData(histAsc);
  if (ioData.labels.length >= 2) {
    var ioWrap = document.createElement('div');
    ioWrap.className = 'ea-chart-wrap ea-chart-wrap--io';
    mountChart(
      ioWrap,
      'Ingresos / egresos y balance global',
      Chart,
      {
        type: 'bar',
        data: {
          labels: ioData.labels,
          datasets: [
            {
              label: 'Ingresos',
              data: ioData.ing,
              backgroundColor: chartColor('--ea-chart-io-ing'),
              borderRadius: 4,
              order: 2,
            },
            {
              label: 'Egresos',
              data: ioData.egr,
              backgroundColor: chartColor('--ea-chart-io-egr'),
              borderRadius: 4,
              order: 2,
            },
            {
              type: 'line',
              label: 'Balance global',
              data: ioData.globalBalance,
              borderColor: chartColor('--ea-chart-io-balance'),
              backgroundColor: chartColor('--ea-chart-io-balance'),
              borderDash: [6, 4],
              borderWidth: 2,
              pointRadius: 3,
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
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'cc', font: { size: 11 } },
              ticks: { font: { size: 11 } },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Balance acum.', font: { size: 11 } },
              ticks: { font: { size: 11 } },
            },
            x: { ticks: { maxRotation: 45, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
          },
        },
      },
      mountEl,
      chartStore,
      'io'
    );
    ioBlock.appendChild(ioWrap);
  } else {
    ioBlock.innerHTML +=
      '<p class="ea-muted">Sin suficientes registros de I/O con ingreso y egreso (mín. 2).</p>';
  }
  grid.appendChild(ioBlock);

  mountEl._eaCharts = chartStore;
  mountEl._eaChartSlotIds = chartStore
    .map(function (ch) {
      return ch && ch._eaSlotId ? String(ch._eaSlotId) : '';
    })
    .filter(Boolean);
  mountEl._eaChartsLayoutKey = layoutKey;
  mountEl._eaChartsSig = sig;
}
