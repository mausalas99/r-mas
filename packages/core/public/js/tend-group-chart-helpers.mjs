import { familyOrderForSection, migratePanelFamilyKey, colKeyForTrendSet } from './tend-core.mjs';

const GENERIC_FAMILY_ORDER = ['gases', 'percent-diff', 'percent-rbc', 'absolute'];

function roundAxisBound(n, direction) {
  if (!isFinite(n)) return n;
  var abs = Math.abs(n);
  var step = abs <= 2 ? 0.5 : abs <= 20 ? 1 : abs <= 100 ? 5 : 10;
  if (direction === 'up') return Math.ceil(n / step) * step;
  return Math.floor(n / step) * step;
}

function formatAxisTickValue(v) {
  if (!isFinite(v)) return '';
  var r = Math.round(v * 1000) / 1000;
  if (Math.abs(r - Math.round(r)) < 1e-6) return String(Math.round(r));
  if (Math.abs(r * 10 - Math.round(r * 10)) < 1e-6) return String(Math.round(r * 10) / 10);
  return String(r);
}

function yScaleBoundsForDatasets(datasets, family) {
  var min = Infinity;
  var max = -Infinity;
  (datasets || []).forEach(function (ds) {
    (ds.data || []).forEach(function (y) {
      if (y != null && isFinite(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    });
    (ds.thresholds || []).forEach(function (t) {
      if (t && isFinite(t.value)) {
        if (t.value < min) min = t.value;
        if (t.value > max) max = t.value;
      }
    });
  });
  if (!isFinite(min)) return {};
  var pad = Math.max((max - min) * 0.12, 0.35);
  if (family === 'percent-diff' || family === 'bh-diff' || family === 'bh-diff-manual') {
    return { min: 0, max: Math.min(100, roundAxisBound(max + pad, 'up')) };
  }
  if (family === 'percent-rbc' || family === 'bh-quality') {
    return { min: 0, max: Math.min(60, roundAxisBound(max + pad, 'up')) };
  }
  if (min === max) {
    var padEq = Math.abs(min) * 0.12 || 1;
    return {
      min: roundAxisBound(min - padEq, 'down'),
      max: roundAxisBound(max + padEq, 'up')
    };
  }
  return {
    min: roundAxisBound(min - pad, 'down'),
    max: roundAxisBound(max + pad, 'up')
  };
}

function visibleDatasetsForChart(chart) {
  if (!chart || !chart.data || !chart.data.datasets) return [];
  return chart.data.datasets.filter(function (_ds, i) {
    return chart.isDatasetVisible(i);
  });
}

function applyChartYScale(chart, family) {
  if (!chart || !chart.options || !chart.options.scales || !chart.options.scales.y) return;
  var visible = visibleDatasetsForChart(chart);
  var y = chart.options.scales.y;
  if (!visible.length) {
    delete y.min;
    delete y.max;
    y.grace = '5%';
    return;
  }
  var bounds = yScaleBoundsForDatasets(visible, family);
  if (bounds.min != null && bounds.max != null) {
    y.min = bounds.min;
    y.max = bounds.max;
    delete y.grace;
  } else {
    delete y.min;
    delete y.max;
    y.grace = '5%';
  }
}

function tendPanelEventsSvg() {
  return (
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83Z"/>' +
    '<circle cx="7.5" cy="7.5" r="1.5"/></svg>'
  );
}

function tendPanelEyeSvg() {
  return (
    '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
  );
}

function orderPanelFamilies(activeFamilies, savedOrder, sectionKey) {
  var baseOrder = familyOrderForSection(sectionKey);
  var rank = Object.create(null);
  if (savedOrder && savedOrder.length) {
    savedOrder.forEach(function (fam, i) {
      var migrated = migratePanelFamilyKey(sectionKey, fam);
      rank[migrated] = i;
    });
  }
  var missingBase = (savedOrder && savedOrder.length ? savedOrder.length : baseOrder.length) + 100;
  return activeFamilies.slice().sort(function (a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : missingBase + baseOrder.indexOf(a);
    var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : missingBase + baseOrder.indexOf(b);
    if (ra !== rb) return ra - rb;
    var ia = baseOrder.indexOf(a);
    var ib = baseOrder.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}

function formatTrendDisplayValue(val) {
  if (val == null || !isFinite(val)) return '—';
  if (val !== 0 && Math.abs(val) < 0.1) return val.toFixed(2);
  if (Math.abs(val) < 10 && Math.floor(val) !== val) {
    return String(Math.round(val * 100) / 100);
  }
  return String(val);
}

function drawThresholdLine(ctx, chartArea, y, color, text) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(chartArea.left, y);
  ctx.lineTo(chartArea.right, y);
  ctx.stroke();
  if (text) {
    ctx.setLineDash([]);
    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, chartArea.right - 4, y - 2);
  }
  ctx.restore();
}

/** Dotted horizontal reference lines (e.g. transfusion/biopsy thresholds) per visible dataset. */
function createTendThresholdPlugin() {
  return {
    id: 'tendThresholdLines',
    afterDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      var yScale = chart.scales && chart.scales.y;
      var chartArea = chart.chartArea;
      if (!ctx || !yScale || !chartArea) return;
      (chart.data.datasets || []).forEach(function (ds, idx) {
        if (!ds.thresholds || !ds.thresholds.length) return;
        if (!chart.isDatasetVisible(idx)) return;
        ds.thresholds.forEach(function (t) {
          var y = yScale.getPixelForValue(t.value);
          if (!isFinite(y) || y < chartArea.top || y > chartArea.bottom) return;
          var text = t.label
            ? t.label + ' · ' + formatTrendDisplayValue(t.value)
            : formatTrendDisplayValue(t.value);
          drawThresholdLine(ctx, chartArea, y, ds.borderColor, text);
        });
      });
    },
  };
}

function colKeyForSet(set) {
  return colKeyForTrendSet(set);
}

function toAscendingHistory(historyDesc) {
  return (historyDesc || []).slice().reverse();
}

function hexToRgba(hex, alpha) {
  var h = String(hex || '').replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return 'rgba(16,185,129,' + alpha + ')';
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}


export {
  GENERIC_FAMILY_ORDER,
  roundAxisBound,
  formatAxisTickValue,
  yScaleBoundsForDatasets,
  visibleDatasetsForChart,
  applyChartYScale,
  tendPanelEyeSvg,
  tendPanelEventsSvg,
  orderPanelFamilies,
  formatTrendDisplayValue,
  colKeyForSet,
  toAscendingHistory,
  hexToRgba,
  createTendThresholdPlugin,
};
