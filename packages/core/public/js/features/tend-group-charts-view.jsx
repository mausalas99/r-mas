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
