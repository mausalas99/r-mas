import { isVitalAltered } from './estado-actual-ranges.mjs';

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

const FAMILY_COLORS = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#b45309', '#0891b2'];

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
    var color = FAMILY_COLORS[k % FAMILY_COLORS.length];
    var ds = lineDataset(labels, values, alteredFlags, color);
    ds.label = VITAL_LABELS[key] || key;
    datasets.push(ds);
  }

  if (!datasets.length) return null;
  return { labels: labels, datasets: datasets };
}

/**
 * @param {string} recordedAt
 * @param {string | undefined} timeHm
 * @returns {number}
 */
function gluPointMs(recordedAt, timeHm) {
  var base = new Date(recordedAt);
  if (isNaN(base.getTime())) return 0;
  if (!timeHm || !String(timeHm).trim()) return base.getTime();
  var parts = String(timeHm).trim().split(':');
  var h = Number(parts[0]);
  var m = Number(parts[1] != null ? parts[1] : 0);
  if (!Number.isFinite(h)) return base.getTime();
  var d = new Date(base);
  d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  return d.getTime();
}

/**
 * @param {unknown[]} histAsc
 */
export function buildGluSeries(histAsc) {
  /** @type {Array<{ ms: number, label: string, value: number }>} */
  var points = [];

  for (var i = 0; i < histAsc.length; i++) {
    var row = histAsc[i];
    if (!row || typeof row !== 'object') continue;
    var recordedAt = String(/** @type {any} */ (row).recordedAt || '');
    var glus = Array.isArray(/** @type {any} */ (row).glucometrias)
      ? /** @type {any} */ (/** @type {any} */ (row).glucometrias)
      : [];
    for (var g = 0; g < glus.length; g++) {
      var glu = glus[g];
      if (!glu || typeof glu !== 'object') continue;
      var val = Number(/** @type {any} */ (glu).value);
      if (!Number.isFinite(val)) continue;
      var timeHm = /** @type {any} */ (glu).time ? String(/** @type {any} */ (glu).time) : '';
      var ms = gluPointMs(recordedAt, timeHm);
      var whenLabel = timeHm || formatChartLabel(recordedAt);
      points.push({
        ms: ms,
        label: whenLabel + ' · ' + formatChartLabel(recordedAt),
        value: val,
      });
    }
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
  var pointBackgroundColor = values.map(function (_v, i) {
    return alteredFlags[i] ? '#f59e0b' : color;
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
function mountChart(wrap, title, ChartCtor, config, mountEl, chartStore) {
  wrap.innerHTML =
    '<h4 class="ea-chart-subtitle">' +
    title +
    '</h4>' +
    '<div class="ea-chart-canvas-wrap"><canvas></canvas></div>';
  var canvas = /** @type {HTMLCanvasElement | null} */ (wrap.querySelector('canvas'));
  if (!canvas) return;
  try {
    var chart = new /** @type {any} */ (ChartCtor)(canvas, config);
    chartStore.push(chart);
    mountEl._eaCharts = chartStore;
  } catch (_e) {
    wrap.innerHTML = '<p class="ea-muted">No se pudo dibujar la gráfica.</p>';
  }
}

/**
 * @param {HTMLElement | null} mountEl
 * @param {unknown} monitoreo
 * @param {unknown} [ChartCtor]
 */
export function renderEstadoActualCharts(mountEl, monitoreo, ChartCtor) {
  if (!mountEl) return;
  destroyEstadoActualCharts(mountEl);

  var Chart = resolveChartCtor(ChartCtor);
  /** @type {any} */
  var m = monitoreo || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var histAsc = historialSortedAsc(hist);

  var section = document.createElement('section');
  section.className = 'ea-section';
  section.id = 'ea-charts';

  var hasEnough = histAsc.length >= 2;
  if (!hasEnough) {
    section.innerHTML =
      '<h3 class="ea-section-title">Tendencias</h3>' +
      '<p class="ea-muted ea-charts-empty">Registra al menos 2 mediciones para ver tendencias.</p>';
    mountEl.replaceChildren(section);
    return;
  }

  if (!Chart) {
    section.innerHTML =
      '<h3 class="ea-section-title">Tendencias</h3>' +
      '<p class="ea-muted ea-charts-empty">Chart.js no está disponible. Recarga la aplicación.</p>';
    mountEl.replaceChildren(section);
    return;
  }

  section.innerHTML = '<h3 class="ea-section-title">Tendencias</h3><div class="ea-charts-grid"></div>';
  var grid = section.querySelector('.ea-charts-grid');
  if (!grid) {
    mountEl.replaceChildren(section);
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
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          scales: {
            y: { grace: '5%', ticks: { font: { size: 11 } } },
            x: { ticks: { maxRotation: 45, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
          },
        },
      },
      mountEl,
      chartStore
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
              borderColor: '#047857',
              backgroundColor: '#047857',
              pointRadius: 4,
              tension: 0.25,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grace: '5%', title: { display: true, text: 'mg/dL', font: { size: 11 } } },
            x: { ticks: { maxRotation: 45, font: { size: 10 }, autoSkip: true, maxTicksLimit: 12 } },
          },
        },
      },
      mountEl,
      chartStore
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
              backgroundColor: '#60a5fa',
              borderRadius: 4,
              order: 2,
            },
            {
              label: 'Egresos',
              data: ioData.egr,
              backgroundColor: '#f87171',
              borderRadius: 4,
              order: 2,
            },
            {
              type: 'line',
              label: 'Balance global',
              data: ioData.globalBalance,
              borderColor: '#4a52e8',
              backgroundColor: '#4a52e8',
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
      chartStore
    );
    ioBlock.appendChild(ioWrap);
  } else {
    ioBlock.innerHTML +=
      '<p class="ea-muted">Sin suficientes registros de I/O con ingreso y egreso (mín. 2).</p>';
  }
  grid.appendChild(ioBlock);

  mountEl.replaceChildren(section);
  mountEl._eaCharts = chartStore;
}
