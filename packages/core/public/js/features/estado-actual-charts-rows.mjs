// Gráficas de monitoreo — one row per sign, plain SVG/DOM, no Chart.js:
// one shared crosshair has to move across every row at once, which is
// simpler as real hit-target columns (hover/focus → re-render) than as N
// synced Chart.js instances. Pure math (axis dedupe, per-day balance) lives
// in estado-actual-charts-series.mjs; this file is DOM glue only.
import { GLU_RANGE, RANGES } from './estado-actual-ranges.mjs';
import {
  buildSharedVitalRows,
  buildAlignedVitalSeries,
  buildEaAxisTicks,
  buildDailyBalanceSeries,
  buildGluSeries,
  formatChartLabel,
  historialSortedAsc,
  chartColor,
} from './estado-actual-charts-series.mjs';

const VIT_ROWS = [
  { id: 'ta', group: 'Hemodinámico', label: 'T/A · mmHg', keys: ['tas', 'tad'], colors: ['--ea-chart-vital-1', '--ea-chart-vital-2'] },
  { id: 'fc', group: 'Hemodinámico', label: 'FC · lpm', keys: ['fc'], colors: ['--ea-chart-sign'] },
  { id: 'fr', group: 'Respiratorio', label: 'FR · rpm', keys: ['fr'], colors: ['--ea-chart-sign'] },
  { id: 'sat', group: 'Respiratorio', label: 'SpO₂ · %', keys: ['sat'], colors: ['--ea-chart-sign'] },
  { id: 'temp', group: 'Metabólico', label: 'Temp · °C', keys: ['temp'], colors: ['--ea-chart-sign'] },
];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function xPct(i, n) {
  return n <= 1 ? 50 : ((i + 0.5) / n) * 100;
}

function hitCols(plot, n, ariaFor) {
  var out = '';
  var w = n ? 100 / n : 0;
  for (var i = 0; i < n; i++) {
    out +=
      '<button type="button" class="ea-charts-hit" data-ea-hit="' + i + '" data-ea-hit-plot="' + plot + '" aria-label="' + esc(ariaFor(i)) + '" ' +
      'style="left:' + (xPct(i, n) - w / 2).toFixed(2) + '%;width:' + w.toFixed(2) + '%"></button>';
  }
  return out;
}

function guideDiv(sel, n) {
  return '<div class="ea-charts-guide" ' + (sel == null ? 'hidden' : '') + ' style="left:' + xPct(sel == null ? 0 : sel, n).toFixed(2) + '%"></div>';
}

function fmtNum(v) {
  return v == null ? '–' : Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/**
 * One sign: left info column (value at the crosshair or «Último», out-of-range
 * count) + plot with the normal band, lines, dots (amber ring when out of range).
 * @param {{ id: string, label: string }} rowDef
 * @param {{ values: (number|null)[], altered: boolean[], bandMin: number, bandMax: number, color: string }[]} series
 * @param {string[]} labels
 * @param {number|null} sel
 */
function renderSignRow(rowDef, series, labels, sel) {
  var n = labels.length;
  var bandMin = Math.min.apply(null, series.map(function (s) { return s.bandMin; }));
  var bandMax = Math.max.apply(null, series.map(function (s) { return s.bandMax; }));
  var vals = [].concat.apply([], series.map(function (s) { return s.values; })).filter(function (v) { return v != null; });
  var lo = Math.min.apply(null, vals.concat([bandMin]));
  var hi = Math.max.apply(null, vals.concat([bandMax]));
  var pad = (hi - lo) * 0.15 || 1;
  lo -= pad;
  hi += pad;
  var y = function (v) { return Math.max(2, Math.min(98, ((hi - v) / (hi - lo)) * 100)); };

  var at = sel == null ? n - 1 : sel;
  var big = series.map(function (s) { return fmtNum(s.values[at]); }).join(' / ');
  var nOut = series.reduce(function (a, s) { return a + s.altered.filter(Boolean).length; }, 0);
  var when = (sel == null ? 'Último · ' : '') + (labels[at] || '');
  var badge = nOut ? nOut + (nOut === 1 ? ' toma fuera de rango' : ' tomas fuera de rango') : 'En rango';

  var lines = '';
  var dots = '';
  series.forEach(function (s) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      if (s.values[i] == null) continue;
      pts.push(xPct(i, n).toFixed(2) + ',' + y(s.values[i]).toFixed(2));
      dots +=
        '<div class="ea-charts-dot' + (s.altered[i] ? ' ea-charts-dot--out' : '') + (i === sel ? ' ea-charts-dot--sel' : '') + '" ' +
        'style="left:' + xPct(i, n).toFixed(2) + '%;top:' + y(s.values[i]).toFixed(2) + '%;background:' + s.color + '"></div>';
    }
    if (pts.length) {
      lines += '<polyline fill="none" stroke="' + s.color + '" stroke-width="2" vector-effect="non-scaling-stroke" points="' + pts.join(' ') + '"></polyline>';
    }
  });

  return (
    '<div class="ea-charts-row">' +
    '<div class="ea-charts-row-info">' +
    '<span class="ea-charts-row-label">' + esc(rowDef.label) + '</span>' +
    '<span class="ea-charts-row-big">' + esc(big) + '</span>' +
    '<span class="ea-charts-row-when">' + esc(when) + '</span>' +
    '<span class="ea-charts-row-badge' + (nOut ? ' ea-charts-row-badge--out' : '') + '">' + esc(badge) + '</span>' +
    '</div>' +
    '<div class="ea-charts-row-plot" data-ea-plot="' + rowDef.id + '">' +
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<rect class="ea-charts-band" x="0" y="' + y(bandMax).toFixed(2) + '" width="100" height="' + Math.max(0, y(bandMin) - y(bandMax)).toFixed(2) + '"></rect>' +
    lines +
    '</svg>' +
    dots +
    guideDiv(sel, n) +
    hitCols(rowDef.id, n, function (i) { return rowDef.label + ', ' + (labels[i] || ''); }) +
    '</div>' +
    '</div>'
  );
}

