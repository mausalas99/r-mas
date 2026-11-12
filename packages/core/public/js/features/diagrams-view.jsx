/**
 * Lab diagram cards. Preact: same DOM the createElement/innerHTML code in diagrams-render.mjs made.
 * The SVG builders return trusted markup strings of svg/g/line/text only; `svgVnode` turns one into
 * vnodes so no HTML string is written into the page.
 */
import { h, render } from 'preact';

const TOKEN = /<(\/?)([a-zA-Z]+)((?:\s+[^\s=>/]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=]+)="([^"]*)"/g;
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Parse a well-formed svg/g/line/text string into one vnode. */
export function svgVnode(src) {
  const root = { kids: [] };
  const stack = [root];
  for (const m of src.matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { top.kids.push(unescape(m[5])); continue; }
    if (m[1]) { stack.pop(); continue; }
    const props = {};
    for (const a of m[3].matchAll(ATTR)) props[a[1]] = unescape(a[2]);
    const node = { tag: m[2], props, kids: [] };
    top.kids.push(node);
    if (!m[4]) stack.push(node);
  }
  const toV = (n) => (typeof n === 'string' ? n : h(n.tag, n.props, ...n.kids.map(toV)));
  return toV(root.kids[0]);
}

export function DiagramCard({ card, onCopy }) {
  return (
    <div class="dcard" style={`width: ${card.w}px;`}>
      <div class="dcard-title">{card.title}</div>
      {svgVnode(card.svg)}
      <button class="dcard-copy" onClick={onCopy}>Copiar</button>
    </div>
  );
}

/** Empty the grid; with cards, draw them. `onCopy(card, btn)` fires from each Copiar button. */
export function drawDiagramGrid(host, cards, onCopy) {
  render(null, host);
  host.textContent = '';
  if (!cards.length) return;
  render(<>{cards.map((c) => <DiagramCard card={c} onCopy={(e) => onCopy(c, e.currentTarget)} />)}</>, host);
}
