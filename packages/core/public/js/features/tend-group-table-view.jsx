/**
 * Tendencias group / pivot table: day-mode toggle, analyte table + legend, and the "ocultos en la
 * copia" bar. Preact: same DOM, ids, classes and data-* hooks the string builders in
 * tend-group-table-render.mjs made. They draw a plain model (buildGroupTableViewModel); the data
 * rules and the click / change handlers stay in the .mjs.
 *
 * The table wrap also holds nodes other code owns (the hidden bar the .mjs puts first, the analyte
 * picker inside its slot), and tend-group-modal clears the wrap with `innerHTML = ''`. So the table
 * is diffed in place (scroll and open pickers survive an identical redraw) unless its nodes are gone,
 * then the wrap is wiped and drawn again. The bar and day slot are drawn from scratch every time.
 */
import { render } from 'preact';

const EYE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EYE_OFF = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.5 7.5C3.9 9.3 2.5 12 2.5 12S6 18 12 18c1.4 0 2.7-.3 3.9-.8" />
  </svg>
);

/** Eye toggle: pressed = hidden in the copy. `hook` is the data-* attribute the feature hints look for. */
function EyeToggle({ hook, itemKey, hidden, what, label, onClick }) {
  const verb = hidden ? 'Mostrar ' : 'Ocultar ';
  const hookProps = { [hook]: itemKey };
  return (
    <button type="button" class="tend-eye-toggle" {...hookProps} aria-pressed={hidden ? 'true' : 'false'} aria-label={verb + what + ' ' + label} title={verb + what} onClick={onClick}>
      {hidden ? EYE_OFF : EYE}
    </button>
  );
}

const cls = (hidden, last) => (hidden ? 'is-hidden' : '') + (last ? ' is-last' : '');

