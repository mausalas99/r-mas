/**
 * Chart.js plugin: horizontal normality (reference) band for Tendencias.
 * Config via options.plugins.tendRefBand = { lo, hi, compact? }.
 */

export function normalizeTendRef(ref) {
  if (!ref || ref.length < 2) return null;
  var lo = Number(ref[0]);
  var hi = Number(ref[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo === hi) return null;
  if (lo > hi) {
    var t = lo;
    lo = hi;
    hi = t;
  }
  return { lo: lo, hi: hi };
}

/** Expand Y domain so the reference band stays visible with the series. */
export function yScaleBoundsForRef(values, ref) {
  var nums = [];
  for (var i = 0; i < (values || []).length; i += 1) {
    var n = Number(values[i]);
    if (Number.isFinite(n)) nums.push(n);
  }
  var norm = normalizeTendRef(ref);
  if (norm) {
    nums.push(norm.lo, norm.hi);
  }
  if (!nums.length) return null;
  var min = Math.min.apply(null, nums);
  var max = Math.max.apply(null, nums);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  var pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}

export function tendRefBandOptions(ref, compact) {
  var norm = normalizeTendRef(ref);
  if (!norm) return { display: false };
  return {
    display: true,
    lo: norm.lo,
    hi: norm.hi,
    compact: !!compact,
  };
}

/**
 * Draw a soft band between lo/hi on the Y scale (before datasets).
 * @returns {object} Chart.js plugin
 */
export function createTendRefBandPlugin() {
  return {
    id: 'tendRefBand',
    beforeDatasetsDraw: function (chart) {
      var cfg = chart.options && chart.options.plugins && chart.options.plugins.tendRefBand;
      if (!cfg || cfg.display === false) return;
      var lo = Number(cfg.lo);
      var hi = Number(cfg.hi);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return;
      var yScale = chart.scales && chart.scales.y;
      var xScale = chart.scales && chart.scales.x;
      if (!yScale || !xScale) return;
      var top = yScale.getPixelForValue(hi);
      var bottom = yScale.getPixelForValue(lo);
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;
      if (bottom < top) {
        var swap = top;
        top = bottom;
        bottom = swap;
      }
      var left = xScale.left;
      var right = xScale.right;
      var h = bottom - top;
      if (h < 1) return;
      var ctx = chart.ctx;
      var compact = !!cfg.compact;
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, right - left, h);
      ctx.fillStyle = compact
        ? 'rgba(52, 211, 153, 0.10)'
        : 'rgba(52, 211, 153, 0.14)';
      ctx.fill();
      if (!compact) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
        ctx.moveTo(left, bottom);
        ctx.lineTo(right, bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    },
  };
}
