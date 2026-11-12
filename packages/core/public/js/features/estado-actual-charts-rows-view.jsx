/**
 * Gráficas de monitoreo (Estado actual): one row per sign, plain SVG/DOM, no Chart.js. Preact: same
 * DOM, classes and data-ea-* hooks the string builders in estado-actual-charts-rows.mjs made. The
 * rows file keeps the state (tab/range/crosshair) and the delegated events and lazy-loads this file.
 */
import { render } from 'preact';
import { GLU_RANGE, RANGES } from './estado-actual-ranges.mjs';
import {
  buildSharedVitalRows,
  buildAlignedVitalSeries,
  buildEaAxisTicks,
  buildDailyBalanceSeries,
  buildGluSeries,
  formatChartLabel,
  chartColor,
} from './estado-actual-charts-series.mjs';

const VIT_ROWS = [
  { id: 'ta', group: 'Hemodinámico', label: 'T/A · mmHg', keys: ['tas', 'tad'], colors: ['--ea-chart-vital-1', '--ea-chart-vital-2'] },
  { id: 'fc', group: 'Hemodinámico', label: 'FC · lpm', keys: ['fc'], colors: ['--ea-chart-sign'] },
  { id: 'fr', group: 'Respiratorio', label: 'FR · rpm', keys: ['fr'], colors: ['--ea-chart-sign'] },
  { id: 'sat', group: 'Respiratorio', label: 'SpO₂ · %', keys: ['sat'], colors: ['--ea-chart-sign'] },
  { id: 'temp', group: 'Metabólico', label: 'Temp · °C', keys: ['temp'], colors: ['--ea-chart-sign'] },
];

function xPct(i, n) {
  return n <= 1 ? 50 : ((i + 0.5) / n) * 100;
}

function fmtNum(v) {
  return v == null ? '–' : Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function fmtSigned(v) {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return sign + Math.abs(v).toLocaleString('es-MX');
}

function sliceRange(arr, range) {
  if (range === 'all' || arr.length <= 5) return arr;
  return arr.slice(arr.length - 5);
}

function HitCols({ plot, n, ariaFor }) {
  const w = n ? 100 / n : 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(
      <button
        type="button"
        class="ea-charts-hit"
        data-ea-hit={i}
        data-ea-hit-plot={plot}
        aria-label={ariaFor(i)}
        style={'left:' + (xPct(i, n) - w / 2).toFixed(2) + '%;width:' + w.toFixed(2) + '%'}
      ></button>
    );
  }
  return <>{out}</>;
}

function Guide({ sel, n }) {
  return <div class="ea-charts-guide" hidden={sel == null} style={'left:' + xPct(sel == null ? 0 : sel, n).toFixed(2) + '%'}></div>;
}

/** One sign: info column (value at the crosshair or «Último», out-of-range count) + plot. */
function SignRow({ rowDef, series, labels, sel }) {
  const n = labels.length;
  const bandMin = Math.min.apply(null, series.map((s) => s.bandMin));
  const bandMax = Math.max.apply(null, series.map((s) => s.bandMax));
  const vals = [].concat.apply([], series.map((s) => s.values)).filter((v) => v != null);
  let lo = Math.min.apply(null, vals.concat([bandMin]));
  let hi = Math.max.apply(null, vals.concat([bandMax]));
  const pad = (hi - lo) * 0.15 || 1;
  lo -= pad;
  hi += pad;
  const y = (v) => Math.max(2, Math.min(98, ((hi - v) / (hi - lo)) * 100));

  const at = sel == null ? n - 1 : sel;
  const big = series.map((s) => fmtNum(s.values[at])).join(' / ');
  const nOut = series.reduce((a, s) => a + s.altered.filter(Boolean).length, 0);
  const when = (sel == null ? 'Último · ' : '') + (labels[at] || '');
  const badge = nOut ? nOut + (nOut === 1 ? ' toma fuera de rango' : ' tomas fuera de rango') : 'En rango';

  const lines = [];
  const dots = [];
  series.forEach((s) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      if (s.values[i] == null) continue;
      pts.push(xPct(i, n).toFixed(2) + ',' + y(s.values[i]).toFixed(2));
      dots.push(
        <div
          class={'ea-charts-dot' + (s.altered[i] ? ' ea-charts-dot--out' : '') + (i === sel ? ' ea-charts-dot--sel' : '')}
          style={'left:' + xPct(i, n).toFixed(2) + '%;top:' + y(s.values[i]).toFixed(2) + '%;background:' + s.color}
        ></div>
      );
    }
    if (pts.length) {
      lines.push(<polyline fill="none" stroke={s.color} stroke-width="2" vector-effect="non-scaling-stroke" points={pts.join(' ')}></polyline>);
    }
  });

  return (
    <div class="ea-charts-row">
      <div class="ea-charts-row-info">
        <span class="ea-charts-row-label">{rowDef.label}</span>
        <span class="ea-charts-row-big" aria-live="polite">{big}</span>
        <span class="ea-charts-row-when">{when}</span>
        <span class={'ea-charts-row-badge' + (nOut ? ' ea-charts-row-badge--out' : '')}>{badge}</span>
      </div>
      <div class="ea-charts-row-plot" data-ea-plot={rowDef.id}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect class="ea-charts-band" x="0" y={y(bandMax).toFixed(2)} width="100" height={Math.max(0, y(bandMin) - y(bandMax)).toFixed(2)}></rect>
          {lines}
        </svg>
        {dots}
        <Guide sel={sel} n={n} />
        <HitCols plot={rowDef.id} n={n} ariaFor={(i) => rowDef.label + ', ' + (labels[i] || '')} />
      </div>
    </div>
  );
}

