import { TREND_SPARK_WINDOW } from '../lab-history-cache.mjs';
import { getSetTrendValueForSeries, buildTendChartLabels } from '../tend-core.mjs';
import { loadChartJs } from '../vendor-loader.mjs';
import { rt } from './tendencias-runtime-state.mjs';
import { tendenciasBridge } from './tendencias-bridge.mjs';
import { tendStore, trendSparkDomId, trendSparkChartKey } from './tendencias-state.mjs';
import { tendRefForSeries, tendCatalogSeriesKey, tendSectionIsExpanded, toTrendAscendingSets } from './tendencias-series.mjs';
import { tendRowModel, gridWithRows } from './tendencias-grid-model.mjs';
import { updateTendGrid } from './tendencias-render-view.jsx';

function tendSeriesKeySelector(seriesKey) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return '.tend-row[data-series-key="' + CSS.escape(seriesKey) + '"]';
  }
  return '.tend-row[data-series-key="' + String(seriesKey).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
}

/** New numbers for the rows on screen: the grid is redrawn from its model. False → the caller repaints everything. */
function patchTendRowsFromIndex(seriesIndex, seriesAvail) {
  var rowsByKey = Object.create(null);
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var sp = seriesAvail[i];
    var key = tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
    if (!seriesIndex[key]) return false;
    rowsByKey[key] = tendRowModel(sp.sectionKey, sp, seriesIndex);
  }
  return updateTendGrid(function (model) {
    return gridWithRows(model, rowsByKey);
  });
}

function destroySparkChartEntry(ck) {
  var chart = tendStore.sparkCharts[ck];
  if (chart && typeof chart.destroy === 'function') {
    try {
      chart.destroy();
    } catch {
      /* already torn down */
    }
  }
  delete tendStore.sparkCharts[ck];
}

function releaseSparkCanvas(ck, canvas, Chart) {
  destroySparkChartEntry(ck);
  if (!canvas || !Chart || typeof Chart.getChart !== 'function') return;
  var orphan = Chart.getChart(canvas);
  if (orphan && typeof orphan.destroy === 'function') {
    try {
      orphan.destroy();
    } catch {
      /* already torn down */
    }
  }
}

function sparkLineColorForJob(job, history) {
  var sk2 = job.sk2;
  var fk2 = job.fk2;
  var latestSetSpark = job.setsDesc2.length ? job.setsDesc2[0] : null;
  var latestSpark = latestSetSpark
    ? getSetTrendValueForSeries(latestSetSpark, sk2, fk2)
    : null;
  var refSpark = tendRefForSeries(history, sk2, fk2, latestSetSpark);
  var isAbSpark =
    refSpark &&
    latestSpark != null &&
    (latestSpark < refSpark[0] || latestSpark > refSpark[1]);
  return isAbSpark ? '#d70015' : '#23807a';
}

function sparkChartAnim(duration) {
  return rt.rpcPrefersReducedMotion() ? false : { duration: duration, easing: 'easeOutQuart' };
}

function applySparkJobToChart(chart, job, history) {
  if (!chart || !chart.data || !chart.data.datasets || !chart.data.datasets[0]) return false;
  chart.data.labels = job.labels2;
  chart.data.datasets[0].data = job.values2;
  var lineColor = sparkLineColorForJob(job, history);
  chart.data.datasets[0].borderColor = lineColor;
  chart.data.datasets[0].pointBackgroundColor = lineColor;
  var ybu = sparkYBounds(job.values2, job.ref);
  chart.options.scales.y.min = ybu.min;
  chart.options.scales.y.max = ybu.max;
  chart.options.plugins.tendSparkBand = { ref: job.ref || null };
  chart.update('none');
  return true;
}

function updateSparkChartsFromJobs(sparkJobs, history) {
  for (var i = 0; i < sparkJobs.length; i += 1) {
    var job = sparkJobs[i];
    var ck = trendSparkChartKey(job.sk2, job.fk2);
    var chart = tendStore.sparkCharts[ck];
    if (!applySparkJobToChart(chart, job, history)) {
      destroySparkChartEntry(ck);
      mountOneTrendSparkChartAsync(job, history, sparkChartAnim(400));
    }
  }
}

// Compact normality band behind the line (list sparks only).
var tendSparkBandPlugin = {
  id: 'tendSparkBand',
  beforeDatasetsDraw: function (chart) {
    var ref = chart.options.plugins.tendSparkBand && chart.options.plugins.tendSparkBand.ref;
    var y = chart.scales && chart.scales.y;
    if (!ref || !y) return;
    var top = y.getPixelForValue(Math.max(ref[0], ref[1]));
    var bot = y.getPixelForValue(Math.min(ref[0], ref[1]));
    var a = chart.chartArea;
    var ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(35,128,122,0.11)';
    var t = Math.max(a.top, Math.min(top, bot));
    var h = Math.max(1, Math.min(a.bottom, Math.max(top, bot)) - t);
    ctx.fillRect(a.left, t, a.right - a.left, h);
    ctx.restore();
  },
};

