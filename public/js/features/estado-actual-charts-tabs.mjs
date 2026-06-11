import { VITAL_FAMILIES, chartColor } from './estado-actual-charts-series.mjs';
import {
  displayGluChartData,
  displayIoChartData,
  displayVitalsFamilyData,
} from './estado-actual-charts-display.mjs';
import {
  EA_CHART_IO_CANVAS_HEIGHT,
  EA_CHART_VITALS_CANVAS_HEIGHT,
  eaChartDevicePixelRatio,
  eaChartTooltipPlugin,
  eaLineChartOptions,
  mountChart,
  resolveChartCtor,
} from './estado-actual-charts-chartjs.mjs';

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
export function destroyAllEaTabCharts(mountEl) {
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
export function syncActiveEaChartsRef(mountEl, tab) {
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

/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 * @param {string} tab
 */
export function eaChartTabHasData(slotData, tab) {
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
export function defaultEaChartTab(slotData) {
  if (eaChartTabHasData(slotData, 'vitals')) return 'vitals';
  if (eaChartTabHasData(slotData, 'glu')) return 'glu';
  return 'io';
}

/**
 * @param {Record<string, { labels: string[], datasets: object[] }>} slotData
 */
export function buildEaChartsTabShell(slotData) {
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
 * @param {{ slotData: Record<string, { labels: string[], datasets: object[] }>, signature: string }} bundle
 * @param {unknown} ChartCtor
 * @param {string} layoutKey
 */
export function activateEaChartTab(mountEl, tab, bundle, ChartCtor, layoutKey) {
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
 * @param {{ slotData: Record<string, { labels: string[], datasets: object[] }>, signature: string }} bundle
 * @param {unknown} ChartCtor
 * @param {string} layoutKey
 */
export function wireEaChartsTabs(mountEl, bundle, ChartCtor, layoutKey) {
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
