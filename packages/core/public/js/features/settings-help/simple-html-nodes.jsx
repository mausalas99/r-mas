/**
 * Turns the small trusted HTML strings kept as copy (tour steps, help articles) into Preact nodes, so the
 * views draw them without an HTML string write. Only tags in TAGS are accepted; anything else throws, so
 * new copy can't slip raw markup through. Attributes keep their source order and values.
 */
import { h } from 'preact';

const TAGS = new Set(['p', 'ul', 'li', 'strong', 'em', 'h4', 'button']);
const TOKEN = /<(\/?)([a-z0-9]+)((?:\s+[a-z-]+=(?:"[^"]*"|'[^']*'))*)\s*>|([^<]+)/gi;
const ATTR = /([a-z-]+)=(?:"([^"]*)"|'([^']*)')/gi;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

const decode = (s) => s.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e) => ENTITIES[e]);

function readAttrs(src) {
  const props = {};
  for (const m of src.matchAll(ATTR)) props[m[1]] = decode(m[2] ?? m[3]);
  return props;
}

/** @param {string} html @returns {import('preact').ComponentChildren[]} */
export function htmlNodes(html) {
  const root = { children: [] };
  const stack = [root];
  for (const m of String(html).matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[4] !== undefined) { top.children.push(decode(m[4])); continue; }
    const tag = m[2].toLocaleLowerCase('es');
    if (!TAGS.has(tag)) throw new Error('htmlNodes: tag not allowed: ' + tag);
    if (m[1]) {
      if (stack.length < 2 || top.tag !== tag) throw new Error('htmlNodes: unbalanced </' + tag + '>');
      stack.pop();
      stack[stack.length - 1].children.push(h(top.tag, top.props, ...top.children));
    } else {
      stack.push({ tag, props: readAttrs(m[3] || ''), children: [] });
    }
  }
  if (stack.length !== 1) throw new Error('htmlNodes: unclosed <' + stack[stack.length - 1].tag + '>');
  return root.children;
}

/** Component form: `<HtmlNodes html="<p>…</p>" />`. */
export function HtmlNodes({ html }) {
  return htmlNodes(html);
}