/** X axis: day written once, hour only on days with more than one reading. */
function AxisRow({ labels, sel, withKey }) {
  const n = labels.length;
  return (
    <div class="ea-charts-axis-row">
      <div class="ea-charts-legend-key">
        {withKey ? (
          <>
            <span class="ea-charts-dot ea-charts-dot--out" style={'background:' + chartColor('--ea-chart-sign')}></span>fuera de rango
          </>
        ) : null}
      </div>
      <div class="ea-charts-axis-plot" data-ea-plot="axis">
        {buildEaAxisTicks(labels).map((t, i) => (
          <div class="ea-charts-axis-tick" style={'left:' + xPct(i, n).toFixed(2) + '%'}>
            <span>{t.hour}</span>
            <strong>{t.day}</strong>
          </div>
        ))}
        <Guide sel={sel} n={n} />
      </div>
    </div>
  );
}

function VitPane({ histAsc, range, sel }) {
  const rows = sliceRange(buildSharedVitalRows(histAsc), range);
  const labels = rows.map((r) => formatChartLabel(r.recordedAt));
  const out = [];
  let lastGroup = null;
  VIT_ROWS.forEach((rowDef) => {
    if (rowDef.group !== lastGroup) {
      out.push(<div class="ea-charts-group-label">{rowDef.group}</div>);
      lastGroup = rowDef.group;
    }
    const series = rowDef.keys.map((key, idx) => {
      const s = buildAlignedVitalSeries(rows, key);
      const band = RANGES[key];
      return {
        values: s.values,
        altered: s.altered,
        bandMin: band.min,
        bandMax: band.max === Infinity ? 100 : band.max,
        color: chartColor(rowDef.colors[idx]),
      };
    });
    out.push(<SignRow rowDef={rowDef} series={series} labels={labels} sel={sel} />);
  });
  return (
    <>
      {out}
      <AxisRow labels={labels} sel={sel} withKey={true} />
    </>
  );
}

function GluPane({ histAsc, range, sel }) {
  const g = buildGluSeries(histAsc, undefined, { forCharts: true });
  const labels = sliceRange(g.labels, range);
  const series = [
    {
      values: sliceRange(g.values, range),
      altered: sliceRange(g.alteredFlags, range),
      bandMin: GLU_RANGE.min,
      bandMax: GLU_RANGE.max,
      color: chartColor('--ea-chart-sign'),
    },
  ];
  return (
    <>
      <div class="ea-charts-group-label">Glucometrías</div>
      <SignRow rowDef={{ id: 'glu', label: 'Glucosa capilar · mg/dL' }} series={series} labels={labels} sel={sel} />
      <AxisRow labels={labels} sel={sel} withKey={true} />
    </>
  );
}

function BalCard({ label, sub, children }) {
  return (
    <div class="ea-charts-bal-card">
      <span class="ea-charts-bal-card-label">{label}</span>
      <span class="ea-charts-bal-card-value">{children}</span>
      <span class="ea-charts-bal-card-sub">{sub}</span>
    </div>
  );
}

