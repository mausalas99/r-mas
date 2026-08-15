import { getNotes } from '../app-state.mjs';
import { formatDMYDate, inferFechaLabSetFromId } from '../lab-set-date.mjs';
import { dedupeTrendSetsForSeries, getSetTrendValueForSeries, buildTendChartLabels, parseFechaLabToMs, normalizeFechaLabHistory } from '../tend-core.mjs';
import { cancelOverlayClose, closeOverlayAnimated } from '../ui-motion.mjs';
import { TREND_DETAIL_DOWNSAMPLE } from '../lab-history-cache.mjs';
import { loadChartJs } from '../vendor-loader.mjs';
import { rt } from './tendencias-runtime-state.mjs';
import { aid, tendStore } from './tendencias-state.mjs';
import {
  tendCardLabelParts,
  tendRefForSeries,
  tendParsedHistoryDesc,
  toTrendAscendingSets,
} from './tendencias-catalog.mjs';
import {
  buildEventMarkerMapForSets,
  buildTendDetailEventsLegendHtml,
  createTendEventMarkerPlugin,
  dayValueFromTrendChartIndex,
  eventTooltipLinesForChartIndex,
} from './tendencias-event-context.mjs';
import { openTendEventComposeModal } from './tendencias-event-compose.mjs';
import { alignSeriesToLabels, formatTendTooltipDelta } from './tendencias-insight.mjs';
import {
  createTendRefBandPlugin,
  tendRefBandOptions,
  yScaleBoundsForRef,
} from './tendencias-ref-band.mjs';

var _tendDetailControlsWired = false;

function ensureTendDetailControlsWired() {
  if (_tendDetailControlsWired || typeof document === 'undefined') return;
  var btn = document.getElementById('tend-detail-add-event');
  if (!btn) return;
  _tendDetailControlsWired = true;
  btn.addEventListener('click', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var ctx = tendStore.detailContext;
    var defaultDate = '';
    if (ctx && ctx.setsAsc && tendStore.detailSelectedIndex != null) {
      defaultDate = dayValueFromTrendChartIndex(tendStore.detailSelectedIndex, ctx.setsAsc);
    }
    if (!defaultDate && ctx && ctx.setsAsc && ctx.setsAsc.length) {
      defaultDate = dayValueFromTrendChartIndex(ctx.setsAsc.length - 1, ctx.setsAsc);
    }
    openTendEventComposeModal(defaultDate ? { defaultDate: defaultDate } : undefined);
  });
}

function syncTendDetailEventsLegend(markerMap, labels) {
  var slot = document.getElementById('tend-detail-events-slot');
  if (!slot) return;
  var html = buildTendDetailEventsLegendHtml(markerMap, labels);
  slot.innerHTML = html;
  slot.setAttribute('aria-hidden', html ? 'false' : 'true');
}

/**
 * Bloque "anterior" de estudios (líneas 0–2): suele traer la fecha en la 1.ª línea
 * o en FECHA/HORA. Si no, se usa la fecha de la nota clínica como último recurso.
 */
