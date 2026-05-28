/**
 * Sparklines ligeros (canvas 2D) para tarjetas de Tendencias — sin Chart.js por tarjeta.
 */

function fitCanvas(canvas) {
  var rect = canvas.getBoundingClientRect();
  var w = Math.max(1, Math.round(rect.width || canvas.clientWidth || 120));
  var h = Math.max(1, Math.round(rect.height || canvas.clientHeight || 40));
  var dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  var pw = Math.round(w * dpr);
  var ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  return { ctx: canvas.getContext('2d'), w: pw, h: ph, dpr: dpr };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(number|null|undefined)[]} values
 * @param {string} color
 */
export function drawTrendSparkLine(canvas, values, color) {
  if (!canvas) return;
  var fit = fitCanvas(canvas);
  var ctx = fit.ctx;
  if (!ctx) return;
  var w = fit.w;
  var h = fit.h;
  var dpr = fit.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.scale(dpr, dpr);
  var cssW = w / dpr;
  var cssH = h / dpr;

  var nums = (values || []).map(function (v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  });
  var finite = nums.filter(function (n) {
    return n != null;
  });
  if (finite.length < 1) return;

  var min = Math.min.apply(null, finite);
  var max = Math.max.apply(null, finite);
  if (max === min) {
    min -= 1;
    max += 1;
  }
  var padX = 6;
  var padY = 6;
  var innerW = Math.max(1, cssW - padX * 2);
  var innerH = Math.max(1, cssH - padY * 2);
  var n = nums.length;
  var step = n > 1 ? innerW / (n - 1) : 0;

  ctx.lineWidth = 2.25;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color || 'rgba(52,211,153,0.95)';
  ctx.beginPath();
  var started = false;
  for (var i = 0; i < n; i += 1) {
    var v = nums[i];
    if (v == null) {
      started = false;
      continue;
    }
    var x = padX + (n > 1 ? i * step : innerW / 2);
    var y = padY + innerH - ((v - min) / (max - min)) * innerH;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (started) ctx.stroke();

  ctx.fillStyle = ctx.strokeStyle;
  for (var j = 0; j < n; j += 1) {
    var v2 = nums[j];
    if (v2 == null) continue;
    var x2 = padX + (n > 1 ? j * step : innerW / 2);
    var y2 = padY + innerH - ((v2 - min) / (max - min)) * innerH;
    ctx.beginPath();
    ctx.arc(x2, y2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(number|null|undefined)[]} values
 * @param {string} color
 * @returns {{ update: function, destroy: function }}
 */
export function mountTrendSparkCanvas(canvas, values, color) {
  drawTrendSparkLine(canvas, values, color);
  return {
    update(nextValues, nextColor) {
      drawTrendSparkLine(canvas, nextValues, nextColor || color);
    },
    destroy() {
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
