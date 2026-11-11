/**
 * Tendencias list pane: toolbar, summary line, sections with their analyte rows, the empty notes and the
 * "Ocultos" chips. Preact: same DOM, classes and data-* hooks the string builders in tendencias-render.mjs
 * and tendencias-series.mjs made. They draw plain models (tendRowModel, tendSectionModel, ...); the data
 * rules, the sparkline charts, drag-sorting and the click handlers (one delegated listener on the container)
 * stay in the .mjs. Every draw unmounts first and wipes the host, so the DOM is rebuilt from scratch like
 * the old `innerHTML` swap (the spark module patches the status / change cells and mounts charts on that DOM).
 */
import { render } from 'preact';
import { Badge } from './tendencias-ui-detail-view.jsx';

const SEARCH_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
const EYE_OFF_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.5 7.5C3.9 9.3 2.5 12 2.5 12S6 18 12 18c1.4 0 2.7-.3 3.9-.8" />
  </svg>
);
const EYE_SHOW_ICON = (
  <svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EYE_HIDE_ICON = (
  <svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const CHEVRON_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const CHART_ICON = (
  <svg class="tend-section-chart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 17l6-6 4 4 8-10" />
    <path d="M3 12l5-4 4 3 9-7" />
  </svg>
);

function Seg({ kind, label, count, pressed }) {
  return (
    <button type="button" class={'tend-seg-btn' + (pressed ? ' is-active' : '')} data-tend-filter={kind} aria-pressed={pressed ? 'true' : 'false'}>
      {label} <span class="tend-seg-count">{String(count)}</span>
    </button>
  );
}

export function Toolbar({ m }) {
  return (
    <div class="tend-inline-controls tend-toolbar">
      <label class="tend-search">
        {SEARCH_ICON}
        <input type="search" class="tend-search-input" placeholder="Buscar analito" aria-label="Buscar analito" autocomplete="off" />
      </label>
      <div class="tend-seg" role="group" aria-label="Filtro de analitos">
        <Seg kind="all" label="Todos" count={m.total} pressed={!m.on} />
        <Seg kind="abn" label="Fuera de rango" count={m.oor} pressed={m.on} />
      </div>
      <span class="tend-head-spacer"></span>
      {m.hidden > 0 && (
        <button type="button" class="tend-pill tend-ocultos-trigger" title="Ocultos" aria-label={'Ocultos ' + m.hidden}>
          {EYE_OFF_ICON}
          <span class="tend-ocultos-label">Ocultos</span> <span class="tend-seg-count">{String(m.hidden)}</span>
        </button>
      )}
      {m.gaso && (
        <button type="button" class="tend-pill tend-gaso-ext-trigger" data-tend-action="gaso-extended">Gasometría extendida</button>
      )}
      <button type="button" class="tend-pill tend-pill--accent tend-dynamic-table-trigger" title="Combina analitos de distintos estudios en una sola tabla">Tablas dinámicas</button>
    </div>
  );
}

export function Summary({ m }) {
  return (
    <p class="tend-summary">
      {m.latestDay ? m.latestDay + ' · ' : ''}
      {m.oor ? <b class="tend-summary-oor">{m.oor + ' fuera de rango'}</b> : '0 fuera de rango'}
      {' de ' + m.total + ' · el cambio compara con ' + (m.prevDay ? 'el ' + m.prevDay : 'la toma anterior')}
    </p>
  );
}

/** "Cambio" cell: the % delta with its tone, or a dash. */
export function Change({ m }) {
  if (!m) return <span class="tend-none">—</span>;
  return (
    <div class="tend-insight">
      <span class={'tend-insight-delta tend-insight-delta--' + m.direction + ' tend-insight-delta--' + m.tone + (m.jump ? ' tend-insight-delta--jump' : '')}>{m.text}</span>
    </div>
  );
}

function Row({ r }) {
  return (
    <div class="tend-row" data-series-key={r.key} data-abnormal={r.abnormal ? '1' : '0'}>
      <input type="checkbox" class="tend-tick tend-row-tick" aria-label={'Agregar ' + r.title + ' a la tabla'} />
      <span class="tend-row-name">
        <span class="tend-param-name">
          {r.title}
          <button type="button" class="tend-row-open card-open-btn" aria-label={'Ver tendencia de ' + r.title}></button>
        </span>
        {r.unit && <span class="tend-unit">{r.unit}</span>}
      </span>
      <span class={'tend-param-value' + (r.abnormal ? ' tend-abnormal' : '')}>{String(r.latest != null ? r.latest : '—')}</span>
      <span class="tend-row-status"><Badge st={r.status} /></span>
      <span class="tend-row-range">{r.range}</span>
      <span class="tend-row-change"><Change m={r.change} /></span>
      <span class="tend-spark-wrap">
        <span class="tend-spark-canvas-cell">
          {r.sparkId ? <canvas id={r.sparkId}></canvas> : <span class="tend-spark-placeholder" aria-hidden="true"></span>}
        </span>
      </span>
      <button type="button" class="tend-row-hide-btn" title="Ocultar analito" aria-label={'Ocultar ' + r.title}>{EYE_HIDE_ICON}</button>
    </div>
  );
}

const Cols = () => (
  <div class="tend-cols" aria-hidden="true">
    <span>Analito</span><span>Último</span><span>Estado</span><span>Rango</span><span>Cambio</span><span>Últimos 5 días</span><span></span>
  </div>
);

export function Section({ s }) {
  return (
    <section class="tend-section" data-section={s.key}>
      <div class="tend-section-head">
        <button type="button" class="tend-section-toggle" aria-expanded={s.expanded ? 'true' : 'false'} aria-label={(s.expanded ? 'Contraer ' : 'Expandir ') + s.label}>
          <span class="tend-section-chevron" aria-hidden="true">{CHEVRON_ICON}</span>
          <span class="tend-section-title">{s.label}</span>
        </button>
        {s.oor ? <span class="tend-oor-pill">{s.oor + ' fuera de rango'}</span> : <span class="tend-section-count">{s.rows.length + (s.rows.length === 1 ? ' analito' : ' analitos')}</span>}
        <span class="tend-head-spacer"></span>
        {s.rows.length > 0 && (
          <button type="button" class="tend-section-chart-btn" title="Abrir gráfica y tabla del estudio" aria-label={'Gráfica de ' + s.label}>
            {CHART_ICON}
            <span class="tend-section-chart-label">Gráfica</span>
          </button>
        )}
      </div>
      <div class={'tend-section-body' + (s.expanded ? '' : ' tend-section-body--collapsed')}>
        <Cols />
        <div class="tend-rows tend-sort-zone" data-section-key={s.key}>
          {s.rows.map((r) => <Row r={r} />)}
        </div>
      </div>
    </section>
  );
}

const NOTES = {
  abnormal: <>Ningún analito está fuera de rango de referencia (o no tiene referencia en el reporte). Pulsa <strong>Todos</strong> para volver a la vista completa.</>,
  hidden: <>Los analitos con datos están <strong>ocultos</strong>. Pulsa <strong>Ocultos</strong> y restaura con el ojo o <strong>Mostrar todos</strong>.</>,
  nodata: <>No hay parámetros con suficientes datos para graficar.</>,
};

/** The "tend-empty" paragraph: a canned note by kind, or a plain message. */
export function EmptyNote({ kind, text }) {
  return <p class="tend-empty">{kind ? NOTES[kind] : text}</p>;
}

export function Grid({ toolbar, summary, sections }) {
  return (
    <>
      <Toolbar m={toolbar} />
      <Summary m={summary} />
      {sections.map((s) => <Section s={s} />)}
      <p class="tend-empty tend-search-empty" hidden>Ningún analito coincide con la búsqueda.</p>
    </>
  );
}

export function HiddenChips({ chips }) {
  if (!chips.length) return <p style="margin:0;font-size:13px;color:var(--text-muted);">No hay analitos ocultos.</p>;
  return (
    <>
      {chips.map((c) => (
        <button type="button" class="tend-hidden-chip" data-series-key={c.key} title={'Volver a mostrar ' + c.label} aria-label={'Mostrar de nuevo ' + c.label}>
          <span class="tend-hidden-chip-label">{c.label}</span>
          <span class="tend-hidden-chip-eye" aria-hidden="true">{EYE_SHOW_ICON}</span>
        </button>
      ))}
    </>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export function drawTendGrid(host, model) {
  draw(host, <Grid {...model} />);
}

/** Toolbar (when given) above a canned note (`kind`) or a plain message (`text`). */
export function drawTendNote(host, toolbar, note) {
  draw(host, <>{toolbar && <Toolbar m={toolbar} />}<EmptyNote {...note} /></>);
}

export function drawTendHiddenChips(host, chips) {
  draw(host, <HiddenChips chips={chips} />);
}
