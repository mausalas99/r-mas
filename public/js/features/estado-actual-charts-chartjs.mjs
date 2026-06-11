export const EA_CHART_CANVAS_HEIGHT = 200;
export const EA_CHART_IO_CANVAS_HEIGHT = 260;
export const EA_CHART_VITALS_CANVAS_HEIGHT = 300;

/**
 * @param {unknown} ChartCtor
 * @returns {unknown}
 */
export function resolveChartCtor(ChartCtor) {
  if (ChartCtor) return ChartCtor;
  if (typeof globalThis !== 'undefined' && /** @type {any} */ (globalThis).Chart) {
    return /** @type {any} */ (globalThis).Chart;
  }
  if (typeof window !== 'undefined' && /** @type {any} */ (window).Chart) {
    return /** @type {any} */ (window).Chart;
  }
  return null;
}

export function eaChartTooltipPlugin() {
  return {
    tooltip: {
      animation: false,
      mode: 'index',
      intersect: false,
      position: 'nearest',
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

/** Mirrors tendDetailChartOptions — proven smooth in Tendencias detail modal. */
export function eaLineChartOptions(extra) {
  return Object.assign(
    {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      transitions: {
        active: { animation: { duration: 0 } },
      },
      layout: { padding: { right: 8, left: 4, top: 4, bottom: 2 } },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
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
        line: { borderWidth: 2, tension: 0.25 },
      },
      scales: {
        y: { grace: '5%', ticks: { font: { size: 11 }, maxTicksLimit: 6 } },
        x: {
          ticks: { maxRotation: 0, font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 },
          offset: true,
        },
      },
    },
    extra || {}
  );
}

/** @param {object} [extra] */
export function eaIoChartOptions(extra) {
  return Object.assign(
    eaLineChartOptions({
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
    }),
    extra || {}
  );
}

/**
 * @param {HTMLElement} wrap
 * @param {string} title
 * @param {unknown} ChartCtor
 * @param {object} config
 * @param {HTMLElement} mountEl
 * @param {unknown[]} chartStore
 */
export function mountChart(wrap, title, ChartCtor, config, mountEl, chartStore, slotId, canvasHeight) {
  wrap.innerHTML =
    '<h4 class="ea-chart-subtitle">' +
    title +
    '</h4>' +
    '<div class="ea-chart-canvas-wrap"><canvas></canvas></div>';
  var box = wrap.querySelector('.ea-chart-canvas-wrap');
  if (box) box.style.height = (canvasHeight || EA_CHART_CANVAS_HEIGHT) + 'px';
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
 * @param {unknown} chart
 * @param {{ labels: string[], datasets: object[] }} famData
 * @param {string} slotId
 */
export function patchEaLineChartData(chart, famData, slotId) {
  /** @type {any} */
  var ch = chart;
  if (!ch || !ch.data || !famData) return false;
  ch.data.labels = famData.labels;
  ch.data.datasets = famData.datasets;
  ch._eaSlotId = slotId;
  if (typeof ch.update === 'function') ch.update('none');
  return true;
}