function tryInferDateFromLine(text) {
  var mFh = text.match(/FECHA[^\d:]*(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i);
  if (mFh) {
    var nf0 = normalizeFechaLabHistory(mFh[1]);
    if (nf0 && nf0 !== 'Anterior' && parseFechaLabToMs(nf0, '') > 0) return nf0;
  }
  var mSub = text.match(/(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/);
  if (mSub) {
    var nf1 = normalizeFechaLabHistory(mSub[1]);
    if (nf1 && nf1 !== 'Anterior' && parseFechaLabToMs(nf1, '') > 0) return nf1;
  }
  var nf2 = normalizeFechaLabHistory(text);
  if (nf2 && nf2 !== 'Anterior' && parseFechaLabToMs(nf2, '') > 0) return nf2;
  return '';
}

function inferAnteriorLabDateFromNote(patientId) {
  var n = getNotes()[patientId];
  if (!n || !n.estudios) return '';
  var lines = n.estudios.split('\n');
  for (var i = 0; i < 3 && i < lines.length; i++) {
    var t = (lines[i] || '').trim();
    if (!t) continue;
    var inferred = tryInferDateFromLine(t);
    if (inferred) return inferred;
  }
  if (!n.fecha) return '';
  var nf3 = normalizeFechaLabHistory(n.fecha);
  if (nf3 && nf3 !== 'Anterior' && parseFechaLabToMs(nf3, '') > 0) return nf3;
  return '';
}

function tendDetailChartOptions(title, unit, markerMap, primaryValues, ref) {
  var yBounds = yScaleBoundsForRef(primaryValues, ref);
  var yScale = {
    ticks: { font: { size: 12 } },
    title: { display: !!unit, text: unit, font: { size: 11 } },
    grace: '5%',
  };
  if (yBounds) {
    yScale.min = yBounds.min;
    yScale.max = yBounds.max;
  }
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    transitions: {
      active: { animation: { duration: 0 } },
    },
    layout: { padding: { right: 12, left: 4, top: 8, bottom: 4 } },
    interaction: { mode: 'index', intersect: false, axis: 'x' },
    onClick: function (_evt, elements) {
      if (elements && elements.length) {
        tendStore.detailSelectedIndex = elements[0].index;
      }
    },
    plugins: {
      legend: { display: false, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      tendRefBand: tendRefBandOptions(ref, false),
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        position: 'nearest',
        callbacks: {
          label: function (ctx) {
            var lab = (ctx.dataset && ctx.dataset.label) || title;
            var u = ctx.datasetIndex === 0 ? unit : (ctx.dataset && ctx.dataset.unit) || '';
            var line = lab + ': ' + ctx.parsed.y + (u ? ' ' + u : '');
            if (ctx.datasetIndex === 0) {
              var dlt = formatTendTooltipDelta(primaryValues || ctx.dataset.data, ctx.dataIndex);
              if (dlt) line += ' (' + dlt + ')';
            }
            return line;
          },
          afterBody: function (items) {
            if (!items || !items.length || !markerMap) return [];
            return eventTooltipLinesForChartIndex(markerMap, items[0].dataIndex);
          },
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 12 } }, offset: true },
      y: yScale,
    },
  };
}

function updateTendDetailChartInPlace(labels, values, title, ref, latest, unit, markerMap) {
  if (!tendStore.detailChart || !tendStore.detailChart.data || !tendStore.detailChart.data.datasets[0]) return false;
  tendStore.detailChart.data.labels = labels;
  tendStore.detailChart.data.datasets[0].label = title;
  tendStore.detailChart.data.datasets[0].data = values;
  tendStore.detailChart.options = tendDetailChartOptions(title, unit, markerMap, values, ref);
  tendStore.detailChart.update('none');
  syncTendDetailVbar(ref, latest);
  syncTendDetailEventsLegend(markerMap, labels);
  return true;
}

function syncTendDetailVbar(ref, latest) {
  void ref;
  void latest;
  // Side column removed — normality is the chart horizontal band only.
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (!vbarSlot) return;
  vbarSlot.innerHTML = '';
  vbarSlot.setAttribute('aria-hidden', 'true');
}

function downsampleTrendChartSeries(labels, values, maxPoints) {
  var slots = maxPoints == null ? TREND_DETAIL_DOWNSAMPLE : maxPoints;
  if (!labels || !labels.length || labels.length <= slots) {
    return { labels: labels || [], values: values || [] };
  }
  var outL = [];
  var outV = [];
  var n = labels.length;
  for (var i = 0; i < slots; i += 1) {
    var idx = Math.round((i * (n - 1)) / (slots - 1));
    outL.push(labels[idx]);
    outV.push(values[idx]);
  }
  return { labels: outL, values: outV };
}


function siblingFieldKeys(sectionKey, fieldKey, history) {
  var keys = {};
  (history || []).forEach(function (set) {
    var sec = set && set[sectionKey];
    if (!sec || typeof sec !== 'object') return;
    Object.keys(sec).forEach(function (k) {
      if (k !== fieldKey) keys[k] = true;
    });
  });
  return Object.keys(keys).sort();
}

