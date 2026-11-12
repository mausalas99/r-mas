/**
 * Tendencias group charts, the DOM parts around the Chart.js canvas: hidden-panels bar, "Escala" row
 * and each legend row (checkbox, colour, name, sparkline, change). Preact: same DOM and classes the
 * string code in tend-group-charts-render.mjs made. They draw plain models; the data rules, Chart.js,
 * Sortable and every click / change handler stay in the .mjs (it wires them on this DOM after the draw).
 * Every draw unmounts first, so the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

export function PanelsHiddenBar({ chips }) {
  return (
    <>
      <span class="tend-group-hidden-label">Paneles ocultos:</span>
      {chips.map((c) => (
        <button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-panel={c.fam}>
          {c.title} <span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" class="tend-toolbar-btn tend-group-show-all-btn tend-group-panels-show-all">Mostrar todo</button>
    </>
  );
}

export function ScaleRow({ rel }) {
  return (
    <>
      <span class="tend-group-scale-label">Escala</span>
      <div class="tend-seg tend-group-scale-seg" role="group" aria-label="Escala">
        <button type="button" class={'tend-seg-btn' + (rel ? '' : ' is-active')} data-scale="values" aria-pressed={rel ? 'false' : 'true'}>Valores</button>
        <button type="button" class={'tend-seg-btn' + (rel ? ' is-active' : '')} data-scale="relative" aria-pressed={rel ? 'true' : 'false'}>Relativa al rango</button>
      </div>
      {rel && <span class="tend-group-scale-hint">0 % = límite bajo · 100 % = límite alto · umbrales ocultos</span>}
    </>
  );
}

/** Polyline `points` for the 56x20 legend sparkline, or '' when fewer than 2 values. */
export function sparkPoints(data) {
  const pts = [];
  data.forEach((v, i) => {
    if (v != null) pts.push([i, v]);
  });
  if (pts.length < 2) return '';
  const vs = pts.map((p) => p[1]);
  const mn = Math.min(...vs);
  const span = Math.max(...vs) - mn || 1;
  const n = Math.max(data.length - 1, 1);
  return pts.map((p) => (2 + (p[0] * 52) / n).toFixed(1) + ',' + (17 - ((p[1] - mn) / span) * 14).toFixed(1)).join(' ');
}

/** Last change vs first value, e.g. "+12%". Empty when it cannot be computed. */
export function changeText(raw) {
  const vals = raw.filter((v) => v != null);
  if (vals.length < 2 || !vals[0]) return '';
  const pc = Math.round((vals[vals.length - 1] / vals[0] - 1) * 100);
  return (pc > 0 ? '+' : '') + pc + '%';
}

/** Model for one legend row: `data` = plotted values, `raw` = measured values. */
export function legendItemModel(fk, checked, color, label, data, raw) {
  return { fk, checked, color, label, points: sparkPoints(data), change: changeText(raw) };
}

function Spark({ points, color }) {
  if (!points) return <svg class="tend-legend-spark" width="56" height="20" aria-hidden="true"></svg>;
  return (
    <svg class="tend-legend-spark" width="56" height="20" viewBox="0 0 56 20" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  );
}

/** One legend row: `m` = { fk, checked, color, label, points, change }. */
export function LegendItem({ m }) {
  return (
    <>
      <input type="checkbox" class="tend-group-legend-check" data-field={m.fk} checked={m.checked} />{' '}
      <input type="color" class="tend-group-legend-color" data-field={m.fk} value={m.color} />{' '}
      <span class="tend-legend-name">{m.label}</span>
      <Spark points={m.points} color={m.color} />
      <span class="tend-legend-pc">{m.change}</span>
      <span class="tend-group-legend-drag-hint" aria-hidden="true" title="Arrastrar para reordenar">⋮⋮</span>
    </>
  );
}

const ICON = { width: '15', height: '15', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };

/** The three icon buttons inside a chart panel's toolbar (the .mjs wires their clicks after the draw). */
export function PanelToolbarButtons() {
  return (
    <div class="patient-card-toolbar-left">
      <button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-copy-svg" title="Copiar gráfica" aria-label="Copiar gráfica como imagen">
        <svg {...ICON}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 17V9M12 17V5M16 17v-4" /></svg>
      </button>
      <button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-eye" title="Ocultar panel" aria-label="Ocultar panel">
        <svg class="tend-eye-svg" {...ICON} width="17" height="17"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
      <button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-events-toggle" title="Ocultar eventos" aria-label="Ocultar eventos" aria-pressed="false">
        <svg {...ICON}><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
      </button>
    </div>
  );
}

/** Red note that replaces a chart whose Chart.js build threw. */
export function ChartError() {
  return <p class="tend-empty" style="margin:12px 0;font-size:13px;color:var(--error);">No se pudo dibujar este panel.</p>;
}

/** Note shown in the charts panel when the whole charts render threw. */
export function ChartsLoadError() {
  return <p class="tend-empty">No se pudieron cargar las gráficas. Recarga la app e intenta de nuevo.</p>;
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

/** Draw the hidden-panels bar content; no chips clears it. */
export function drawPanelsHiddenBar(bar, chips) {
  draw(bar, chips.length ? <PanelsHiddenBar chips={chips} /> : null);
}

export function drawScaleRow(row, rel) {
  draw(row, <ScaleRow rel={rel} />);
}

export function drawLegendItem(item, m) {
  draw(item, <LegendItem m={m} />);
}

export function drawPanelToolbar(toolbar) {
  draw(toolbar, <PanelToolbarButtons />);
}

/** Replaces whatever the wrap holds (canvas included) with the error note. */
export function drawChartError(wrap) {
  draw(wrap, <ChartError />);
}

export function drawChartsLoadError(panel) {
  draw(panel, <ChartsLoadError />);
}