/** X axis: day written once, hour only on days with more than one reading. */
function renderAxisRow(labels, sel, withKey) {
  var n = labels.length;
  var ticksHtml = buildEaAxisTicks(labels)
    .map(function (t, i) {
      return (
        '<div class="ea-charts-axis-tick" style="left:' + xPct(i, n).toFixed(2) + '%">' +
        '<span>' + esc(t.hour) + '</span>' +
        '<strong>' + esc(t.day) + '</strong>' +
        '</div>'
      );
    })
    .join('');
  return (
    '<div class="ea-charts-axis-row">' +
    '<div class="ea-charts-legend-key">' +
    (withKey ? '<span class="ea-charts-dot ea-charts-dot--out" style="background:' + chartColor('--ea-chart-sign') + '"></span>fuera de rango' : '') +
    '</div>' +
    '<div class="ea-charts-axis-plot" data-ea-plot="axis">' + ticksHtml + guideDiv(sel, n) + '</div>' +
    '</div>'
  );
}

function sliceRange(arr, range) {
  if (range === 'all' || arr.length <= 5) return arr;
  return arr.slice(arr.length - 5);
}

function renderVitPane(histAsc, range, sel) {
  var rows = sliceRange(buildSharedVitalRows(histAsc), range);
  var labels = rows.map(function (r) { return formatChartLabel(/** @type {any} */ (r).recordedAt); });
  var html = '';
  var lastGroup = null;
  VIT_ROWS.forEach(function (rowDef) {
    if (rowDef.group !== lastGroup) {
      html += '<div class="ea-charts-group-label">' + esc(rowDef.group) + '</div>';
      lastGroup = rowDef.group;
    }
    var series = rowDef.keys.map(function (key, idx) {
      var s = buildAlignedVitalSeries(rows, key);
      var band = RANGES[key];
      return {
        values: s.values,
        altered: s.altered,
        bandMin: band.min,
        bandMax: band.max === Infinity ? 100 : band.max,
        color: chartColor(rowDef.colors[idx]),
      };
    });
    html += renderSignRow(rowDef, series, labels, sel);
  });
  return html + renderAxisRow(labels, sel, true);
}

function renderGluPane(histAsc, range, sel) {
  var g = buildGluSeries(histAsc, undefined, { forCharts: true });
  var labels = sliceRange(g.labels, range);
  var series = [
    {
      values: sliceRange(g.values, range),
      altered: sliceRange(g.alteredFlags, range),
      bandMin: GLU_RANGE.min,
      bandMax: GLU_RANGE.max,
      color: chartColor('--ea-chart-sign'),
    },
  ];
  return (
    '<div class="ea-charts-group-label">Glucometrías</div>' +
    renderSignRow({ id: 'glu', label: 'Glucosa capilar · mg/dL' }, series, labels, sel) +
    renderAxisRow(labels, sel, true)
  );
}

function fmtSigned(v) {
  var sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return sign + Math.abs(v).toLocaleString('es-MX');
}