function ensureTendDetailCompareSlot(
  sectionKey,
  fieldKey,
  history,
  labels,
  values,
  title,
  unit,
  ref,
  latest,
  markerMap
) {
  var modal = document.getElementById('tend-detail-modal');
  if (!modal) return;
  var slot = document.getElementById('tend-detail-compare-slot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'tend-detail-compare-slot';
    slot.className = 'tend-detail-compare-slot';
    var titleEl = document.getElementById('tend-detail-title');
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.insertBefore(slot, titleEl.nextSibling);
    }
  }
  var siblings = siblingFieldKeys(sectionKey, fieldKey, history);
  if (!siblings.length) {
    slot.innerHTML = '';
    slot.hidden = true;
    tendStore.detailCompareFieldKey = null;
    return;
  }
  slot.hidden = false;
  var current = tendStore.detailCompareFieldKey;
  if (current && siblings.indexOf(current) < 0) current = null;
  var opts =
    '<option value="">Sin comparar</option>' +
    siblings
      .map(function (k) {
        return (
          '<option value="' +
          k.replace(/"/g, '&quot;') +
          '"' +
          (k === current ? ' selected' : '') +
          '>' +
          k +
          '</option>'
        );
      })
      .join('');
  slot.innerHTML =
    '<span class="tend-detail-compare-label">Comparar con</span>' +
    '<select class="tend-detail-compare-select" id="tend-detail-compare-select" aria-label="Comparar con otro analito">' +
    opts +
    '</select>';
  var sel = document.getElementById('tend-detail-compare-select');
  if (!sel) return;
  sel.onchange = function () {
    tendStore.detailCompareFieldKey = sel.value || null;
    applyTendDetailCompare(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap);
  };
  applyTendDetailCompare(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap);
}

function applyTendDetailCompare(
  sectionKey,
  fieldKey,
  history,
  labels,
  values,
  title,
  unit,
  ref,
  latest,
  markerMap
) {
  if (!tendStore.detailChart || !tendStore.detailChart.data) return;
  var compareKey = tendStore.detailCompareFieldKey;
  var datasets = [
    {
      label: title,
      data: values,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.08)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#10b981',
      tension: 0.3,
      fill: false,
      unit: unit,
    },
  ];
  if (compareKey) {
    var setsDesc = dedupeTrendSetsForSeries(
      history.filter(function (s) {
        return getSetTrendValueForSeries(s, sectionKey, compareKey) != null;
      }),
      sectionKey,
      compareKey
    );
    var setsAsc = toTrendAscendingSets(setsDesc);
    var cLabels = buildTendChartLabels(setsAsc);
    var cValues = setsAsc.map(function (s) {
      return getSetTrendValueForSeries(s, sectionKey, compareKey);
    });
    var aligned = alignSeriesToLabels(labels, cLabels, cValues);
    var cParts = tendCardLabelParts(sectionKey, compareKey);
    datasets.push({
      label: cParts.title || compareKey,
      data: aligned,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#3b82f6',
      tension: 0.3,
      fill: false,
      unit: cParts.unit || '',
      spanGaps: true,
    });
  }
  tendStore.detailChart.data.datasets = datasets;
  tendStore.detailChart.options = tendDetailChartOptions(title, unit, markerMap, values, ref);
  tendStore.detailChart.options.plugins.legend.display = datasets.length > 1;
  tendStore.detailChart.update('none');
  syncTendDetailVbar(ref, latest);
}

function openTendDetail(sectionKey, fieldKey) {
  void openTendDetailAsync(sectionKey, fieldKey);
}