function sparkYBounds(values, ref) {
  var all = values.filter(function (v) { return v != null && isFinite(v); });
  if (ref) all = all.concat([ref[0], ref[1]]);
  if (!all.length) return {};
  var mn = Math.min.apply(null, all);
  var mx = Math.max.apply(null, all);
  var pad = (mx - mn) * 0.12 || 1;
  return { min: mn - pad, max: mx + pad };
}

function mountOneTrendSparkChart(job, history, chartAnim, Chart, mountGen) {
  if (mountGen != null && mountGen !== tendStore.sparkMountGen) return;
  var sk2 = job.sk2;
  var fk2 = job.fk2;
  var canvas2 = document.getElementById(trendSparkDomId(sk2, fk2));
  if (!canvas2 || !Chart) return;
  var ck = trendSparkChartKey(sk2, fk2);
  var live = tendStore.sparkCharts[ck];
  if (live && live.canvas === canvas2 && applySparkJobToChart(live, job, history)) return;
  releaseSparkCanvas(ck, canvas2, Chart);
  if (mountGen != null && mountGen !== tendStore.sparkMountGen) return;
  var lineColor = sparkLineColorForJob(job, history);
  // Sparks stay glanceable: normality band + event markers only on the detail chart.
  var yb = sparkYBounds(job.values2, job.ref);
  tendStore.sparkCharts[ck] = new Chart(canvas2, {
    type: 'line',
    plugins: [tendSparkBandPlugin],
    data: {
      labels: job.labels2,
      datasets: [
        {
          data: job.values2,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 2.5,
          pointBackgroundColor: lineColor,
          tension: 0.3,
          fill: false,
          clip: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnim,
      layout: { padding: { left: 4, right: 4, top: 6, bottom: 4 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false }, tendSparkBand: { ref: job.ref || null } },
      scales: {
        x: { display: false, grid: { display: false }, offset: true },
        y: { display: false, grid: { display: false }, min: yb.min, max: yb.max },
      },
    },
  });
}

function mountOneTrendSparkChartAsync(job, history, chartAnim) {
  var mountGen = tendStore.sparkMountGen;
  void loadChartJs()
    .then(function (Chart) {
      mountOneTrendSparkChart(job, history, chartAnim, Chart, mountGen);
    })
    .catch(function (err) {
      console.error('[R+ Tendencias] spark chart', err);
    });
}

function buildSparkJobsFromIndex(seriesAvail, seriesIndex, history, chartAnim) {
  tendStore.sparkMountGen += 1;
  var mountGen = tendStore.sparkMountGen;
  var sparkJobs = [];
  for (var cj = 0; cj < seriesAvail.length; cj += 1) {
    var spec2 = seriesAvail[cj];
    var sk2 = spec2.sectionKey;
    var fk2 = spec2.fieldKey;
    if (!tendSectionIsExpanded(sk2)) continue;
    var idx = seriesIndex[tendCatalogSeriesKey(sk2, fk2)];
    if (!idx || !idx.setsDesc.length) continue;
    var sparkDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAsc2 = toTrendAscendingSets(sparkDesc);
    sparkJobs.push({
      sk2: sk2,
      fk2: fk2,
      setsDesc2: sparkDesc,
      labels2: buildTendChartLabels(setsAsc2),
      values2: setsAsc2.map(function (s) {
        return getSetTrendValueForSeries(s, sk2, fk2);
      }),
      ref: idx.ref || null,
    });
  }
  function runSparkBatches(Chart) {
    if (mountGen !== tendStore.sparkMountGen) return;
    var jobIndex = 0;
    var SPARK_BATCH = 8;
    function runSparkBatch() {
      if (mountGen !== tendStore.sparkMountGen) return;
      var end = Math.min(jobIndex + SPARK_BATCH, sparkJobs.length);
      for (; jobIndex < end; jobIndex += 1) {
        mountOneTrendSparkChart(sparkJobs[jobIndex], history, chartAnim, Chart, mountGen);
      }
      if (jobIndex < sparkJobs.length) {
        requestAnimationFrame(runSparkBatch);
        return;
      }
      if (mountGen !== tendStore.sparkMountGen) return;
      tendenciasBridge.mountTendCardSortables();
      tendenciasBridge.syncTendHiddenModalIfOpen();
    }
    if (sparkJobs.length) runSparkBatch();
    else {
      tendenciasBridge.mountTendCardSortables();
      tendenciasBridge.syncTendHiddenModalIfOpen();
    }
  }

  if (!sparkJobs.length) {
    tendenciasBridge.mountTendCardSortables();
    tendenciasBridge.syncTendHiddenModalIfOpen();
    return sparkJobs;
  }

  void loadChartJs()
    .then(runSparkBatches)
    .catch(function (err) {
      console.error('[R+ Tendencias] Chart.js for sparks', err);
      tendenciasBridge.mountTendCardSortables();
      tendenciasBridge.syncTendHiddenModalIfOpen();
    });
  return sparkJobs;
}

export {
  tendSeriesKeySelector,
  patchTendRowsFromIndex,
  destroySparkChartEntry,
  releaseSparkCanvas,
  sparkLineColorForJob,
  sparkChartAnim,
  updateSparkChartsFromJobs,
  mountOneTrendSparkChartAsync,
  buildSparkJobsFromIndex,
  mountOneTrendSparkChart,
};