function BalPane({ histAsc, range, sel }) {
  const d = buildDailyBalanceSeries(histAsc);
  const days = sliceRange(d.days, range);
  const offset = d.days.length - days.length;
  const ing = d.ing.slice(offset);
  const egr = d.egr.slice(offset);
  const net = d.net.slice(offset);
  const cum = d.cumulative.slice(offset);
  const n = days.length;
  const at = sel == null ? n - 1 : sel;

  const maxAbs = Math.max.apply(null, ing.concat(egr).concat([1]));
  const bw = Math.min(14, (100 / n) * 0.4);
  const bars = [];
  for (let i = 0; i < n; i++) {
    const x = xPct(i, n);
    const inH = (ing[i] / maxAbs) * 45;
    const outH = (egr[i] / maxAbs) * 45;
    const netY = 50 - (net[i] / maxAbs) * 45;
    bars.push(
      <div class="ea-charts-bal-bar ea-charts-bal-bar--in" style={'left:' + (x - bw / 2).toFixed(2) + '%;width:' + bw.toFixed(2) + '%;top:' + (50 - inH).toFixed(2) + '%;height:' + inH.toFixed(2) + '%'}></div>,
      <div class="ea-charts-bal-bar ea-charts-bal-bar--out" style={'left:' + (x - bw / 2).toFixed(2) + '%;width:' + bw.toFixed(2) + '%;top:50%;height:' + outH.toFixed(2) + '%'}></div>,
      <div class="ea-charts-bal-net" style={'left:' + (x - bw / 2 - 1).toFixed(2) + '%;width:' + (bw + 2).toFixed(2) + '%;top:' + netY.toFixed(2) + '%'}></div>,
      <div class={'ea-charts-bal-net-lbl' + (i === sel ? ' ea-charts-bal-net-lbl--sel' : '')} style={'left:' + (x + bw / 2 + 1.5).toFixed(2) + '%;top:' + netY.toFixed(2) + '%'}>{fmtSigned(net[i])}</div>
    );
  }

  const cLo = Math.min.apply(null, cum.concat([0]));
  const cHi = Math.max.apply(null, cum.concat([0]));
  const cPad = (cHi - cLo) * 0.15 || 1;
  const cY = (v) => ((cHi + cPad - v) / (cHi - cLo + 2 * cPad)) * 100;
  const pts = cum.map((v, i) => xPct(i, n).toFixed(2) + ',' + cY(v).toFixed(2));
  const areaPts = xPct(0, n).toFixed(2) + ',' + cY(0).toFixed(2) + ' ' + pts.join(' ') + ' ' + xPct(n - 1, n).toFixed(2) + ',' + cY(0).toFixed(2);

  return (
    <>
      <div class="ea-charts-bal-cards">
        <BalCard label="Acumulado desde ingreso" sub={sel == null ? 'Al ' + days[at] + ' · desde el ' + d.days[0] : 'Al ' + days[at]}>
          {fmtSigned(cum[at])} <small>mL</small>
        </BalCard>
        <BalCard label="Balance del día" sub={(sel == null ? 'Último día · ' : '') + days[at]}>
          {fmtSigned(net[at])} <small>mL</small>
        </BalCard>
        <BalCard label="Ingresos / egresos del día" sub="mL">
          <span class="ing">{ing[at].toLocaleString('es-MX')}</span> / <span class="egr">{egr[at].toLocaleString('es-MX')}</span>
        </BalCard>
      </div>
      <div class="ea-charts-group-label">Por día</div>
      <div class="ea-charts-row">
        <div class="ea-charts-row-info ea-charts-bal-legend">
          <span><i class="ea-charts-swatch ea-charts-swatch--in"></i>Ingresos · arriba</span>
          <span><i class="ea-charts-swatch ea-charts-swatch--out"></i>Egresos · abajo</span>
          <span><i class="ea-charts-swatch ea-charts-swatch--net"></i>Balance del día</span>
        </div>
        <div class="ea-charts-bal-bars" data-ea-plot="bal-day">
          <div class="ea-charts-bal-zero" style="top:50%"></div>
          {bars}
          <Guide sel={sel} n={n} />
          <HitCols plot="bal-day" n={n} ariaFor={(i) => 'Balance ' + (days[i] || '')} />
        </div>
      </div>
      <div class="ea-charts-group-label">Acumulado</div>
      <div class="ea-charts-row">
        <div class="ea-charts-row-info"><span class="ea-charts-row-when">Suma de cada día desde el ingreso a sala. Arriba de 0 = retiene.</span></div>
        <div class="ea-charts-bal-cum" data-ea-plot="bal-cum">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" x2="100" y1={cY(0).toFixed(2)} y2={cY(0).toFixed(2)} stroke="var(--divider)" vector-effect="non-scaling-stroke"></line>
            <polygon class="ea-charts-bal-cum-area" points={areaPts}></polygon>
            <polyline class="ea-charts-bal-cum-line" vector-effect="non-scaling-stroke" points={pts.join(' ')}></polyline>
          </svg>
          {cum.map((v, i) => (
            <div
              class={'ea-charts-dot' + (i === sel ? ' ea-charts-dot--sel' : '')}
              style={'left:' + xPct(i, n).toFixed(2) + '%;top:' + cY(v).toFixed(2) + '%;background:' + chartColor('--ea-chart-io-balance')}
            ></div>
          ))}
          <Guide sel={sel} n={n} />
          <HitCols plot="bal-cum" n={n} ariaFor={(i) => 'Acumulado ' + (days[i] || '')} />
        </div>
      </div>
      <AxisRow labels={days} sel={sel} withKey={false} />
    </>
  );
}