function Head({ cols, onToggleCol }) {
  return (
    <thead>
      <tr>
        <th>Analito</th>
        <th class="tend-tbl-ref-h">Referencia</th>
        {cols.map((c) => (
          <th class={cls(c.hidden, c.last)}>
            <div class="tend-group-col-head">
              {c.tags.length > 0 && (
                <div class="tend-event-col-tags">
                  {c.tags.map((t) => (
                    <span class={'tend-event-tag tend-event-tag--' + t.kind} title={t.title || undefined}>{t.label}</span>
                  ))}
                </div>
              )}
              <span class="tend-group-col-toggle">
                <EyeToggle hook="data-col-key" itemKey={c.key} hidden={c.hidden} what="columna" label={c.label} onClick={() => onToggleCol(c.key, !c.hidden)} />
                {c.label}
                {c.last && <span class="tend-tbl-last-tag"> · último</span>}
              </span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Body({ m, onToggleRow }) {
  return (
    <tbody>
      {m.rows.map((r) => [
        r.section !== null && (
          <tr class="tend-tbl-sec">
            <td colSpan={m.cols.length + 2}>{r.section}</td>
          </tr>
        ),
        <tr data-field={r.key} class={r.hidden ? 'is-hidden' : ''}>
          <td>
            <span class="tend-group-row-toggle">
              <EyeToggle hook="data-field-key" itemKey={r.key} hidden={r.hidden} what="fila" label={r.label} onClick={() => onToggleRow(r.key, !r.hidden)} />
              {r.label}
            </span>
          </td>
          <td class="tend-tbl-ref">{r.ref}</td>
          {r.cells.map((c) => (
            <td class={cls(c.hidden, c.last)}>
              <span class={'tend-val' + (c.dir ? (c.dir === '▲' ? ' tend-val--hi' : ' tend-val--lo') : '')}>{c.text}</span>
            </td>
          ))}
        </tr>,
      ])}
      {m.interp && (
        <tr class="tend-group-table-interp-row">
          <td><em>Interpretación</em></td>
          <td></td>
          {m.interp.map((c) => (
            <td class={c.hidden ? 'is-hidden' : ''} style="white-space:normal;text-align:left;font-size:12px;font-style:italic;">{c.text}</td>
          ))}
        </tr>
      )}
    </tbody>
  );
}

export function DayToggle({ byDay, onByDay }) {
  return (
    <label class="tend-group-daymode-toggle">
      <input type="checkbox" class="tend-tick" id="tend-group-daymode-input" checked={byDay} onChange={(ev) => onByDay(ev.currentTarget.checked)} /> Agrupar por día
    </label>
  );
}

function Legend({ n }) {
  return (
    <div class="tend-tbl-legend">
      <span><span class="tend-tbl-lg-hi">▲</span> por encima</span>
      <span><span class="tend-tbl-lg-lo">▼</span> por debajo</span>
      <span>{n + (n === 1 ? ' valor fuera de rango' : ' valores fuera de rango') + ' en la última toma'}</span>
    </div>
  );
}

/** `slotted`: the day toggle is drawn in its own slot elsewhere, not first in the wrap. */
export function GroupTable({ m, slotted, onToggleCol, onToggleRow, onByDay }) {
  return (
    <>
      {!slotted && <DayToggle byDay={m.byDay} onByDay={onByDay} />}
      {m.dynamicMode && <div id="tend-group-analyte-picker-slot"></div>}
      {m.empty ? (
        <div class="tend-table-empty">
          <strong>Aún no hay analitos</strong>
          <span>Marca analitos en la lista o usa «+ Agregar analito» para armar la tabla.</span>
        </div>
      ) : (
        <>
          <div class="cultivos-table-wrap">
            <table id="tend-group-table" class="cultivos-table tend-group-table">
              <Head cols={m.cols} onToggleCol={onToggleCol} />
              <Body m={m} onToggleRow={onToggleRow} />
            </table>
          </div>
          <Legend n={m.outCount} />
        </>
      )}
    </>
  );
}

export function HiddenBar({ m, onTrigger, onFilter, onShowAll, onRestore }) {
  return (
    <>
      <button type="button" class="tend-hidden-trigger" aria-expanded={m.open ? 'true' : 'false'} onClick={onTrigger}>
        <span class="rp-dot" aria-hidden="true"></span>
        {m.count + (m.count === 1 ? ' oculto' : ' ocultos') + ' en la copia'}
      </button>
      {m.open && (
        <div class="tend-hidden-panel">
          <div class="tend-hidden-panel-head">
            <span>Ocultos en la copia</span>
            <button type="button" class="tend-group-show-all-btn" onClick={onShowAll}>Mostrar todo</button>
          </div>
          {m.count > 8 && <input type="search" class="tend-hidden-filter" placeholder="Buscar" aria-label="Buscar entre los ocultos" onInput={onFilter} />}
          <div class="tend-hidden-list">
            {m.items.map((it) => {
              const hook = { ['data-restore-' + it.kind]: it.key };
              return (
                <div class="tend-hidden-row">
                  <span class="tend-hidden-row-name">{it.label}</span>
                  <button type="button" class="tend-hidden-row-btn" {...hook} aria-label={'Mostrar ' + it.label} onClick={(ev) => onRestore(ev, it.kind, it.key)}>Mostrar</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/** Drawn fresh each time (the filter box and its row styles are DOM state the old innerHTML swap reset). */
function drawFresh(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

export function drawDayToggle(slot, byDay, onByDay) {
  drawFresh(slot, <DayToggle byDay={byDay} onByDay={onByDay} />);
}

export function drawHiddenBar(bar, m, handlers) {
  drawFresh(bar, m ? <HiddenBar m={m} {...handlers} /> : null);
}

export function drawGroupTable(wrap, m, slotted, handlers) {
  const live = wrap._tendDrawn && wrap.contains(wrap._tendDrawn);
  if (!live) drawFresh(wrap, null);
  render(<GroupTable m={m} slotted={slotted} {...handlers} />, wrap);
  wrap._tendDrawn = wrap.querySelector('#tend-group-table, .tend-table-empty');
}
