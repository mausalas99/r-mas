export const EA_CHART_CANVAS_HEIGHT = 200;
export const EA_CHART_IO_CANVAS_HEIGHT = 260;
export const EA_CHART_VITALS_CANVAS_HEIGHT = 210;

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

export function eaChartDevicePixelRatio() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

export function eaChartTooltipPlugin() {
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
export function eaLineChartOptions(extra) {
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
export function mountChart(wrap, title, ChartCtor, config, mountEl, chartStore, slotId, canvasHeight) {
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
