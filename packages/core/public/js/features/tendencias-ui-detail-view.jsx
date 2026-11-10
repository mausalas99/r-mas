/**
 * Tendencias detail pane, text parts: status badge, big number, range line, readings list and the
 * "Comparar con" picker. Preact: same DOM and classes the string code in tendencias-ui-detail.mjs made.
 * They draw plain models (tendDetailHeaderModel); the data rules, the chart, and the click / change
 * handlers stay in the .mjs. Every draw unmounts first, so the DOM is rebuilt from scratch like the old
 * `innerHTML` swap (the readings click handler toggles a class and the button text on that DOM).
 */
import { render } from 'preact';

function Badge({ st }) {
  return <span class={'tend-status tend-status--' + st.kind}>{st.text}</span>;
}

function Hero({ h }) {
  const c = h.change;
  return (
    <>
      <span class={'tend-detail-big' + (h.out ? ' tend-abnormal' : '')}>{String(h.big)}</span>
      {h.unit && <span class="tend-detail-unit">{h.unit}</span>}
      {c && (
        <>
          <span class={'tend-detail-change tend-insight-delta--' + c.tone}>{c.arrow + ' ' + c.text + ' desde el ' + h.since}</span>
          {c.note && <span class="tend-detail-note">{c.note}</span>}
        </>
      )}
    </>
  );
}

function Range({ text }) {
  return text ? <>Rango de referencia <b>{text}</b></> : <>Sin rango de referencia</>;
}

function Readings({ rows }) {
  return (
    <>
      <div class="tend-rd-row tend-rd-head"><span>Fecha</span><span>Valor</span><span>Cambio</span></div>
      {rows.map((r, i) => (
        <div class={'tend-rd-row' + (i >= 4 ? ' tend-rd-extra' : '')}>
          <span>{r.label}</span>
          <span class="tend-rd-val">{String(r.value == null ? '—' : r.value)}</span>
          <span class={'tend-rd-chg tend-rd-chg--' + r.tone}>{r.change || '—'}</span>
        </div>
      ))}
      {rows.length > 4 && (
        <button type="button" class="tend-rd-more" data-tend-action="readings-all" aria-expanded="false">{'Ver todos (' + rows.length + ')'}</button>
      )}
    </>
  );
}

export function ComparePicker({ siblings, current }) {
  return (
    <>
      <span class="tend-detail-compare-label">Comparar con</span>
      <select class="tend-detail-compare-select" id="tend-detail-compare-select" aria-label="Comparar con otro analito">
        <option value="">Sin comparar</option>
        {siblings.map((k) => (
          <option value={k} selected={k === current}>{k}</option>
        ))}
      </select>
    </>
  );
}

export { Badge, Hero, Range, Readings };

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export function drawTendDetailHeader(hosts, m) {
  draw(hosts.badge, m.badge ? <Badge st={m.badge} /> : null);
  draw(hosts.hero, <Hero h={m.hero} />);
  draw(hosts.ref, <Range text={m.range} />);
  draw(hosts.readings, <Readings rows={m.readings} />);
}

export function drawTendDetailCompare(slot, siblings, current) {
  draw(slot, <ComparePicker siblings={siblings} current={current} />);
}
