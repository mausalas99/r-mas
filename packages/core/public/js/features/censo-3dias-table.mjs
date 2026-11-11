/** Guardia census card body: "Labs 3 días" table (one row per lab, one column per patient). */
import { ensureParsedLabHistoryCached } from '../lab-history-maint.mjs';
import { resolveCensoMonitoreoSnapshot } from '../censo-signos-format.mjs';
import { buildCenso3dModel } from './censo-3dias-data.mjs';

const PAGE = 4;
const CSS = {
  wrap: 'background:var(--color-elevated,#fff);',
  scroll: 'overflow:auto;max-height:70vh;',
  table: 'border-collapse:collapse;width:100%;font-size:12px;',
  th: 'position:sticky;top:0;text-align:left;font-weight:600;color:var(--color-ink-muted);background:rgb(242,240,236);border-bottom:1px solid var(--color-ink);padding:6px 8px;vertical-align:bottom;line-height:1.3;',
  sub: 'display:block;font-size:11px;font-weight:400;color:var(--color-ink-muted);margin-top:2px;',
  td: 'padding:4px 8px;white-space:nowrap;line-height:1.35;',
  ref: 'color:var(--color-ink-muted);',
  sec: 'background:rgb(249,248,245);font-size:11px;font-weight:700;color:var(--color-ink-muted);letter-spacing:.04em;text-transform:uppercase;padding:4px 8px;',
  num: 'font-family:var(--font-mono);font-weight:600;font-variant-numeric:tabular-nums;',
  hi: 'color:var(--color-danger);font-weight:700;',
  pager: 'display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:8px;font-size:12px;color:var(--color-ink-muted);',
};

function el(tag, style, text, attrs) {
  const n = document.createElement(tag);
  if (style) n.style.cssText = style;
  if (text != null) n.textContent = text;
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function cellContent(td, cell) {
  const items = Array.isArray(cell) ? cell : [cell];
  if (!items.length) return void (td.textContent = '—');
  items.forEach((c, i) => {
    if (i) td.appendChild(document.createTextNode(' · '));
    td.appendChild(el('span', c.alt ? CSS.hi : '', c.text));
  });
}

function bedOf(p) {
  return [p.cuarto, p.cama].filter(Boolean).join(' · ') || String(p.bed_label || '—');
}

/** Replace the card body of `mount` with the 3-day table. `st` = { page }; `rerender` redraws after paging. */
export function draw3diasBody(mount, patients, st, rerender) {
  const body = mount.querySelector('.wb-table-body');
  if (!body) return;
  mount.querySelector('.wb-table-summary')?.remove();
  const chips = mount.querySelector('.wb-chips');
  if (chips) chips.style.display = 'none';
  const pages = Math.max(1, Math.ceil(patients.length / PAGE));
  st.page = Math.min(Math.max(0, st.page || 0), pages - 1);
  const slice = patients.slice(st.page * PAGE, st.page * PAGE + PAGE);
  const model = buildCenso3dModel(slice, {
    getHist: (id) => ensureParsedLabHistoryCached(id),
    getVitals: (p) => resolveCensoMonitoreoSnapshot(p).snapshot.vitals,
  });

  const table = el('table', CSS.table, null, { 'data-censo3d': '' });
  const head = el('tr');
  head.append(el('th', CSS.th, 'Prueba'), el('th', CSS.th, 'Ref.'));
  slice.forEach((p) => {
    const th = el('th', CSS.th, bedOf(p));
    const meta = [p.edad ? p.edad + ' a' : '', p.dx || p.diagnostico || ''].filter(Boolean).join(' · ');
    th.append(el('span', CSS.sub, [String(p.name || p.nombre || '—'), meta].filter(Boolean).join(' · ')));
    head.append(th);
  });
  table.appendChild(el('thead')).appendChild(head);
  const tb = table.appendChild(el('tbody'));
  const addRows = (rows) =>
    rows.forEach((r) => {
      const tr = tb.appendChild(el('tr'));
      tr.append(el('td', CSS.td, r.label + (r.unit ? ' (' + r.unit + ')' : '')), el('td', CSS.td + CSS.ref, r.ref));
      r.cells.forEach((c) => {
        const td = tr.appendChild(el('td', CSS.td + CSS.num));
        cellContent(td, c);
      });
    });
  addRows(model.labs);
  const sec = tb.appendChild(el('tr')).appendChild(el('td', CSS.sec, 'Signos vitales · hoy', { colspan: String(2 + slice.length) }));
  void sec;
  addRows(model.vitals);

  const wrap = el('div', CSS.wrap);
  const scroll = wrap.appendChild(el('div', CSS.scroll));
  scroll.appendChild(table);
  if (pages > 1) {
    const pager = el('div', CSS.pager);
    const prev = el('button', null, 'Anterior', { type: 'button', class: 'wb-btn wb-btn-secondary', id: 'censo3d-prev' });
    const next = el('button', null, 'Siguiente', { type: 'button', class: 'wb-btn wb-btn-secondary', id: 'censo3d-next' });
    prev.disabled = st.page === 0;
    next.disabled = st.page === pages - 1;
    prev.onclick = () => { st.page--; rerender(); };
    next.onclick = () => { st.page++; rerender(); };
    pager.append(prev, el('span', null, st.page + 1 + ' / ' + pages), next);
    wrap.appendChild(pager);
  }
  body.replaceChildren(wrap);
}
