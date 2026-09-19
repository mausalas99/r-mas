/**
 * Loading state: label + optional pixel/dots grid + mono elapsed timer.
 * Clinical default = Dots; Drive (square pixels) only when motion-mode is expresivo.
 */
import { prefersReducedMotion } from './ui-motion.mjs';

var CHEVRON = (function () {
  var out = [];
  for (var i = 0; i < 9; i += 1) {
    var r = Math.floor(i / 3);
    var c = i % 3;
    out.push((c + Math.abs(r - 1)) * 90);
  }
  return out;
})();

var ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
var ORBIT = (function () {
  var out = [];
  for (var i = 0; i < 9; i += 1) {
    var k = ORBIT_ORDER.indexOf(i);
    out.push(k === -1 ? null : k * 110);
  }
  return out;
})();

var PATTERNS = {
  Drive: { delays: CHEVRON, dur: 650, round: false },
  Dots: { delays: CHEVRON, dur: 650, round: true },
  Orbit: { delays: ORBIT, dur: 950, round: false },
};

export function formatElapsedSeconds(totalSeconds) {
  var total = Number(totalSeconds);
  if (!Number.isFinite(total) || total < 0) total = 0;
  if (total < 60) return total.toFixed(1) + 's';
  var m = Math.floor(total / 60);
  var s = total % 60;
  return m + 'm ' + s.toFixed(1) + 's';
}

export function resolveLoadingVariant(requested) {
  var v = requested || 'Dots';
  if (v === 'Drive' || v === 'Orbit' || v === 'Dots') return v;
  return 'Dots';
}

export function loadingVariantForMotionMode(mode, requested) {
  var v = resolveLoadingVariant(requested);
  if (v === 'Drive' && mode !== 'expresivo') return 'Dots';
  return v;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildLoadingStateHtml(opts) {
  opts = opts || {};
  var label = opts.label != null ? String(opts.label) : 'Procesando…';
  var variant = resolveLoadingVariant(opts.variant);
  var pattern = PATTERNS[variant] || PATTERNS.Dots;
  var reduced = opts.reducedMotion === true;
  var elapsed = opts.elapsedText != null ? String(opts.elapsedText) : '0.0s';
  var cells = pattern.delays
    .map(function (d) {
      var round = pattern.round ? ' ui-loading-cell--round' : '';
      var style =
        d === null || reduced
          ? 'opacity:0.07;animation:none'
          : 'opacity:0.15;animation:ui-pixel-on ' +
            pattern.dur +
            'ms ease-in-out ' +
            d +
            'ms infinite';
      return (
        '<span class="ui-loading-cell' +
        round +
        '" style="' +
        style +
        '" aria-hidden="true"></span>'
      );
    })
    .join('');
  return (
    '<span class="ui-loading-state" data-variant="' +
    esc(variant) +
    '" role="status" aria-live="polite">' +
    '<span class="ui-loading-grid" aria-hidden="true">' +
    cells +
    '</span>' +
    '<span class="ui-loading-label' +
    (reduced ? '' : ' ui-loading-label--shimmer') +
    '">' +
    esc(label) +
    '</span>' +
    '<span class="ui-loading-elapsed">' +
    esc(elapsed) +
    '</span></span>'
  );
}

export function mountLoadingState(host, opts) {
  if (!host) return null;
  opts = opts || {};
  var startedAt = opts.startedAt || Date.now();
  var reduced = opts.reducedMotion != null ? !!opts.reducedMotion : prefersReducedMotion();
  var state = {
    host: host,
    label: opts.label || 'Procesando…',
    variant: resolveLoadingVariant(opts.variant),
    startedAt: startedAt,
    reducedMotion: reduced,
    timer: null,
  };
  function paint() {
    var sec = (Date.now() - state.startedAt) / 1000;
    host.innerHTML = buildLoadingStateHtml({
      label: state.label,
      variant: state.variant,
      reducedMotion: state.reducedMotion,
      elapsedText: formatElapsedSeconds(sec),
    });
  }
  paint();
  state.timer = setInterval(paint, 100);
  return state;
}

export function destroyLoadingState(state) {
  if (!state) return;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  if (state.host) state.host.innerHTML = '';
}