function openTendDetailAsync(sectionKey, fieldKey) {
  if (!aid() || sectionKey == null || fieldKey == null) return Promise.resolve();
  var history = tendParsedHistoryDesc(aid());
  var setsDesc = dedupeTrendSetsForSeries(
    history.filter(function (s) {
      return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
    }),
    sectionKey,
    fieldKey
  );
  if (setsDesc.length < 2) return Promise.resolve();
  var setsAsc = toTrendAscendingSets(setsDesc);
  var labels = buildTendChartLabels(setsAsc);
  var values = setsAsc.map(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey);
  });
  var sampled =
    labels.length > TREND_DETAIL_DOWNSAMPLE
      ? downsampleTrendChartSeries(labels, values, TREND_DETAIL_DOWNSAMPLE)
      : { labels: labels, values: values };
  labels = sampled.labels;
  values = sampled.values;
  var labelParts = tendCardLabelParts(sectionKey, fieldKey);
  var title = labelParts.title;
  var unit = labelParts.unit;
  var latestSet = setsDesc.length ? setsDesc[0] : null;
  var latest = latestSet ? getSetTrendValueForSeries(latestSet, sectionKey, fieldKey) : null;
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  var markerMap = buildEventMarkerMapForSets(setsAsc, aid());
  tendStore.detailContext = { setsAsc: setsAsc, markerMap: markerMap, labels: labels };
  tendStore.detailSelectedIndex = labels.length ? labels.length - 1 : null;
  ensureTendDetailControlsWired();
  document.getElementById('tend-detail-title').textContent =
    title + (labelParts.unit ? ' (' + labelParts.unit + ')' : '');
  ensureTendDetailCompareSlot(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap);
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) {
    vbarSlot.innerHTML = '';
    vbarSlot.setAttribute('aria-hidden', 'true');
  }
  syncTendDetailEventsLegend(markerMap, labels);
  var backdrop = document.getElementById('tend-detail-backdrop');
  if (!backdrop) return;
  cancelOverlayClose(backdrop);
  backdrop.style.display = 'flex';
  var canvas = document.getElementById('tend-detail-canvas');
  if (!canvas) {
    backdrop.style.display = 'none';
    return Promise.resolve();
  }
  return loadChartJs()
    .then(function (Chart) {
      try {
        if (
          tendStore.detailChart &&
          tendStore.detailChart.canvas === canvas &&
          updateTendDetailChartInPlace(labels, values, title, ref, latest, unit, markerMap)
        ) {
          return;
        }
        if (tendStore.detailChart) {
          tendStore.detailChart.destroy();
          tendStore.detailChart = null;
        }
        mountTendDetailChart(Chart, canvas, labels, values, title, ref, latest, unit, markerMap);
      } catch (mountErr) {
        console.error('[R+ Tendencias] detail chart mount', mountErr);
        rt.showToast('Gráfica no disponible (error al dibujar). Recarga la app.', 'error');
        backdrop.style.display = 'none';
      }
    })
    .catch(function (err) {
      console.error('[R+ Tendencias] detail chart load', err);
      rt.showToast('Gráfica no disponible (Chart.js no cargó). Recarga la app.', 'error');
      backdrop.style.display = 'none';
    });
}

function mountTendDetailChart(Chart, canvas, labels, values, title, ref, latest, unit, markerMap) {
  var datasets = [
    {
      label: title,
      data: values,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.08)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#10b981',
      tension: 0.3,
      fill: false,
    },
  ];
  var eventPlugin = createTendEventMarkerPlugin(markerMap, { compact: false });
  var refPlugin = createTendRefBandPlugin();
  tendStore.detailChart = new Chart(canvas, {
    type: 'line',
    plugins: [refPlugin, eventPlugin],
    data: { labels: labels, datasets: datasets },
    options: tendDetailChartOptions(title, unit, markerMap, values, ref),
  });
  syncTendDetailVbar(ref, latest);
  syncTendDetailEventsLegend(markerMap, labels);
}

export function closeTendDetail() {
  var backdrop = document.getElementById('tend-detail-backdrop');
  closeOverlayAnimated(backdrop, function () {
    if (backdrop) backdrop.style.display = 'none';
    var vbarSlot = document.getElementById('tend-detail-vbar-slot');
    if (vbarSlot) {
      vbarSlot.innerHTML = '';
      vbarSlot.setAttribute('aria-hidden', 'true');
    }
    var eventsSlot = document.getElementById('tend-detail-events-slot');
    if (eventsSlot) {
      eventsSlot.innerHTML = '';
      eventsSlot.setAttribute('aria-hidden', 'true');
    }
    tendStore.detailContext = null;
    tendStore.detailSelectedIndex = null;
    if (tendStore.detailChart) { tendStore.detailChart.destroy(); tendStore.detailChart = null; }
  });
}


export {
  formatDMYDate,
  inferFechaLabSetFromId,
  inferAnteriorLabDateFromNote,
  tendDetailChartOptions,
  updateTendDetailChartInPlace,
  syncTendDetailVbar,
  downsampleTrendChartSeries,
  openTendDetail,
  openTendDetailAsync,
};