function balCard(label, valueHtml, sub) {
  return (
    '<div class="ea-charts-bal-card"><span class="ea-charts-bal-card-label">' + esc(label) + '</span>' +
    '<span class="ea-charts-bal-card-value">' + valueHtml + '</span>' +
    '<span class="ea-charts-bal-card-sub">' + esc(sub) + '</span></div>'
  );
}

function renderBalPane(histAsc, range, sel) {
  var d = buildDailyBalanceSeries(histAsc);
  var days = sliceRange(d.days, range);
  var offset = d.days.length - days.length;
  var ing = d.ing.slice(offset);
  var egr = d.egr.slice(offset);
  var net = d.net.slice(offset);
  var cum = d.cumulative.slice(offset);
  var n = days.length;
  var at = sel == null ? n - 1 : sel;
  var mL = ' <small>mL</small>';

  var cardsHtml =
    '<div class="ea-charts-bal-cards">' +
    balCard('Acumulado desde ingreso', esc(fmtSigned(cum[at])) + mL, sel == null ? 'Al ' + days[at] + ' · desde el ' + d.days[0] : 'Al ' + days[at]) +
    balCard('Balance del día', esc(fmtSigned(net[at])) + mL, (sel == null ? 'Último día · ' : '') + days[at]) +
    balCard(
      'Ingresos / egresos del día',
      '<span class="ing">' + esc(ing[at].toLocaleString('es-MX')) + '</span> / <span class="egr">' + esc(egr[at].toLocaleString('es-MX')) + '</span>',
      'mL'
    ) +
    '</div>';

  var maxAbs = Math.max.apply(null, ing.concat(egr).concat([1]));
  var bw = Math.min(14, (100 / n) * 0.4);
  var barsHtml = '';
  for (var i = 0; i < n; i++) {
    var x = xPct(i, n);
    var inH = (ing[i] / maxAbs) * 45;
    var outH = (egr[i] / maxAbs) * 45;
    var netY = 50 - (net[i] / maxAbs) * 45;
    barsHtml +=
      '<div class="ea-charts-bal-bar ea-charts-bal-bar--in" style="left:' + (x - bw / 2).toFixed(2) + '%;width:' + bw.toFixed(2) + '%;top:' + (50 - inH).toFixed(2) + '%;height:' + inH.toFixed(2) + '%"></div>' +
      '<div class="ea-charts-bal-bar ea-charts-bal-bar--out" style="left:' + (x - bw / 2).toFixed(2) + '%;width:' + bw.toFixed(2) + '%;top:50%;height:' + outH.toFixed(2) + '%"></div>' +
      '<div class="ea-charts-bal-net" style="left:' + (x - bw / 2 - 1).toFixed(2) + '%;width:' + (bw + 2).toFixed(2) + '%;top:' + netY.toFixed(2) + '%"></div>' +
      '<div class="ea-charts-bal-net-lbl' + (i === sel ? ' ea-charts-bal-net-lbl--sel' : '') + '" style="left:' + (x + bw / 2 + 1.5).toFixed(2) + '%;top:' + netY.toFixed(2) + '%">' + esc(fmtSigned(net[i])) + '</div>';
  }
  var barsPane =
    '<div class="ea-charts-row">' +
    '<div class="ea-charts-row-info ea-charts-bal-legend">' +
    '<span><i class="ea-charts-swatch ea-charts-swatch--in"></i>Ingresos · arriba</span>' +
    '<span><i class="ea-charts-swatch ea-charts-swatch--out"></i>Egresos · abajo</span>' +
    '<span><i class="ea-charts-swatch ea-charts-swatch--net"></i>Balance del día</span>' +
    '</div>' +
    '<div class="ea-charts-bal-bars" data-ea-plot="bal-day">' +
    '<div class="ea-charts-bal-zero" style="top:50%"></div>' +
    barsHtml +
    guideDiv(sel, n) +
    hitCols('bal-day', n, function (i) { return 'Balance ' + (days[i] || ''); }) +
    '</div>' +
    '</div>';

  var cLo = Math.min.apply(null, cum.concat([0]));
  var cHi = Math.max.apply(null, cum.concat([0]));
  var cPad = (cHi - cLo) * 0.15 || 1;
  var cY = function (v) { return ((cHi + cPad - v) / (cHi - cLo + 2 * cPad)) * 100; };
  var pts = cum.map(function (v, i) { return xPct(i, n).toFixed(2) + ',' + cY(v).toFixed(2); });
  var areaPts = xPct(0, n).toFixed(2) + ',' + cY(0).toFixed(2) + ' ' + pts.join(' ') + ' ' + xPct(n - 1, n).toFixed(2) + ',' + cY(0).toFixed(2);
  var cumDots = cum
    .map(function (v, i) {
      return '<div class="ea-charts-dot' + (i === sel ? ' ea-charts-dot--sel' : '') + '" style="left:' + xPct(i, n).toFixed(2) + '%;top:' + cY(v).toFixed(2) + '%;background:' + chartColor('--ea-chart-io-balance') + '"></div>';
    })
    .join('');
  var cumPane =
    '<div class="ea-charts-row">' +
    '<div class="ea-charts-row-info"><span class="ea-charts-row-when">Suma de cada día desde el ingreso a sala. Arriba de 0 = retiene.</span></div>' +
    '<div class="ea-charts-bal-cum" data-ea-plot="bal-cum">' +
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<line x1="0" x2="100" y1="' + cY(0).toFixed(2) + '" y2="' + cY(0).toFixed(2) + '" stroke="var(--divider)" vector-effect="non-scaling-stroke"></line>' +
    '<polygon class="ea-charts-bal-cum-area" points="' + areaPts + '"></polygon>' +
    '<polyline class="ea-charts-bal-cum-line" vector-effect="non-scaling-stroke" points="' + pts.join(' ') + '"></polyline>' +
    '</svg>' +
    cumDots +
    guideDiv(sel, n) +
    hitCols('bal-cum', n, function (i) { return 'Acumulado ' + (days[i] || ''); }) +
    '</div>' +
    '</div>';

  return (
    cardsHtml +
    '<div class="ea-charts-group-label">Por día</div>' + barsPane +
    '<div class="ea-charts-group-label">Acumulado</div>' + cumPane +
    renderAxisRow(days, sel, false)
  );
}

