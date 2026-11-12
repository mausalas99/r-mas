/**
 * Perfil farmacoterapéutico drawn with Preact: the grouped med list, its two empty states and the
 * SOME matrix (calendar) grid. Same DOM, classes and data-* hooks the string / createElement code
 * in med-pharm-profile-render-helpers.mjs and med-pharm-profile-grid.mjs made. These components
 * draw plain models (built next to the data rules); the hover panel wiring, the hide / unhide
 * click hooks on `document` and the modals stay in the .mjs files. Every draw unmounts first, so
 * the DOM is rebuilt from scratch like the old `innerHTML = ''` swap.
 */
import { render } from 'preact';

function AdhTrigger({ adh }) {
  if (adh.empty) {
    return <span class="med-pharm-adh-trigger med-pharm-adh-trigger--empty">—</span>;
  }
  const key = { [adh.keyAttr]: adh.keyValue };
  const p = adh.panel;
  return (
    <span class="med-pharm-adh-wrap">
      <button
        type="button"
        class={'med-pharm-adh-trigger' + (adh.miss ? ' med-pharm-adh-trigger--miss' : '')}
        {...key}
        aria-haspopup="dialog"
      >{adh.label}</button>
      <div class="med-pharm-adh-panel" role="dialog" aria-hidden="true">
        {p.regimens !== '' && <p class="med-pharm-adh-panel-regimens">{p.regimens}</p>}
        <p class="med-pharm-adh-panel-head">{p.head}</p>
        <div class="med-pharm-adh-panel-section">
          <span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--ok">Administrados (por defecto)</span>
          <p class="med-pharm-adh-panel-days">{p.ok}</p>
        </div>
        <div class="med-pharm-adh-panel-section">
          <span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--miss">No administrados</span>
          <p class="med-pharm-adh-panel-days">{p.missed}</p>
        </div>
        <p class="med-pharm-adh-panel-foot">{p.foot}</p>
      </div>
    </span>
  );
}