export function EaChartsPane({ tab, histAsc, range, sel }) {
  if (tab === 'bal') return <BalPane histAsc={histAsc} range={range} sel={sel} />;
  if (tab === 'glu') return <GluPane histAsc={histAsc} range={range} sel={sel} />;
  return <VitPane histAsc={histAsc} range={range} sel={sel} />;
}

function SegBtn({ active, label, ...attrs }) {
  return (
    <button type="button" role="tab" class={'wb-btn wb-btn-sm ea-charts-seg-btn' + (active ? ' ea-charts-seg-btn--active' : '')} aria-selected={active ? 'true' : 'false'} {...attrs}>
      {label}
    </button>
  );
}

/** Tab / period pills. `ready` = which tabs have enough data. */
export function EaChartsControls({ tab, range, ready }) {
  return (
    <>
      <div class="ea-charts-seg" role="tablist" aria-label="Tipo de gráfica">
        <SegBtn active={tab === 'vit'} label="Signos vitales" data-ea-tab="vit" disabled={!ready.vit} />
        <SegBtn active={tab === 'glu'} label="Glucometrías" data-ea-tab="glu" disabled={!ready.glu} />
        <SegBtn active={tab === 'bal'} label="Balance hídrico" data-ea-tab="bal" disabled={!ready.bal} />
      </div>
      <div class="ea-charts-seg" role="tablist" aria-label="Periodo">
        <SegBtn active={range === 'last5'} label="Últimas 5" data-ea-range="last5" />
        <SegBtn active={range === 'all'} label="Todas" data-ea-range="all" />
      </div>
    </>
  );
}

export function EaChartsEmpty() {
  return (
    <div class="ea-charts-empty empty-state empty-state--compact" role="status">
      <span class="empty-state-title">Sin datos para graficar</span>
      <span class="empty-state-lead">Registra al menos 2 mediciones para ver gráficas.</span>
    </div>
  );
}

/** Whole mount when there is no header slot: pills on top of the pane. */
export function EaChartsInline({ tab, histAsc, range, sel, ready }) {
  return (
    <>
      <div class="ea-charts-seg-row">
        <EaChartsControls tab={tab} range={range} ready={ready} />
      </div>
      <EaChartsPane tab={tab} histAsc={histAsc} range={range} sel={sel} />
    </>
  );
}

/**
 * Paint (or clear, `props` null) the charts. `empty` → placeholder; otherwise pane (+ pills in the
 * header slot `ctl` when there is one, else inline above the pane).
 */
export function drawEaCharts(mountEl, ctl, props) {
  if (!props) {
    render(null, mountEl);
    if (ctl) render(null, ctl);
    return;
  }
  if (props.empty) {
    if (ctl) render(null, ctl);
    render(<EaChartsEmpty />, mountEl);
    return;
  }
  if (ctl) {
    render(<EaChartsControls tab={props.tab} range={props.range} ready={props.ready} />, ctl);
    render(<EaChartsPane tab={props.tab} histAsc={props.histAsc} range={props.range} sel={props.sel} />, mountEl);
  } else {
    render(<EaChartsInline {...props} />, mountEl);
  }
}
