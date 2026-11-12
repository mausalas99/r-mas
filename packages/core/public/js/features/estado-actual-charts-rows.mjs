// Gráficas de monitoreo — one row per sign, plain SVG/DOM, no Chart.js:
// one shared crosshair has to move across every row at once, which is
// simpler as real hit-target columns (hover/focus → re-render) than as N
// synced Chart.js instances. Pure math (axis dedupe, per-day balance) lives
// in estado-actual-charts-series.mjs; markup is the lazy Preact view in
// estado-actual-charts-rows-view.jsx; this file is state + event glue only.
import {
  buildSharedVitalRows,
  buildDailyBalanceSeries,
  buildGluSeries,
  historialSortedAsc,
} from './estado-actual-charts-series.mjs';

// Lazy: keeps Preact + the chart view out of the eager boot bundle.
var viewMod = null;
var viewLoading = null;

function withView(fn) {
  if (viewMod) return fn(viewMod);
  if (!viewLoading) viewLoading = import('./estado-actual-charts-rows-view.jsx').then(function (m) { viewMod = m; return m; });
  return viewLoading.then(fn);
}

// Latest request wins: a draw queued behind the first import is dropped if a newer render/destroy came in.
function draw(mountEl, ctl, props) {
  var seq = (mountEl._eaRowsSeq = (mountEl._eaRowsSeq || 0) + 1);
  withView(function (v) {
    if (mountEl._eaRowsSeq === seq) v.drawEaCharts(mountEl, ctl, props);
  });
}

/** Which tabs have enough data to show. */
function eaRowsTabsReady(histAsc) {
  return {
    vit: buildSharedVitalRows(histAsc).length >= 2,
    glu: buildGluSeries(histAsc, undefined, { forCharts: true }).values.length >= 2,
    bal: buildDailyBalanceSeries(histAsc).days.length >= 1,
  };
}

/** Header slot for the tab/period pills (falls back to the top of the mount). */
function controlsEl(mountEl) {
  var modal = typeof mountEl.closest === 'function' ? mountEl.closest('.ea-charts-modal') : null;
  return modal ? modal.querySelector('#ea-charts-controls') : null;
}

/**
 * @param {HTMLElement} mountEl
 * @param {unknown} monitoreo
 */
export function renderEaChartsRows(mountEl, monitoreo) {
  if (!mountEl) return;
  /** @type {any} */
  var m = monitoreo || {};
  var histAsc = historialSortedAsc(Array.isArray(m.historial) ? m.historial : []);
  var ctl = controlsEl(mountEl);
  wireEaChartsRows(mountEl, ctl);
  if (histAsc.length < 2) {
    draw(mountEl, ctl, { empty: true });
    return;
  }

  var ready = eaRowsTabsReady(histAsc);
  var tab = mountEl._eaRowsTab;
  if (!tab || !ready[tab]) tab = ready.vit ? 'vit' : ready.glu ? 'glu' : 'bal';
  var range = mountEl._eaRowsRange || 'last5';
  var sel = mountEl._eaRowsSel != null ? mountEl._eaRowsSel : null;
  mountEl._eaRowsTab = tab;
  mountEl._eaRowsRange = range;
  mountEl._eaRowsHistAsc = histAsc;

  draw(mountEl, ctl, { tab: tab, histAsc: histAsc, range: range, sel: sel, ready: ready });
}

function setEaRowsState(mountEl, patch) {
  Object.assign(mountEl, patch);
  renderEaChartsRows(mountEl, { historial: mountEl._eaRowsHistAsc });
}

// ponytail: every crosshair move re-renders the pane (≈ rows × points nodes);
// fine for «Últimas 5» and a few hundred «Todas» points, move the guide/dots
// in place if a very long stay ever lags.
function pickColumn(mountEl, hitBtn, refocus) {
  var i = Number(hitBtn.getAttribute('data-ea-hit'));
  if (i === mountEl._eaRowsSel) return;
  var plot = hitBtn.getAttribute('data-ea-hit-plot');
  setEaRowsState(mountEl, { _eaRowsSel: i });
  if (!refocus) return;
  var again = mountEl.querySelector('[data-ea-hit-plot="' + plot + '"][data-ea-hit="' + i + '"]');
  if (again) again.focus();
}

function onControlsClick(mountEl, ev) {
  var target = ev.target;
  if (!target || typeof target.closest !== 'function') return;
  var tabBtn = target.closest('[data-ea-tab]');
  if (tabBtn && !tabBtn.disabled) {
    var tab = tabBtn.getAttribute('data-ea-tab');
    if (tab !== mountEl._eaRowsTab) setEaRowsState(mountEl, { _eaRowsTab: tab, _eaRowsSel: null });
    return;
  }
  var rangeBtn = target.closest('[data-ea-range]');
  if (rangeBtn) {
    var range = rangeBtn.getAttribute('data-ea-range');
    if (range !== mountEl._eaRowsRange) setEaRowsState(mountEl, { _eaRowsRange: range, _eaRowsSel: null });
  }
}

function wireEaChartsRows(mountEl, ctl) {
  if (ctl && !ctl._eaRowsWired) {
    ctl._eaRowsWired = true;
    ctl.addEventListener('click', function (ev) {
      onControlsClick(mountEl, ev);
    });
  }
  if (mountEl._eaRowsWired) return;
  mountEl._eaRowsWired = true;
  mountEl.addEventListener('click', function (ev) {
    onControlsClick(mountEl, ev);
    var hitBtn = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('[data-ea-hit]') : null;
    if (hitBtn) pickColumn(mountEl, hitBtn, true);
  });
  mountEl.addEventListener('mouseover', function (ev) {
    var hitBtn = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('[data-ea-hit]') : null;
    if (hitBtn) pickColumn(mountEl, hitBtn, false);
  });
  mountEl.addEventListener('focusin', function (ev) {
    var hitBtn = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('[data-ea-hit]') : null;
    if (hitBtn) pickColumn(mountEl, hitBtn, true);
  });
  mountEl.addEventListener('keydown', function (ev) {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    var hitBtn = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('[data-ea-hit]') : null;
    if (!hitBtn) return;
    ev.preventDefault();
    var plot = hitBtn.getAttribute('data-ea-hit-plot');
    var next = Number(hitBtn.getAttribute('data-ea-hit')) + (ev.key === 'ArrowLeft' ? -1 : 1);
    var target = mountEl.querySelector('[data-ea-hit-plot="' + plot + '"][data-ea-hit="' + next + '"]');
    if (target) pickColumn(mountEl, target, true);
  });
  mountEl.addEventListener('mouseleave', function () {
    if (mountEl._eaRowsSel != null && !mountEl.contains(document.activeElement)) setEaRowsState(mountEl, { _eaRowsSel: null });
  });
}

/** Back to defaults (Signos vitales, «Últimas 5», no crosshair) for the next open. */
export function destroyEaChartsRows(mountEl) {
  if (!mountEl) return;
  mountEl._eaRowsSel = null;
  mountEl._eaRowsTab = null;
  mountEl._eaRowsRange = null;
  mountEl._eaRowsHistAsc = null;
  // Drops any draw still waiting on the first import and unmounts the Preact roots.
  draw(mountEl, controlsEl(mountEl), null);
}