/** Which tabs have enough data to show. */
function eaRowsTabsReady(histAsc) {
  return {
    vit: buildSharedVitalRows(histAsc).length >= 2,
    glu: buildGluSeries(histAsc, undefined, { forCharts: true }).values.length >= 2,
    bal: buildDailyBalanceSeries(histAsc).days.length >= 1,
  };
}

function segBtn(active, label, attrs) {
  return (
    '<button type="button" role="tab" class="wb-btn wb-btn-sm ea-charts-seg-btn' + (active ? ' ea-charts-seg-btn--active' : '') + '" ' +
    'aria-selected="' + (active ? 'true' : 'false') + '" ' + attrs + '>' + esc(label) + '</button>'
  );
}

/** Header slot for the tab/period pills (falls back to the top of the mount). */
function controlsEl(mountEl) {
  var modal = typeof mountEl.closest === 'function' ? mountEl.closest('.ea-charts-modal') : null;
  return modal ? modal.querySelector('#ea-charts-controls') : null;
}

function renderEaChartsControls(tab, range, ready) {
  return (
    '<div class="ea-charts-seg" role="tablist" aria-label="Tipo de gráfica">' +
    segBtn(tab === 'vit', 'Signos vitales', 'data-ea-tab="vit"' + (ready.vit ? '' : ' disabled')) +
    segBtn(tab === 'glu', 'Glucometrías', 'data-ea-tab="glu"' + (ready.glu ? '' : ' disabled')) +
    segBtn(tab === 'bal', 'Balance hídrico', 'data-ea-tab="bal"' + (ready.bal ? '' : ' disabled')) +
    '</div>' +
    '<div class="ea-charts-seg" role="tablist" aria-label="Periodo">' +
    segBtn(range === 'last5', 'Últimas 5', 'data-ea-range="last5"') +
    segBtn(range === 'all', 'Todas', 'data-ea-range="all"') +
    '</div>'
  );
}

function renderEaChartsPane(tab, histAsc, range, sel) {
  if (tab === 'bal') return renderBalPane(histAsc, range, sel);
  if (tab === 'glu') return renderGluPane(histAsc, range, sel);
  return renderVitPane(histAsc, range, sel);
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
    if (ctl) ctl.innerHTML = '';
    mountEl.innerHTML =
      '<div class="ea-charts-empty empty-state empty-state--compact" role="status">' +
      '<span class="empty-state-title">Sin datos para graficar</span>' +
      '<span class="empty-state-lead">Registra al menos 2 mediciones para ver gráficas.</span></div>';
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

  var body = renderEaChartsPane(tab, histAsc, range, sel);
  var controls = renderEaChartsControls(tab, range, ready);

  if (ctl) {
    ctl.innerHTML = controls;
    mountEl.innerHTML = body;
  } else {
    mountEl.innerHTML = '<div class="ea-charts-seg-row">' + controls + '</div>' + body;
  }
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
}
