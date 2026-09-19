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

/**
 * Y domain from the series values. The reference band only pulls the domain
 * toward it when it is close to the data — if the patient is far outside
 * normal (e.g. platelets at 40 vs a 150-400 band), the band stays out of
 * view instead of flattening the trend line.
 */
export function yScaleBoundsForRef(values, ref) {
  var nums = [];
  for (var i = 0; i < (values || []).length; i += 1) {
    var n = Number(values[i]);
    if (Number.isFinite(n)) nums.push(n);
  }
  var norm = normalizeTendRef(ref);
  if (!nums.length) {
    if (!norm) return null;
    nums.push(norm.lo, norm.hi);
  }
  var min = Math.min.apply(null, nums);
  var max = Math.max.apply(null, nums);
  if (norm) {
    var dataRange = max - min || Math.abs(min) * 0.2 || 1;
    var maxSpan = dataRange * 8;
    if (norm.lo < min && max - norm.lo <= maxSpan) min = norm.lo;
    if (norm.hi > max && norm.hi - min <= maxSpan) max = norm.hi;
  }
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

function resolveTendRefBandGeometry_(chart, cfg) {
  var lo = Number(cfg.lo);
  var hi = Number(cfg.hi);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  var yScale = chart.scales && chart.scales.y;
  var xScale = chart.scales && chart.scales.x;
  if (!yScale || !xScale) return null;
  var top = yScale.getPixelForValue(hi);
  var bottom = yScale.getPixelForValue(lo);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  if (bottom < top) {
    var swap = top;
    top = bottom;
    bottom = swap;
  }
  var h = bottom - top;
  if (h < 1) return null;
  return { top: top, bottom: bottom, left: xScale.left, right: xScale.right, h: h };
}

function drawTendRefBandFill_(ctx, geo, compact) {
  ctx.beginPath();
  ctx.rect(geo.left, geo.top, geo.right - geo.left, geo.h);
  ctx.fillStyle = compact ? 'rgba(52, 211, 153, 0.10)' : 'rgba(52, 211, 153, 0.14)';
  ctx.fill();
}

function drawTendRefBandLines_(ctx, geo) {
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(geo.left, geo.top);
  ctx.lineTo(geo.right, geo.top);
  ctx.moveTo(geo.left, geo.bottom);
  ctx.lineTo(geo.right, geo.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
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
      var geo = resolveTendRefBandGeometry_(chart, cfg);
      if (!geo) return;
      var ctx = chart.ctx;
      var compact = !!cfg.compact;
      ctx.save();
      drawTendRefBandFill_(ctx, geo, compact);
      if (!compact) drawTendRefBandLines_(ctx, geo);
      ctx.restore();
    },
  };
}