function SummaryRow({ r, onDays }) {
  const vis = r.hidden
    ? { 'data-med-pharm-unhide-group': r.rowKeys }
    : { 'data-med-pharm-hide-group': r.rowKeys };
  return (
    <div class={'med-pharm-row' + (r.hidden ? ' med-pharm-row--hidden' : '')}>
      <div class={'med-pharm-row-summary' + (r.hasMisses ? ' has-misses' : '')} title={r.tooltip}>
        <div class="med-pharm-main med-pharm-main--compact">
          <div class="med-pharm-name-row">
            <div class="med-pharm-name" title={r.name}>{r.name}</div>
            {r.regimens > 0 && (
              <span class="med-pharm-regimen-badge" title={r.regimens + ' regímenes — ver en Días'}>{r.regimens + ' tomas'}</span>
            )}
          </div>
        </div>
        <span class="med-pharm-cat-badge">{r.cat}</span>
        <div class="med-cell-adh"><AdhTrigger adh={r.adh} /></div>
        <span class="med-pharm-freq-cell" title={r.freq}>{r.freq}</span>
        <span class="med-pharm-via-cell" title={r.viaTitle}>{r.via}</span>
        <div class="med-pharm-row-actions">
          <button
            type="button"
            class="med-pharm-btn-dias"
            title={r.regimens > 0
              ? 'Ver calendario con todas las dosis de este medicamento'
              : 'Ver calendario del medicamento'}
            onClick={(e) => {
              e.stopPropagation();
              onDays(r.medGroupKey);
            }}
          >Días</button>
          {r.hidden ? (
            <button
              type="button"
              class="med-pharm-btn-visibility"
              aria-label="Mostrar en la lista"
              title="Volver a mostrar en la lista y calendario"
              {...vis}
            >↩</button>
          ) : (
            <button
              type="button"
              class="med-pharm-btn-visibility med-pharm-btn-visibility--icon"
              aria-label="Ocultar de la lista"
              title="Ocultar de la vista (se conserva en el mes importado)"
              {...vis}
            >×</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MedPharmSummaryList({ rows, onDays }) {
  return <>{rows.map((r) => <SummaryRow r={r} onDays={onDays} />)}</>;
}

export function MedPharmEmptyColumns({ label, onImport }) {
  return (
    <div class="med-pharm-empty">
      <p class="med-pharm-empty-title">{'Sin datos para ' + label}</p>
      <p class="med-pharm-empty-lead">Importa la matriz SOME del hospital o procesa <strong>Receta</strong> en la pestaña Manejo actual.</p>
      <button type="button" class="wb-btn wb-btn-primary wb-btn-lg" data-med-pharm-open-paste="" onClick={onImport}>Importar mes SOME</button>
    </div>
  );
}

export function MedPharmEmptyFilter({ hiddenCount }) {
  return (
    <div class="med-pharm-empty med-pharm-empty--filter">
      <p class="med-pharm-empty-title">Ningún medicamento visible</p>
      <p class="med-pharm-empty-lead">
        {hiddenCount > 0 ? (
          <>{'Hay ' + hiddenCount + ' oculto(s) con este filtro. Activa '}<strong>Mostrar ocultos</strong>{' para verlos o restaurarlos.'}</>
        ) : 'Prueba otro filtro de categoría.'}
      </p>
    </div>
  );
}

function DayHeader({ c }) {
  return (
    <th class={c.cls}>
      {c.label !== '' && <span class="day-hdr-month-label">{c.label}</span>}
      {c.day}
    </th>
  );
}

function DayCell({ c }) {
  return (
    <td class={c.cls} {...c.attrs}>
      {c.x2 && <span class="x2">×2</span>}
    </td>
  );
}

function Pads({ count, tag }) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(tag === 'th'
      ? <th class="day-hdr day-hdr-empty">{' '}</th>
      : <td class="day-pad day-pad-empty"></td>);
  }
  return <>{out}</>;
}

export function SomeGrid({ model, onDayClick }) {
  const onClick = (e) => {
    const cell = e.target.closest && e.target.closest('td.day-pad.indicated[data-row-key]');
    if (!cell || !e.currentTarget.contains(cell)) return;
    e.preventDefault();
    e.stopPropagation();
    onDayClick(
      cell.dataset.rowKey,
      parseInt(cell.dataset.year, 10),
      parseInt(cell.dataset.month, 10),
      parseInt(cell.dataset.day, 10)
    );
  };
  const dayCols = [];
  for (let i = 0; i < model.splitAt; i += 1) dayCols.push(<col class="col-day" />);
  return (
    <div class="med-pharm-grid-scope some-grid-wrap med-pharm-scroll" onClick={onClick}>
      <table class="some-grid-unified">
        <colgroup>
          <col class="col-med" />
          <col class="col-dosis" />
          <col class="col-freq" />
          <col class="col-via" />
          {dayCols}
        </colgroup>
        <thead>
          <tr class="hdr-row-1">
            <th class="col-meta-hdr col-med" rowspan="2">Medicamento</th>
            <th class="col-meta-hdr col-dosis" rowspan="2">Dosis</th>
            <th class="col-meta-hdr col-freq" rowspan="2">Freq</th>
            <th class="col-meta-hdr col-via" rowspan="2">Vía</th>
            {model.hdr1.cells.map((c) => <DayHeader c={c} />)}
            <Pads tag="th" count={model.hdr1.pad} />
          </tr>
          <tr class="hdr-row-2">
            {model.hdr2.cells.map((c) => <DayHeader c={c} />)}
            <Pads tag="th" count={model.hdr2.pad} />
          </tr>
        </thead>
        <tbody>
          {model.rows.map((r) => [
            <tr class={r.cls1}>
              <td rowspan="2" class="col-med">
                <div class="med-cell-name">{r.med}</div>
                <div class="med-cell-adh"><AdhTrigger adh={r.adh} /></div>
              </td>
              <td rowspan="2" class="col-dosis">{r.dosis}</td>
              <td rowspan="2" class="col-freq">{r.freq}</td>
              <td rowspan="2" class="col-via">{r.via}</td>
              {r.cells1.map((c) => <DayCell c={c} />)}
              <Pads tag="td" count={r.pad1} />
            </tr>,
            <tr class={r.cls2}>
              {r.cells2.map((c) => <DayCell c={c} />)}
              <Pads tag="td" count={r.pad2} />
            </tr>,
          ])}
        </tbody>
      </table>
    </div>
  );
}

/** Empty `host` of anything drawn before (Preact tree and leftover nodes). */
export function clearMedPharmHost(host) {
  render(null, host);
  host.textContent = '';
}

export function drawMedPharmSummaryList(host, props) {
  clearMedPharmHost(host);
  render(<MedPharmSummaryList {...props} />, host);
}

export function drawMedPharmEmptyColumns(host, props) {
  clearMedPharmHost(host);
  render(<MedPharmEmptyColumns {...props} />, host);
}

export function drawMedPharmEmptyFilter(host, props) {
  clearMedPharmHost(host);
  render(<MedPharmEmptyFilter {...props} />, host);
}

export function drawSomeGrid(host, props) {
  clearMedPharmHost(host);
  render(<SomeGrid {...props} />, host);
}
